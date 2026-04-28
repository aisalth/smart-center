<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\Storage;
use App\Models\SnmpMetricHistory;
use Illuminate\Support\Facades\Log;
use Exception;

class DiskPoller
{
    public static function handle(Device $device, array $disk): void
    {
        try {
            $diskTotal = $disk['total'] ?? 0;
            $diskUsed  = $disk['used'] ?? 0;
            $diskFree  = $diskTotal - $diskUsed;
            $diskPerc  = (int) ($disk['percentUsed'] ?? 0);

            // Current state (tetap updateOrCreate)
            Storage::updateOrCreate(
                [
                    'device_id' => $device->device_id,
                    'type' => 'disk',
                    'storage_index' => '/'
                ],
                [
                    'storage_descr' => 'Root Filesystem',
                    'storage_size' => $diskTotal,
                    'storage_used' => $diskUsed,
                    'storage_free' => $diskFree,
                    'storage_perc' => $diskPerc,
                ]
            );

            // History log (INSERT per menit)
            SnmpMetricHistory::create([
                'device_id'     => $device->device_id,
                'metric_type'   => 'disk',
                'metric_label'  => 'Root Filesystem',
                'value_percent' => $diskPerc,
                'value_used'    => $diskUsed,
                'value_total'   => $diskTotal,
                'recorded_at'   => now(),
            ]);
        } catch (Exception $e) {
            Log::error("DiskPoller Error: " . $e->getMessage());
        }
    }
}