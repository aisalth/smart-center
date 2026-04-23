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
        Schema::create('alerts_log', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('rule_id');
            $table->unsignedBigInteger('device_id');

            $table->integer('state');
            $table->binary('details')->nullable();

            $table->timestamp('time_logged')->useCurrent();

            $table->timestamps();

            $table->index('time_logged');
            $table->index(['rule_id','device_id','state']);
            $table->index(['device_id','rule_id','time_logged']);
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
        Schema::dropIfExists('alerts_log');
    }
};
