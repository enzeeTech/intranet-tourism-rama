<?php

namespace App\Http\Controllers;

use App\Events\NewMessageEvent;
use App\Models\Request;
use App\Notifications\CreateCommunityRequestNotification;
use App\Notifications\GroupJoinRequestNotification;
use App\Notifications\PhotoChangeRequestNotification;
use Illuminate\Http\Request as HttpRequest;
use Modules\Communities\Helpers\CommunityPermissionsHelper;
use Modules\Communities\Models\Community;
use Modules\Communities\Models\CommunityMember;
use Modules\Profile\Models\Profile;
use Modules\User\Models\User;
use Symfony\Component\Console\Output\ConsoleOutput;

class RequestController extends Controller
{

    // Group join requests

    public function getGroupJoinRequests()
    {
        $groupJoinRequests = Request::queryable()
            ->where('request_type', 'join_group')
            ->paginate();

        // attach community details to each request
        $groupJoinRequests->getCollection()->transform(function ($request) {
            $details = $request->details;
            $request->group = Community::find($details['group_id']);
            $request->user = User::find($request->user_id);
            $request->userProfile = $request->user->profile;
            if ($request->user->employmentPost) {
                $request->userDepartment = $request->user->employmentPost->department->name;
            }
            $request->groupFollowersCount = $request->group->members()->count();
            return $request;
        });

        // paginate requests
        return response()->json([
            'data' => $groupJoinRequests,
        ]);
    }

    // Create a new request and notify the superuser
    public function createJoinGroupRequest(HttpRequest $request)
    {
        $request->validate([
            'group_id' => 'required|exists:communities,id',
        ]);
        $groupId = $request->group_id;

        // find all superadmins
        $superusers = User::whereHas('roles', function ($query) {
            $query->where('name', 'superadmin');
        });

        // Create the request
        $newRequest = Request::create([
            'user_id' => auth()->id(),
            'request_type' => 'join_group',
            'details' => ['group_id' => $groupId],
            'status' => 'pending',
        ]);

        // Notify all superusers with a reference to the request
        $superusers->get()->each(function ($superuser) use ($newRequest) {
            $superuser->notify(new GroupJoinRequestNotification($newRequest));
        });

        // $event = new NewMessageEvent($superuser, 'New request to join a group.');
        // broadcast($event)->via('reverb');

        return response()->json(['status' => 'request_sent']);
    }

    public function approveGroupJoinRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'approved';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();

        // Add the user to the group
        $details = $requestToUpdate->details;
        $groupId = $details['group_id'];
        $group = Community::find($groupId);
        $group->members()->attach($requestToUpdate->user_id, ['role' => 'member']);

        $user = User::find($requestToUpdate->user_id);
        $user->notify(new GroupJoinRequestNotification($requestToUpdate));


