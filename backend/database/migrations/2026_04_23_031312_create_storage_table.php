<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage', function (Blueprint $table) {
            $table->id('storage_id');
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->string('type', 16);                          // disk / ram
            $table->string('storage_index', 64)->nullable();
            $table->text('storage_descr')->nullable();           // Label, misal: "/", "RAM"
            $table->bigInteger('storage_size')->nullable();      // Total kapasitas (bytes)
            $table->bigInteger('storage_used')->default(0);
            $table->bigInteger('storage_free')->default(0);
            $table->integer('storage_perc')->default(0);         // Persentase penggunaan (%)
            $table->integer('storage_perc_warn')->default(60);   // Threshold warning (%)

            $table->timestamps();

            $table->unique(['device_id', 'type', 'storage_index']);
            $table->index('device_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage');
    }
};