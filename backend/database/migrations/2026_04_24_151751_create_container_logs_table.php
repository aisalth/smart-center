<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Log event lifecycle container dari Docker Events API.
     * Bukan stdout/stderr container (terlalu besar & bukan urusan monitoring),
     * tapi event penting: start, stop, crash, OOM kill, restart, dll.
     *
     * Sumber data: GET /events?filters={"type":["container"]}
     */
    public function up(): void
    {
        Schema::create('container_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('container_id');         // FK ke docker_containers.id

            // Tipe event dari Docker Events API
            // start | stop | die | kill | oom | restart | pause | unpause | create | destroy
            $table->string('event_type', 50);

            // Severity untuk keperluan display & alert
            // info | warning | error | critical
            $table->string('level', 20)->default('info');

            $table->text('message')->nullable();                // deskripsi singkat event
            $table->json('attributes')->nullable();             // metadata dari Docker event (exitCode, signal, dll)

            $table->integer('exit_code')->nullable();           // diisi jika event 'die'

            $table->timestamp('event_time');                    // waktu event terjadi (dari Docker, bukan server kita)
            $table->timestamp('recorded_at')->useCurrent();     // waktu kita menyimpan record ini

            $table->foreign('container_id')
                  ->references('id')
                  ->on('docker_containers')
                  ->cascadeOnDelete();

            $table->index(['container_id', 'event_time']);
            $table->index('event_type');
            $table->index('level');
            $table->index('event_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_logs');
    }
};