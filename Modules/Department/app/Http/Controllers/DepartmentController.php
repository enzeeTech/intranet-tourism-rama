<?php

namespace Modules\Department\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Notifications\AssigningAdminDepartmentNotification;
use App\Notifications\DeletingFromDepartmentNotification;
use App\Notifications\DepartmentNotification;
use App\Notifications\RevokingAdminDepartmentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Modules\Department\Helpers\DepartmentPermissionsHelper;
use Modules\Department\Models\BusinessUnit;
use Modules\Department\Models\Department;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Department\Models\EmploymentPost;
use Modules\User\Models\User;
use Symfony\Component\Console\Output\ConsoleOutput;

class DepartmentController extends Controller
{
    public function index()
    {
        $limit = request()->get('perpage', 15);
        $query = Department::queryable()->paginate($limit);

        $user = Auth::user();

        if ($user !== null) {
            // attach is_member if the user either superadmin, or is member through employment post, or is admin
            $query->map(function ($item) use ($user) {
                $is_member = $item->employmentPosts()->where('user_id', Auth::id())->exists();
                $is_admin = $item->admins()->where('user_id', Auth::id())->exists();

                $is_superadmin = $user->hasRole('superadmin');

                if ($is_superadmin) {
                    $item['is_member'] = true;
                    $item['role'] = "superadmin";
                } else if ($is_admin) {
                    $item['is_member'] = true;
                    $item['role'] = "admin";
                } else if ($is_member) {
                    $item["is_member"] = true;
                    $item["role"] = "member";
                } else {
                    $item['is_member'] = false;
                }

                return $item;
            });
        }


        return response()->json([
            'data' => $query,
        ]);
    }

    public function show($id)
    {
        $data = Department::where('id', $id)->queryable()->firstOrFail();

        $is_member = $data->employmentPosts()->where('user_id', Auth::id())->exists();
        $is_admin = $data->admins()->where('user_id', Auth::id())->exists();

        $user = User::findOrFail(auth()->id());
        $is_superadmin = $user->hasRole('superadmin');

        if ($is_superadmin) {
            $data['is_member'] = true;
            $data['role'] = "superadmin";
        } else if ($is_admin) {
            $data['is_member'] = true;
            $data['role'] = "admin";
        } else if ($is_member) {
            $data["is_member"] = true;
            $data["role"] = "member";
        } else {
            $data['is_member'] = false;
        }

        return response()->json([
            'data' => $data
        ]);
    }

    public function store()
    {
        DB::beginTransaction();
        try {

            $validated = request()->validate(...Department::rules());
            $imagePath = null;
            if (request()->hasFile('banner')) {
                $imagePath = uploadFile(request()->file('banner'), null, 'banner')['path'];
            }

            Department::create(array_merge($validated, ['banner' => $imagePath]));

            DB::commit();
        } catch (\Throwable $th) {
            DB::rollBack();
            throw $th;
        }

        return response()->noContent();
    }

    public function update(Department $department)
    {
        DB::beginTransaction();
        try {

            $validated = request()->validate(...Department::rules('update'));


            $imagePath = $department->banner;
            if (request()->hasFile('banner')) {

                if ($imagePath) {
                    Storage::delete($imagePath);
                }

                $imagePath = uploadFile(request()->file('banner'), null, 'banner')['path'];
            }


            $department->update(array_merge($validated, ['banner' => $imagePath]));

            DB::commit();
        } catch (\Throwable $th) {
            DB::rollBack();
            throw $th;
        }

        return response()->noContent();
    }


    public function destroy(Department $department)
    {
        // Revoke permission from all admins
        $admins = $department->admins;

        foreach ($admins as $admin) {
            DepartmentPermissionsHelper::revokeDepartmentAdminPermissions($admin, $department);
        }

        // Remove all members and admins
        $department->admins()->detach();
        $department->employmentPosts()->delete();

        $relatedBusinessUnits = BusinessUnit::where('department_id', $department->id)->get();

        foreach ($relatedBusinessUnits as $businessUnit) {
            $businessUnit->delete();
        }

        // Finally, delete the department
        $department->delete();

        return response()->noContent();
    }



