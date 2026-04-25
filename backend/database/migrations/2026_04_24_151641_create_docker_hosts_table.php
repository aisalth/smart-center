<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Konfigurasi koneksi ke Docker daemon per device.
     * Satu device (server) bisa memiliki satu Docker host.
     *
     * Cara koneksi:
     *   - 'socket' : terhubung lewat SSH ke server lalu akses unix socket
     *   - 'tcp'    : Docker daemon expose port 2375 (HTTP) atau 2376 (TLS)
     */
    public function up(): void
    {
        Schema::create('docker_hosts', function (Blueprint $table) {
            $table->id('docker_host_id');

            // FK ke devices — server tempat Docker daemon berjalan
            $table->unsignedBigInteger('device_id');

            $table->string('name', 128);                        // label, e.g. "prod-docker"

            $table->enum('connection_type', ['socket', 'tcp'])->default('socket');
            $table->string('socket_path', 255)->default('/var/run/docker.sock');
            $table->string('tcp_host', 128)->nullable();        // IP/hostname jika pakai TCP
            $table->integer('tcp_port')->default(2375);
            $table->tinyInteger('tls_enabled')->default(0);

            // Info Docker engine (diisi saat polling berhasil)
            $table->string('docker_version', 32)->nullable();
            $table->string('api_version', 16)->nullable();

            // Status koneksi: 0=unknown, 1=connected, 2=error
            $table->tinyInteger('status')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('last_connected')->nullable();

            $table->tinyInteger('disabled')->default(0);
            $table->timestamps();

            $table->foreign('device_id')
                  ->references('device_id')
                  ->on('devices')
                  ->cascadeOnDelete();

            $table->index('device_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docker_hosts');
    }
};