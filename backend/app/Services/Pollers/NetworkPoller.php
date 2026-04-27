<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\Port;
use App\Models\PortTraffic;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class NetworkPoller
{
    public static function handle(Device $device, array $network): void
    {
        try {
            if (empty($network) || !is_array($network)) {
                return;
            }

            DB::transaction(function () use ($device, $network) {
                $existingPorts = Port::where('device_id', $device->device_id)
                                     ->pluck('ifIndex', 'ifName')
                                     ->toArray();
                
                $maxIfIndex = !empty($existingPorts) ? max($existingPorts) : 0;

                foreach ($network as $ifName => $ipConfigs) {
                    
                    if (!is_array($ipConfigs)) continue;

                    if (isset($existingPorts[$ifName])) {
                        $ifIndex = $existingPorts[$ifName];
                    } else {
                        $maxIfIndex++;
                        $ifIndex = $maxIfIndex;
                        $existingPorts[$ifName] = $ifIndex;
                    }

                    $ifType = str_contains($ifName, 'lo') ? 'softwareLoopback' : 'Ethernet';

                    $port = Port::updateOrCreate(
                        [
                            'device_id' => $device->device_id,
                            'ifIndex' => $ifIndex,
                        ],
                        [
                            'ifName' => $ifName,
                            'ifDescr' => $ifName, 
                            'ifType' => $ifType,
                            'ifSpeed' => 0, // Kosongkan karena API tidak sedia
                            'ifAdminStatus' => 'up',
                            'ifOperStatus' => 'up',
                        ]
                    );

                    PortTraffic::create([
                        'port_id' => $port->port_id,
                        'timestamp' => now()->startOfMinute()->toDateTimeString(),
                        'in_octets' => 0,
                        'out_octets' => 0,
                        'in_rate' => null,
                        'out_rate' => null,
                    ]);
                }
            });
        } catch (Exception $e) {
            Log::error("NetworkPoller Error: " . $e->getMessage());
            throw $e; 
        }
    }
}