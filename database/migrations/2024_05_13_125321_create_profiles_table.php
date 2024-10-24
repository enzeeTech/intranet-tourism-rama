<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->text('bio')->nullable();
            $table->string('image')->nullable();
            $table->string('cover_photo')->nullable();
            $table->string('phone_no')->nullable();
            $table->date('dob')->nullable();
            $table->auditable();
        });

        Schema::create('invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users');
            $table->morphs('invitable');
            $table->string('status')->nullable()->default('PENDING')->comment('PENDING, APRROVED');
            $table->auditable();
        });

    }

    public function down()
    {
        Schema::dropIfExists('profiles');
    }
};
