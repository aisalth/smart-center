<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processors', function (Blueprint $table) {
            $table->id('processor_id');
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->string('processor_index', 32);
            $table->string('processor_type', 16);             // ucd, hr, dll
            $table->string('processor_descr', 64)->default('CPU');
            $table->integer('processor_usage')->default(0);   // Persentase penggunaan (%)
            $table->integer('processor_perc_warn')->default(75); // Threshold warning (%)

            $table->timestamps();

            $table->index('device_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processors');
    }
};