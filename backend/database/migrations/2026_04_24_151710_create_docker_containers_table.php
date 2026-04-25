<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Daftar container Docker yang ditemukan saat polling.
     *
     * container_docker_id  : ID container dari Docker engine (64 char hex)
     * name                 : nama container, e.g. "/nginx-proxy"
     * status               : status dari Docker API (running, exited, paused, dll)
     */
    public function up(): void
    {
        Schema::create('docker_containers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('docker_host_id');

            // Identitas dari Docker engine
            $table->string('container_docker_id', 64);          // Docker container ID
            $table->string('name', 255);                        // nama container
            $table->string('image', 255);                       // e.g. "nginx:alpine"
            $table->string('image_id', 128)->nullable();        // image SHA digest

            // Status container dari Docker API
            // created | running | paused | restarting | exited | dead
            $table->string('status', 32)->default('unknown');
            $table->string('state', 32)->default('unknown');    // raw state string dari Docker
            $table->integer('exit_code')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();

            // Konfigurasi container
            $table->json('ports')->nullable();                  // port mapping [{host, container, protocol}]
            $table->json('labels')->nullable();                 // Docker labels
            $table->json('networks')->nullable();               // network yang dipakai
            $table->string('restart_policy', 32)->nullable();   // e.g. "always", "unless-stopped"

            $table->timestamp('created_at_docker')->nullable(); // waktu container dibuat di Docker

            // Monitoring
            $table->tinyInteger('ignore')->default(0);          // abaikan dari alert
            $table->timestamp('last_polled')->nullable();
            $table->timestamps();

            $table->foreign('docker_host_id')
                  ->references('docker_host_id')
                  ->on('docker_hosts')
                  ->cascadeOnDelete();

            $table->unique(['docker_host_id', 'container_docker_id']);
            $table->index('status');
            $table->index('docker_host_id');
            $table->index('last_polled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docker_containers');
    }
};