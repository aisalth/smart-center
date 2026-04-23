<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceMetric;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceController extends Controller
{
    // Tambah device
    public function store(Request $request)
    {
        $validated = $request->validate([
            'hostname' => 'required|string|max:128',
            'ip'       => 'nullable|ip',
            'port'     => 'required|integer|min:1|max:65535',
            'community'=> 'nullable|string',
            'snmpver'  => 'nullable|string|in:v1,v2c,v3',
        ]);

        $device = Device::create([
            'hostname'  => $validated['hostname'],
            'sysName'   => $validated['hostname'],
            'display'   => $validated['hostname'],
            'ip'        => $validated['ip'] ?? null,
            'community' => $validated['community'] ?? 'public',
            'port'      => $validated['port'],
            'snmpver'   => $validated['snmpver'] ?? 'v2c',
            'transport' => 'udp',
            'status'    => 1,
            'status_reason' => '',
            'snmp_disable' => 0,
            'ignore'    => 0,
            'disabled'  => 0,
            'poller_group' => 0,
            'port_association_mode' => 1,
        ]);

        return response()->json(['message' => 'Device added', 'device' => $device], 201);
    }

    // Daftar device
    public function index()
    {
        $devices = Device::select('device_id', 'hostname', 'ip', 'status', 'uptime', 'last_polled')
            ->get()
            ->map(function ($device) {
                return [
                    'id'        => $device->device_id,
                    'hostname'  => $device->hostname,
                    'ip'        => $device->ip ?? '-',
                    'status'    => $device->status ? 'active' : 'inactive',
                    'uptime'    => $device->uptime ?? 0,
                ];
            });

        return response()->json($devices);
    }

    // Detail device
    public function show($id)
    {
        $device = Device::findOrFail($id);

        // a. Informasi sistem
        $systemInfo = [
            'hostname'          => $device->hostname,
            'operating_system'  => $device->os ?? 'Unknown',
            'hardware'          => $device->hardware ?? 'Unknown',
            'ip_address'        => $device->ip ?: 'N/A',
            'uptime'            => $device->uptime ?? 0,
            'location'          => 'Location ID: ' . ($device->location_id ?? 'N/A'),
            'last_update'       => $device->last_polled,
            'last_discovered'   => $device->last_discovered,
        ];

        // b. Metrics historis (20 data terbaru dari snmp_data)
        $metrics = DeviceMetric::where('hostname', $device->hostname)
            ->orderBy('fetched_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($metric) {
                return [
                    'timestamp'    => $metric->fetched_at->toDateTimeString(),
                    'cpu_usage'    => $metric->cpu_usage,
                    'memory_usage' => $metric->memory_usage,
                    'disk_usage'   => 0, // tidak tersedia di tabel ini
                    'traffic_in'   => 0,
                    'traffic_out'  => 0,
                ];
            });

        // c. Status port (opsional, dari tabel ports jika ada)
        $portStats = DB::table('ports')
            ->where('device_id', $device->device_id)
            ->selectRaw("SUM(ifOperStatus = 'up') as up, SUM(ifOperStatus = 'down') as down")
            ->first();

        return response()->json([
            'device'      => $systemInfo,
            'metrics'     => $metrics,
            'port_status' => [
                'ports_up'   => $portStats->up ?? 0,
                'ports_down' => $portStats->down ?? 0,
            ],
        ]);
    }
}