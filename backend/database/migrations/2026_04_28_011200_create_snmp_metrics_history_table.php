<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('snmp_metrics_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')
                  ->constrained('devices', 'device_id')
                  ->cascadeOnDelete();

            $table->string('metric_type', 16);       // 'cpu', 'memory', 'disk'
            $table->string('metric_label', 128);      // e.g. 'CPU', '/', 'Physical Memory'
            $table->decimal('value_percent', 5, 2);   // Persentase penggunaan
            $table->bigInteger('value_used')->nullable();   // Bytes used (for storage/memory)
            $table->bigInteger('value_total')->nullable();  // Bytes total (for storage/memory)
            $table->timestamp('recorded_at');

            // Composite index untuk query history per device + type + waktu
            $table->index(['device_id', 'metric_type', 'recorded_at'], 'idx_metrics_device_type_time');
            $table->index('recorded_at'); // Untuk cleanup query
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('snmp_metrics_history');
    }
};
