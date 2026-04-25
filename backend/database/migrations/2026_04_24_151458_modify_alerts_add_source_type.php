<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom source_type & source_id di tabel alerts & alerts_log
     * agar alert bisa berasal dari SNMP device MAUPUN Docker container.
     *
     * source_type : 'snmp' | 'docker'
     * source_id   : device_id (jika snmp) atau docker_containers.id (jika docker)
     * device_id   : dijadikan nullable karena alert Docker tidak punya device_id
     */
    public function up(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            // Drop unique constraint lama dulu karena akan berubah logikanya
            $table->dropForeign('alerts_device_id_foreign');
            $table->dropUnique('alerts_device_id_rule_id_unique');

            $table->string('source_type', 20)->default('snmp')->after('id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->unsignedBigInteger('device_id')->nullable()->change();
        });

        Schema::table('alerts_log', function (Blueprint $table) {
            $table->dropForeign('alerts_log_device_id_foreign');

            $table->string('source_type', 20)->default('snmp')->after('id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->unsignedBigInteger('device_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'source_id']);
            $table->unsignedBigInteger('device_id')->nullable(false)->change();
            $table->foreign('device_id')->references('device_id')->on('devices')->cascadeOnDelete();
            $table->unique(['device_id', 'rule_id']);
        });

        Schema::table('alerts_log', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'source_id']);
            $table->unsignedBigInteger('device_id')->nullable(false)->change();
            $table->foreign('device_id')->references('device_id')->on('devices')->cascadeOnDelete();
        });
    }
};