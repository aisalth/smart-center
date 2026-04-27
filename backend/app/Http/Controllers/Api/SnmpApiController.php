<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Services\SnmpService;

class SnmpApiController extends Controller
{
    public function __construct(private SnmpService $snmp) {}

    public function testConnection(Device $device)
    {
        $result = $this->snmp->testConnection($device);

        return response()->json([
            'success' => $result,
            'message' => $result
                ? "Koneksi SNMP ke {$device->hostname} ({$device->ip}) berhasil."
                : "Koneksi SNMP ke {$device->hostname} ({$device->ip}) gagal / timeout.",
        ]);
    }

    public function pollDevice(Device $device)
    {
        $result = $this->snmp->pollDevice($device);
        $device->refresh();
        $device->load(['processors', 'storages']);

        return response()->json([
            'success'    => $result,
            'message'    => $result ? 'Polling berhasil.' : 'Polling gagal — device offline atau tidak bisa direach.',
            'device_id'  => $device->device_id,
            'status'     => (bool) $device->status,
            'last_polled'=> $device->last_polled,
            'uptime'     => $device->uptime,
            'cpu_usage'  => $device->cpu_usage,
            'memory_percent' => $device->memory_percent,
            'disk_percent'   => $device->disk_percent,
        ]);
    }

    public function pollAll()
    {
        $devices = Device::where('disabled', 0)
            ->where('ignore', 0)
            ->where('snmp_disable', 0)
            ->get();

        $results = [];
        foreach ($devices as $device) {
            $ok = $this->snmp->pollDevice($device);
            $results[] = [
                'device_id' => $device->device_id,
                'hostname'  => $device->hostname,
                'success'   => $ok,
            ];
        }

        $success = collect($results)->where('success', true)->count();
        $failed  = collect($results)->where('success', false)->count();

        return response()->json([
            'message' => "Polling selesai. Berhasil: {$success}, Gagal: {$failed}.",
            'results' => $results,
        ]);
    }
}