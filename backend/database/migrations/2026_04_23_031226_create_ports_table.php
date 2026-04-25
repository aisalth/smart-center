<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ports', function (Blueprint $table) {
            $table->id('port_id');
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->integer('ifIndex');
            $table->string('ifName', 100)->nullable();
            $table->string('ifDescr', 255)->nullable();
            $table->string('ifType', 50)->nullable();
            $table->bigInteger('ifSpeed')->nullable();          // Bandwidth maks (bps)
            $table->string('ifAdminStatus', 10)->nullable();   // up/down (konfigurasi)
            $table->string('ifOperStatus', 10)->nullable();    // up/down (aktual)

            $table->timestamps();

            $table->unique(['device_id', 'ifIndex']);
            $table->index('device_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ports');
    }
};