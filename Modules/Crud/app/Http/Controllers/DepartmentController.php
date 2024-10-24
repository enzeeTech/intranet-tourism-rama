<?php

namespace Modules\Crud\Http\Controllers;

use App\Http\Controllers\Controller;
use Modules\Crud\Models\Department;

class DepartmentController extends Controller
{
    public function index()
    {
        $queryParams = request()->query();
        $limit = request()->query('perpage', 15);

        $department = Department::queryable()->paginate($limit);

        $department->appends($queryParams);

        return response()->json([
            'data' => $department,
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'data' => Department::where('id', $id)->queryable()->firstOrFail(),
        ]);
    }

    public function store()
    {
        $validated = request()->validate(...Department::rules());
        Department::create($validated);

        return response()->noContent();
    }

    public function update(Department $department)
    {
        $validated = request()->validate(...Department::rules('update'));
        $department->update($validated);

        return response()->noContent();
    }

    public function destroy(Department $department)
    {
        $department->delete();

        return response()->noContent();
    }
}
