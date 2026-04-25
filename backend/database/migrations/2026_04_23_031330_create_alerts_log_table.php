<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rule_id');
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->integer('state');
            $table->text('details')->nullable();
            $table->timestamp('time_logged')->useCurrent();

            $table->index('time_logged');
            $table->index(['device_id', 'rule_id', 'time_logged']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts_log');
    }
};