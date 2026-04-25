<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('port_traffic', function (Blueprint $table) {
            $table->id();
            $table->foreignId('port_id')
                  ->constrained('ports', 'port_id')
                  ->cascadeOnDelete();

            $table->dateTime('timestamp');
            $table->unsignedBigInteger('in_octets')->default(0);
            $table->unsignedBigInteger('out_octets')->default(0);
            $table->unsignedBigInteger('in_rate')->nullable();   // bps masuk
            $table->unsignedBigInteger('out_rate')->nullable();  // bps keluar

            $table->unique(['port_id', 'timestamp']);
            $table->index('port_id');
            $table->index('timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('port_traffic');
    }
};