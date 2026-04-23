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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('device_id');
            $table->unsignedBigInteger('rule_id');

            $table->integer('state');
            $table->integer('alerted');
            $table->integer('open');

            $table->text('note')->nullable();
            $table->timestamp('timestamp')->useCurrent();
            $table->text('info');

            $table->timestamps();

            $table->unique(['device_id','rule_id']);
            $table->index('device_id');
            $table->index('rule_id');
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
        Schema::dropIfExists('alerts');
    }
};
