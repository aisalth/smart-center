<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->unsignedBigInteger('rule_id');
            $table->integer('state');           // 0=ok, 1=alert, 2=acknowledged
            $table->integer('alerted')->default(0);
            $table->integer('open')->default(1);
            $table->text('note')->nullable();
            $table->timestamp('timestamp')->useCurrent();

            $table->unique(['device_id', 'rule_id']);
            $table->index('device_id');
            $table->index('rule_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};