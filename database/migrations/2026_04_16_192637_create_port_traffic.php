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
        Schema::create('port_traffic', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('port_id');

            $table->dateTime('timestamp');

            $table->unsignedBigInteger('in_octets');
            $table->unsignedBigInteger('out_octets');

            $table->unsignedBigInteger('in_rate')->nullable();
            $table->unsignedBigInteger('out_rate')->nullable();

            $table->timestamps();

            $table->unique(['port_id', 'timestamp']);
            $table->index('port_id');
            $table->index('timestamp');
            $table->foreign('port_id')
                ->references('port_id')
                ->on('ports')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('port_traffic');
    }
};