    public function getAdmins(Department $department)
    {
        $data = $department->admins;

        // merge with profile information
        $data->load('profile');

        // attach businessPost title
        $data->map(function ($item) use ($department) {
            $employmentPost = EmploymentPost::where('user_id', $item->id)->where('department_id', $department->id)->first();

            if ($employmentPost) {
                $item['employment_post_id'] = $employmentPost->id;
                $item['business_post_title'] = $employmentPost->businessPost->title;
            } else {
                $item['employment_post_id'] = null;
                $item['business_post_title'] = null;
            }
            return $item;
        });

        return response()->json([
            'data' => $data
        ]);
    }

    public function inviteDepartmentAdmin(Request $request)
    {
        $user = User::findOrFail(auth()->id());
        if (!DepartmentPermissionsHelper::checkSpecificPermission($user, 'add remove an admin from the same department', $request->department_id)) {
            abort(403, 'Unauthorized action.');
        }

        // Validate the request to ensure user and community are valid
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'department_id' => 'required|exists:departments,id',
        ]);

        // Fetch the user and the department
        $user = User::findOrFail($request->user_id);
        $department = Department::findOrFail($request->department_id);

        // check if the user is already an admin in other department
        $is_user_admin_in_any_other_department = Department::query()
            ->with('admins')
            ->whereHas('admins', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })->where('id', '!=', $department->id)->exists();

        if ($is_user_admin_in_any_other_department) {
            return response()->json([
                'message' => 'User is already an admin in another department.',
            ], 400);
        }

        // Assign the user the department-specific permissions
        DepartmentPermissionsHelper::assignDepartmentAdminPermissions($user, $department);

        try {
            $superusers = User::whereHas('roles', function ($query) {
                $query->where('name', 'superadmin');
            })->get();

            $currentUser = User::where('id', $user->id)->firstOrFail();


            $superusers->each(function ($superuser) use ($currentUser, $department) {
                if ($superuser->id !== $currentUser->id) {
                    $superuser->notify(new AssigningAdminDepartmentNotification($currentUser, $department->id, true));
                }
            });


            $currentUser->notify(new AssigningAdminDepartmentNotification($user, $department->id, false));



        } catch (\Throwable $th) {
            $output = new ConsoleOutput();
            $output->writeln($th->getMessage());
        }


        return response()->json([
            'message' => 'User has been successfully invited as a department admin.',
        ]);
    }


    // revoke department admin
    public function revokeDepartmentAdmin(Request $request)
    {
        $user = User::findOrFail(auth()->id());

        if (!DepartmentPermissionsHelper::checkSpecificPermission($user, 'add remove an admin from the same department', $request->department_id)) {
            abort(403, 'Unauthorized action.');
        }

        // Validate the request to ensure user and department are valid
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'department_id' => 'required|exists:departments,id',
        ]);

        // Fetch the user and the department
        $user = User::findOrFail($request->user_id);
        $department = Department::findOrFail($request->department_id);

        // Revoke the user's department-specific permissions
        DepartmentPermissionsHelper::revokeDepartmentAdminPermissions($user, $department);

        if (request()->has('remove')) {
            $employmentPost = EmploymentPost::where('user_id', $user->id)->where('department_id', $department->id)->first();
            if ($employmentPost) {
                $employmentPost->delete();
            }
        }

        try {
            $superusers = User::whereHas('roles', function ($query) {
                $query->where('name', 'superadmin');
            })->get();


            $currentUser = User::where('id', $user->id)->firstOrFail();


            $superusers->each(function ($superuser) use ($currentUser, $department) {
                if ($superuser->id !== $currentUser->id) {
                    $superuser->notify(new RevokingAdminDepartmentNotification($currentUser, $department->id, true));
                }
            });


            $currentUser->notify(new RevokingAdminDepartmentNotification($user, $department->id, false));

        } catch (\Throwable $th) {}



        return response()->json([
            'message' => 'User has been successfully revoked as a department admin.',
        ]);

    }
}
