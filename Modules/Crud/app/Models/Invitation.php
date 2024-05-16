<?php

namespace Modules\Crud\Models;

use App\Models\Traits\Authorizable;
use App\Models\Traits\QueryableApi;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    use Authorizable, HasFactory, QueryableApi;

    protected $table = 'invitations';

    protected $fillable = ['id',
        'user_id',
        'invitable_type',
        'invitable_id',
        'status',
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
                    'user_id' => ['string', 'required'],
                    'invitable_type' => ['string', 'required'],
                    'invitable_id' => ['string', 'required'],
                    'status' => ['string', 'required'],
                ],
                // [],
            ],
            'update' => [
                [
                    'user_id' => ['string', 'required'],
                    'invitable_type' => ['string', 'required'],
                    'invitable_id' => ['string', 'required'],
                    'status' => ['string', 'required'],
                ],
                // [],
            ],
        ];

        return $rules[$scenario];
    }
}
