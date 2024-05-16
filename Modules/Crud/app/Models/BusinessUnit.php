<?php

namespace Modules\Crud\Models;

use App\Models\Traits\Authorizable;
use App\Models\Traits\QueryableApi;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessUnit extends Model
{
    use Authorizable, HasFactory, QueryableApi;

    protected $table = 'business_units';

    protected $fillable = ['id',
        'name',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'deleted_at',
        'deleted_by',
    ];

    public static function rules($scenario = 'create')
    {
        $rules = [
            'create' => [
                [
                    'name' => ['string'],
                ],
                // [],
            ],
            'update' => [
                [
                    'name' => ['string'],
                ],
                // [],
            ],
        ];

        return $rules[$scenario];
    }
}
