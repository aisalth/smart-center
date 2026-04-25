<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel rule untuk alert - berlaku untuk semua jenis monitoring
     * (SNMP device, Docker container, maupun Server).
     *
     * Contoh rule:
     *  - SNMP  : cpu > 90% selama 5 menit di device_id=1
     *  - Docker: container status = 'exited' di docker_host_id=1
     *  - Server: mem_usage_percent > 85% di server_id=2
     */
    public function up(): void
    {
        Schema::create('alert_rules', function (Blueprint $table) {
            $table->id('rule_id');

            $table->string('name', 128);
            $table->text('description')->nullable();

            // Jenis sumber monitoring: 'snmp' | 'docker' | 'server'
            $table->string('source_type', 20)->default('snmp');

            // Metric yang dipantau, e.g. 'cpu_usage', 'mem_usage_percent', 'container_status'
            $table->string('metric', 64);

            // Operator kondisi: '>' | '>=' | '<' | '<=' | '==' | '!='
            $table->string('operator', 5);

            // Nilai threshold
            $table->string('threshold_value', 64);

            // Durasi kondisi harus terpenuhi sebelum alert trigger (dalam detik)
            $table->integer('duration')->default(0);

            // Level severity: 0=ok, 1=warning, 2=critical
            $table->tinyInteger('severity')->default(1);

            $table->tinyInteger('enabled')->default(1);
            $table->timestamps();

            $table->index('source_type');
            $table->index('enabled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_rules');
    }
};