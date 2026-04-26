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
            // Karena dari log terlihat data langsung berupa array dengan key nama interface
            // contoh: ["lo" => [...], "eth0" => [...]]
            if (empty($network) || !is_array($network)) {
                return;
            }

            DB::transaction(function () use ($device, $network) {
                // Ambil pemetaan port yang sudah ada di DB agar ifIndex selalu konsisten (angka)
                $existingPorts = Port::where('device_id', $device->device_id)
                                     ->pluck('ifIndex', 'ifName')
                                     ->toArray();
                
                $maxIfIndex = !empty($existingPorts) ? max($existingPorts) : 0;

                // Looping berdasarkan format API yang baru ketahuan ini
                foreach ($network as $ifName => $ipConfigs) {
                    
                    // Lewati kalau ternyata format isinya aneh
                    if (!is_array($ipConfigs)) continue;

                    // Tentukan angka ifIndex yang konsisten (MySQL butuh ini berupa integer)
                    if (isset($existingPorts[$ifName])) {
                        $ifIndex = $existingPorts[$ifName];
                    } else {
                        $maxIfIndex++;
                        $ifIndex = $maxIfIndex;
                        $existingPorts[$ifName] = $ifIndex; // Simpan ke memory sementara
                    }

                    // Tentukan tipe jaringan (sekadar kosmetik untuk DB/Frontend)
                    $ifType = str_contains($ifName, 'lo') ? 'softwareLoopback' : 'Ethernet';

                    // 1. Simpan data Interface ke tabel ports
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

                    // 2. Simpan Riwayat Trafik (Karena API tidak sedia rx/tx bytes, kita beri 0 agar tabel tidak error)
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