<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id('device_id');
            $table->timestamp('inserted')->useCurrent();

            // Identitas perangkat
            $table->string('hostname', 128);
            $table->string('sysName', 128)->nullable();
            $table->string('display', 128)->nullable();   // Nama tampilan di dashboard
            $table->string('ip', 40)->nullable();
            $table->string('os', 32)->nullable();
            $table->string('type', 20)->default('');      // router, switch, server, dll
            $table->text('hardware')->nullable();
            $table->text('version')->nullable();
            $table->text('sysDescr')->nullable();

            // Konfigurasi SNMP
            $table->string('community', 255)->nullable();
            $table->string('snmpver', 4)->default('v2c');
            $table->unsignedSmallInteger('port')->default(161);
            $table->string('transport', 16)->default('udp');
            $table->boolean('snmp_disable')->default(false);

            // Status & health
            $table->boolean('status')->default(false);   // true=up, false=down
            $table->string('status_reason', 50)->default('');
            $table->unsignedBigInteger('uptime')->nullable();
            $table->timestamp('last_polled')->nullable();
            $table->timestamp('last_ping')->nullable();
            $table->double('last_ping_timetaken')->nullable();

            // Kontrol
            $table->boolean('ignore')->default(false);
            $table->boolean('disabled')->default(false);
            $table->boolean('disable_notify')->default(false);

            $table->timestamps();

            // Indexes
            $table->index('hostname');
            $table->index('status');
            $table->index('last_polled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};