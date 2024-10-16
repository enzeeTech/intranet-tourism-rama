<?php

namespace Modules\Permission\Http\Controllers;

use App\Http\Controllers\Controller;
use Modules\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Permission::queryable()->paginate(),
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'data' => Permission::where('id', $id)->queryable()->firstOrFail(),
        ]);
    }

    public function store()
    {
        $validated = request()->validate(...Permission::rules());
        Permission::create($validated);

        return response()->noContent();
    }

    public function update(Permission $permission)
    {
        $validated = request()->validate(...Permission::rules('update'));
        $permission->update($validated);

        return response()->noContent();
    }

    public function destroy(Permission $permission)
    {
        $permission->delete();

        return response()->noContent();
    }
}
