<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\Processor;
use Illuminate\Support\Facades\Log;
use Exception;

class CpuPoller
{
    public static function handle(Device $device, array $cpu, array $system): void
    {
        try {
            Processor::updateOrCreate(
                [
                    'device_id' => $device->device_id,
                    'processor_index' => '0'
                ],
                [
                    'processor_type' => 'cpu',
                    'processor_descr' => $cpu['model'] ?? 'Unknown CPU',
                    'processor_usage' => (int) ($cpu['usage']['percentUsed'] ?? 0),
                ]
            );
        } catch (Exception $e) {
            Log::error("CpuPoller Error: " . $e->getMessage());
        }
    }
}