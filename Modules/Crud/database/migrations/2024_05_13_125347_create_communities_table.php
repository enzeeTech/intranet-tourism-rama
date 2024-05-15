<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('communities', function (Blueprint $table) {

            $table->id();
            $table->string('name');
            $table->string('banner')->nullable();
            $table->string('description')->nullable();
            $table->string('type')->default('public')->comment('public, private')->index();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('communities');
    }
};
