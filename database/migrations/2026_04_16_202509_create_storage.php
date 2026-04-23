<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('storage', function (Blueprint $table) {
            $table->id('storage_id');
            $table->unsignedBigInteger('device_id');

            $table->string('type', 16);
            $table->string('storage_index', 64)->nullable();
            $table->string('storage_type', 32)->nullable();
            $table->text('storage_descr')->nullable();

            $table->bigInteger('storage_size')->nullable();
            $table->string('storage_size_oid')->nullable();

            $table->integer('storage_units')->nullable();

            $table->bigInteger('storage_used')->default(0);
            $table->string('storage_used_oid')->nullable();

            $table->bigInteger('storage_free')->default(0);
            $table->string('storage_free_oid')->nullable();

            $table->integer('storage_perc')->default(0);
            $table->string('storage_perc_oid')->nullable();

            $table->integer('storage_perc_warn')->default(60);

            $table->timestamps();

            $table->unique(['device_id','type','storage_index']);
            $table->index('device_id');
            $table->foreign('device_id')
        ->references('device_id')
        ->on('devices')
        ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storage');
    }
};
