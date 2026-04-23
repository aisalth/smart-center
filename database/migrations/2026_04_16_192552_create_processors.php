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
        Schema::create('processors', function (Blueprint $table) {
            $table->id('processor_id');

            $table->integer('entPhysicalIndex')->default(0);
            $table->integer('hrDeviceIndex')->nullable();

            $table->unsignedBigInteger('device_id');

            $table->string('processor_oid', 128);
            $table->string('processor_index', 32);
            $table->string('processor_type', 16);

            $table->integer('processor_usage');
            $table->string('processor_descr', 64);

            $table->integer('processor_precision')->default(1);
            $table->integer('processor_perc_warn')->default(75);

            $table->timestamps();

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
        Schema::dropIfExists('processors');
    }
};
