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
        Schema::create('snmp_data', function (Blueprint $table) {
            $table->id();
            $table->string('hostname')->nullable();
            $table->string('uptime')->nullable();
            $table->string('cpu_user')->nullable();
            $table->string('cpu_system')->nullable();
            $table->string('cpu_idle')->nullable();
            $table->string('ram_total')->nullable();
            $table->string('ram_used')->nullable();
            $table->timestamp('fetched_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('snmp_data');
    }
};
