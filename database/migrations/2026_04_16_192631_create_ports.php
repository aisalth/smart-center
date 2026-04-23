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
        Schema::create('ports', function (Blueprint $table) {
            $table->id('port_id');
            $table->unsignedBigInteger('device_id');

            $table->integer('ifIndex');
            $table->string('ifName', 100)->nullable();
            $table->string('ifDescr', 255)->nullable();
            $table->string('ifType', 50)->nullable();
            $table->bigInteger('ifSpeed')->nullable();

            $table->string('ifAdminStatus', 10)->nullable();
            $table->string('ifOperStatus', 10)->nullable();

            $table->timestamps();

            $table->unique(['device_id', 'ifIndex']);
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
        Schema::dropIfExists('ports');
    }
};
