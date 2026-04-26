<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\Storage;
use Illuminate\Support\Facades\Log;
use Exception;

class DiskPoller
{
    public static function handle(Device $device, array $disk): void
    {
        try {
            Storage::updateOrCreate(
                [
                    'device_id' => $device->device_id,
                    'type' => 'disk',
                    'storage_index' => '/'
                ],
                [
                    'storage_descr' => 'Root Filesystem',
                    'storage_size' => $disk['total'] ?? 0,
                    'storage_used' => $disk['used'] ?? 0,
                    'storage_free' => ($disk['total'] ?? 0) - ($disk['used'] ?? 0),
                    'storage_perc' => (int) ($disk['percentUsed'] ?? 0),
                ]
            );
        } catch (Exception $e) {
            Log::error("DiskPoller Error: " . $e->getMessage());
        }
    }
}