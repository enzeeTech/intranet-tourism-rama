<?php

namespace Modules\Profile\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\View\View;
use Modules\Profile\Http\Requests\ProfileUpdateRequest;
use Modules\Profile\Models\Profile;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */


    public function index()
    {
        return response()->json([
            'data' => Profile::queryable()->paginate(),
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'data' => Profile::where('id', $id)->queryable()->firstOrFail(),
        ]);
    }

    public function store()
    {
        $validated = request()->validate(...Profile::rules());
        Profile::create($validated);

        return response()->noContent();
    }

    public function edit(Request $request): View
    {
        return view('profile::edit', [
            'user' => $request->user(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function updateUser(ProfileUpdateRequest $request)
    {

        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();
        return response()->noContent();

        // return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    // public function update(Profile $profile)
    // {
    //     $validated = request()->validate(...Profile::rules('update'));
    //     $resourceRef = uploadFile(request()->file('image'), null, 'avatar');

    //     $profile->update(array_merge($validated, ['image' => $resourceRef['path']]));

    //     return response()->noContent();
    // }

    public function update(Profile $profile)
    {
        DB::beginTransaction();
        try {
            $validated = request()->validate(...Profile::rules('update'));
            $validatedUser = request()->validate(...User::rules('update'));

            $imagePath = $profile->image;
            if (request()->hasFile('image')) {
                $imagePath = uploadFile(request()->file('image'), null, 'avatar')['path'];
            }

            $coverPhotoPath = $profile->cover_photo;
            if (request()->hasFile('cover_photo')) {
                $coverPhotoPath = uploadFile(request()->file('cover_photo'), null, 'cover_photo')['path'];
            }

            $profile->update(array_merge($validated, [
                'image' => $imagePath,
                'cover_photo' => $coverPhotoPath,
            ]));

            $profile->user()->update($validatedUser);
            DB::commit();
        } catch (\Throwable $th) {
            DB::rollBack();
            throw $th;
        }

        return response()->noContent();
    }

    /**
     * Delete the user's account.
     */
    public function deleteAccount(Request $request): RedirectResponse
    {
        $request->validateWithBag('userDeletion', [
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function destroy(Profile $profile)
    {
        $profile->delete();
        return response()->noContent();
    }
}
