<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Time-series resource usage per container.
     * Data diambil dari Docker Stats API: GET /containers/{id}/stats?stream=false
     *
     * Mirip seperti port_traffic untuk SNMP — tabel ini adalah
     * padanannya untuk Docker container.
     */
    public function up(): void
    {
        Schema::create('container_metrics', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('container_id');         // FK ke docker_containers.id
            $table->timestamp('timestamp');

            // CPU
            // Docker memberikan cpu_delta & system_cpu_delta, kita hitung persennya sendiri
            $table->float('cpu_usage_percent')->nullable();     // 0-100 (per core, bisa >100 jika multi-core)
            $table->integer('num_cpus')->nullable();            // jumlah CPU yang dialokasikan

            // Memory (bytes)
            $table->unsignedBigInteger('mem_usage')->nullable();        // memory terpakai
            $table->unsignedBigInteger('mem_limit')->nullable();        // batas memory container
            $table->float('mem_usage_percent')->nullable();             // (mem_usage / mem_limit) * 100
            $table->unsignedBigInteger('mem_cache')->nullable();        // page cache

            // Network I/O — total semua interface (bytes, akumulatif sejak container start)
            $table->unsignedBigInteger('net_rx_bytes')->nullable();     // bytes diterima
            $table->unsignedBigInteger('net_tx_bytes')->nullable();     // bytes dikirim

            // Block I/O (bytes, akumulatif)
            $table->unsignedBigInteger('blk_read_bytes')->nullable();
            $table->unsignedBigInteger('blk_write_bytes')->nullable();

            // Jumlah proses/thread di dalam container
            $table->integer('pids')->nullable();

            $table->foreign('container_id')
                  ->references('id')
                  ->on('docker_containers')
                  ->cascadeOnDelete();

            $table->unique(['container_id', 'timestamp']);
            $table->index('container_id');
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_metrics');
    }
};