        return response()->json(['status' => $requestToUpdate->status]);
    }

    public function rejectGroupJoinRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'rejected';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();


        $user = User::find($requestToUpdate->user_id);
        $user->notify(new GroupJoinRequestNotification($requestToUpdate));

        return response()->json(['status' => $requestToUpdate->status]);
    }


    // Change staff image request
    public function getChangeStaffImageRequests()
    {
        $changeStaffImageRequests = Request::queryable()
            ->where('request_type', 'change_staff_image')
            ->paginate();

        // attach community details to each request
        $changeStaffImageRequests->getCollection()->transform(function ($request) {
            $details = $request->details;
            $request->new_photo = $details['new_photo'];
            $request->user = User::find($request->user_id);
            $request->userProfile = $request->user->profile;
            if ($request->user->employmentPost) {
                $request->userDepartment = $request->user->employmentPost->department->name;
            }
            return $request;
        });

        // paginate requests
        return response()->json([
            'data' => $changeStaffImageRequests,
        ]);
    }

    public function createChangeStaffImageRequest(HttpRequest $request)
    {
        // $request->validate([
        //     'group_id' => 'required|exists:communities,id',
        // ]);
        $staffImagePath = uploadFile(request()->file('staff_image'), null, 'staff_image')['path'];

        $newPhoto = $staffImagePath;

        // find all superadmins
        $superusers = User::whereHas('roles', function ($query) {
            $query->where('name', 'superadmin');
        });

        // Create the request
        $newRequest = Request::create([
            'user_id' => auth()->id(),
            'request_type' => 'change_staff_image',
            'details' => ['new_photo' => $newPhoto],
            'status' => 'pending',
        ]);

        // Notify all superusers with a reference to the request
        $superusers->get()->each(function ($superuser) use ($newRequest) {
            $superuser->notify(new PhotoChangeRequestNotification($newRequest));
        });

        return response()->json(['status' => 'request_sent']);
    }


    public function approveChangeStaffImageRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'approved';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();

        // Add the user to the group
        $details = $requestToUpdate->details;
        $newPhoto = $details['new_photo'];
        $user = User::find($requestToUpdate->user_id);
        $profile = Profile::where('user_id', $user->id)->first();
        $profile->update(['staff_image' => $newPhoto]);

        $user->notify(new PhotoChangeRequestNotification($requestToUpdate));

        return response()->json(['status' => $requestToUpdate->status]);
    }

    public function rejectChangeStaffImageRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'rejected';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();

        $user = User::find($requestToUpdate->user_id);
        $user->notify(new PhotoChangeRequestNotification($requestToUpdate));

        return response()->json(['status' => $requestToUpdate->status]);
    }

    // Community create request
    public function getCommunityCreateRequests()
    {
        $communityCreateRequests = Request::queryable()
            ->where('request_type', 'create_community')
            ->paginate();

        // attach community details to each request
        $communityCreateRequests->getCollection()->transform(function ($request) {
            $details = $request->details;
            $request->group = [
                'name' => $details['name'],
                'description' => $details['description'],
                'banner' => $details['banner'],
                'banner_original' => $details['banner_original'],
            ];
            $request->user = User::find($request->user_id);
            $request->userProfile = $request->user->profile;
            if ($request->user->employmentPost) {
                $request->userDepartment = $request->user->employmentPost->department->name;
            }
            return $request;
        });

        // paginate requests
        return response()->json([
            'data' => $communityCreateRequests,
        ]);
    }

    // Create a new request and notify the superuser
    public function createCommunityCreateRequest(HttpRequest $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'string',
            'banner' => 'string',
            'banner_original' => 'string',
            'type' => 'required|string',
        ]);

        $name = $request->name;
        $description = $request->description;
        $banner = $request->banner;
        $banner_original = $request->banner_original;
        $type = $request->type;

        // Create the request
        $newRequest = Request::create([
            'user_id' => auth()->id(),
            'request_type' => 'create_community',
            'details' => [
                'name' => $name,
                'description' => $description,
                'banner' => $banner,
                'banner_original' => $banner_original,
                'type' => $type,
            ],
            'status' => 'pending',
        ]);

        // find all superadmins
        $superusers = User::whereHas('roles', function ($query) {
            $query->where('name', 'superadmin');
        });

        // Notify all superusers with a reference to the request
        $superusers->get()->each(callback: function ($superuser) use ($newRequest) {
            $superuser->notify(new CreateCommunityRequestNotification($newRequest));
        });

        return response()->json(['status' => 'request_sent']);
    }

    public function approveCommunityCreateRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'approved';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();

        // Create the community
        $details = $requestToUpdate->details;
        $new_community = Community::create([
            'name' => $details['name'],
            'description' => $details['description'],
            'banner' => $details['banner'],
            'banner_original' => $details['banner_original'],
            'type' => $details['type'],
            'created_by' => $requestToUpdate->user_id,
        ]);

        CommunityMember::create([
            'user_id' => $requestToUpdate->user_id,
            'community_id' => $new_community->id,
            'role' => 'admin',
        ]);

        $user = User::findOrFail($requestToUpdate->user_id);

        CommunityPermissionsHelper::assignCommunityAdminPermissions($user, $new_community);

        $user = User::find($requestToUpdate->user_id);
        $user->notify(new CreateCommunityRequestNotification($requestToUpdate));

        return response()->json(['status' => $requestToUpdate->status, 'community' => $new_community]);
    }

    public function rejectCommunityCreateRequest(HttpRequest $request)
    {
        $request->validate([
            'request_id' => 'required|exists:requests,id',
        ]);

        $requestId = $request->request_id;

        $requestToUpdate = Request::findOrFail($requestId);
        $requestToUpdate->status = 'rejected';
        $requestToUpdate->action_at = now();
        $requestToUpdate->save();

        $user = User::find($requestToUpdate->user_id);
        $user->notify(new CreateCommunityRequestNotification($requestToUpdate));

        return response()->json(['status' => $requestToUpdate->status]);
    }

}
