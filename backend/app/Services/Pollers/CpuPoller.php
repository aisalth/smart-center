<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\Processor;
use App\Models\SnmpMetricHistory;
use Illuminate\Support\Facades\Log;
use Exception;

class CpuPoller
{
    public static function handle(Device $device, array $cpu, array $system): void
    {
        try {
            $cpuUsage = (int) ($cpu['usage']['percentUsed'] ?? 0);
            $cpuLabel = $cpu['model'] ?? 'Unknown CPU';

            // Current state (tetap updateOrCreate)
            Processor::updateOrCreate(
                [
                    'device_id' => $device->device_id,
                    'processor_index' => '0'
                ],
                [
                    'processor_type' => 'cpu',
                    'processor_descr' => $cpuLabel,
                    'processor_usage' => $cpuUsage,
                ]
            );

            // History log (INSERT per menit)
            SnmpMetricHistory::create([
                'device_id'     => $device->device_id,
                'metric_type'   => 'cpu',
                'metric_label'  => $cpuLabel,
                'value_percent' => $cpuUsage,
                'recorded_at'   => now(),
            ]);

            // Log memory dari system data jika tersedia
            if (!empty($system['memory'])) {
                $memTotal = $system['memory']['total'] ?? 0;
                $memUsed  = $system['memory']['used'] ?? 0;
                $memPerc  = $memTotal > 0 ? round(($memUsed / $memTotal) * 100, 2) : 0;

                SnmpMetricHistory::create([
                    'device_id'     => $device->device_id,
                    'metric_type'   => 'memory',
                    'metric_label'  => 'Physical Memory',
                    'value_percent' => $memPerc,
                    'value_used'    => $memUsed,
                    'value_total'   => $memTotal,
                    'recorded_at'   => now(),
                ]);
            }
        } catch (Exception $e) {
            Log::error("CpuPoller Error: " . $e->getMessage());
        }
    }
}