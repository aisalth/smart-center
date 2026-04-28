<?php

namespace App\Services\Pollers;

use App\Models\Device;
use Illuminate\Support\Facades\Log;
use Exception;

class DevicePoller
{
    public static function handle(array $data, string $deviceIp = null, string $category = 'snmp'): ?Device
    {
        try {
            $ip = $deviceIp ?? config('monitoring.device_ip');

            return Device::updateOrCreate(
                ['ip' => $ip],
                [
                    'hostname'    => $data['system']['hostname'] ?? 'Unknown',
                    'os'          => $data['system']['platform'] ?? null,
                    'hardware'    => $data['cpu']['model'] ?? null,
                    'uptime'      => $data['system']['uptime']['seconds'] ?? 0,
                    'status'      => 1,
                    'category'    => $category,
                    'last_polled' => now(),
                ]
            );
        } catch (Exception $e) {
            Log::error("DevicePoller Error (ip={$deviceIp}): " . $e->getMessage());
            return null;
        }
    }
}