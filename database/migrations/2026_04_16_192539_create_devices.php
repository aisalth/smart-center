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
        Schema::create('devices', function (Blueprint $table) {
            $table->id('device_id');

            $table->timestamp('inserted')->nullable()->useCurrent();

            $table->string('hostname', 128);
            $table->string('sysName', 128)->nullable();
            $table->string('display', 128)->nullable();

            $table->binary('ip')->nullable();
            $table->string('overwrite_ip', 40)->nullable();

            $table->string('community', 255)->nullable();

            $table->enum('authlevel', ['noAuthNoPriv','authNoPriv','authPriv'])->nullable();
            $table->string('authname', 64)->nullable();
            $table->string('authpass', 64)->nullable();
            $table->string('authalgo', 10)->nullable();
            $table->string('cryptopass', 64)->nullable();
            $table->string('cryptoalgo', 10)->nullable();

            $table->string('snmpver', 4)->default('v2c');
            $table->unsignedSmallInteger('port')->default(161);
            $table->string('transport', 16)->default('udp');

            $table->integer('timeout')->nullable();
            $table->integer('retries')->nullable();

            $table->boolean('snmp_disable')->default(false);

            $table->unsignedInteger('bgpLocalAs')->nullable();

            $table->string('sysObjectID', 128)->nullable();
            $table->text('sysDescr')->nullable();
            $table->text('sysContact')->nullable();

            $table->text('version')->nullable();
            $table->text('hardware')->nullable();
            $table->text('features')->nullable();

            $table->unsignedBigInteger('location_id')->nullable();

            $table->string('os', 32)->nullable();

            $table->boolean('status')->default(false);
            $table->string('status_reason', 50);

            $table->boolean('ignore')->default(false);
            $table->boolean('disabled')->default(false);

            $table->bigInteger('uptime')->nullable();
            $table->unsignedInteger('agent_uptime')->default(0);

            $table->timestamp('last_polled')->nullable();
            $table->timestamp('last_poll_attempted')->nullable();
            $table->double('last_polled_timetaken')->nullable();
            $table->double('last_discovered_timetaken')->nullable();
            $table->timestamp('last_discovered')->nullable();

            $table->timestamp('last_ping')->nullable();
            $table->double('last_ping_timetaken')->nullable();

            $table->text('purpose')->nullable();
            $table->string('type', 20)->default('');

            $table->text('serial')->nullable();
            $table->string('icon')->nullable();

            $table->integer('poller_group')->default(0);

            $table->boolean('override_sysLocation')->default(false);

            $table->text('notes')->nullable();

            $table->integer('port_association_mode')->default(1);
            $table->integer('max_depth')->default(0);

            $table->boolean('disable_notify')->default(false);
            $table->boolean('ignore_status')->default(false);

            $table->timestamps();

            $table->index('sysName');
            $table->index('os');
            $table->index('status');
            $table->index('last_polled');
            $table->index('last_poll_attempted');
            $table->index(['hostname','sysName','display']);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
