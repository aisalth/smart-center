<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;

class DeviceApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Device::with(['processors', 'storages', 'alerts' => fn($q) => $q->where('open', 1)]);

        // Filter by category: snmp atau docker
        if ($request->has('category')) {
            $query->where('category', $request->get('category'));
        }

        $devices = $query
            ->orderByDesc('status')
            ->orderBy('hostname')
            ->get()
            ->map(fn($d) => $this->formatDevice($d));

        return response()->json([
            'data' => $devices,
            'meta' => [
                'total'   => $devices->count(),
                'online'  => $devices->where('status', true)->count(),
                'offline' => $devices->where('status', false)->count(),
            ],
        ]);
    }

    public function show(Device $device)
    {
        $device->load(['processors', 'storages', 'ports', 'alerts.alertRule']);

        return response()->json([
            'data' => $this->formatDevice($device, detail: true),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'hostname'  => 'required|string|max:128',
            'ip'        => 'required|ip',
            'community' => 'required|string|max:255',
            'snmpver'   => 'required|in:v1,v2c,v3',
            'port'      => 'nullable|integer|min:1|max:65535',
            'transport' => 'nullable|in:udp,tcp',
        ]);

        $data['port']      = $data['port'] ?? 161;
        $data['transport'] = $data['transport'] ?? 'udp';
        $data['category']  = 'snmp';

        $device = Device::create($data);

        // Auto-poll SNMP setelah device dibuat
        try {
            $snmpService = app(\App\Services\SnmpService::class);
            $pollResult  = $snmpService->pollDevice($device);
            $device->refresh();
        } catch (\Exception $e) {
            // Poll gagal bukan masalah fatal, device tetap tersimpan
        }

        return response()->json([
            'data'    => $this->formatDevice($device),
            'message' => 'Device berhasil ditambahkan dan di-poll.',
            'polled'  => isset($pollResult) && $pollResult,
        ], 201);
    }

    public function update(Request $request, Device $device)
    {
        $data = $request->validate([
            'hostname'  => 'sometimes|string|max:128',
            'ip'        => 'sometimes|ip',
            'community' => 'sometimes|string|max:255',
            'snmpver'   => 'sometimes|in:v1,v2c,v3',
            'port'      => 'sometimes|integer|min:1|max:65535',
            'transport' => 'sometimes|in:udp,tcp',
            'disabled'  => 'sometimes|boolean',
            'ignore'    => 'sometimes|boolean',
        ]);

        $device->update($data);

        return response()->json(['data' => $this->formatDevice($device), 'message' => 'Device berhasil diupdate.']);
    }

    public function destroy(Device $device)
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($device) {
            $deviceId = $device->device_id;

            // 1. Delete SNMP metrics history
            \Illuminate\Support\Facades\DB::table('snmp_metrics_history')
                ->where('device_id', $deviceId)->delete();

            // 2. Delete port traffic (via ports)
            $portIds = $device->ports()->pluck('port_id');
            if ($portIds->isNotEmpty()) {
                \Illuminate\Support\Facades\DB::table('port_traffic')
                    ->whereIn('port_id', $portIds)->delete();
            }

            // 3. Delete ports
            $device->ports()->delete();

            // 4. Delete processors
            $device->processors()->delete();

            // 5. Delete storages
            $device->storages()->delete();

            // 6. Delete alerts
            $device->alerts()->delete();

            // 7. Delete docker containers + metrics (via docker_hosts)
            $dockerHosts = $device->dockerHosts;
            foreach ($dockerHosts as $host) {
                $containerIds = $host->containers()->pluck('id');
                if ($containerIds->isNotEmpty()) {
                    \Illuminate\Support\Facades\DB::table('container_metrics')
                        ->whereIn('container_id', $containerIds)->delete();
                }
                $host->containers()->delete();
            }
            $device->dockerHosts()->delete();

            // 8. Delete device itself
            $device->delete();
        });

        return response()->json(['message' => 'Device dan seluruh datanya berhasil dihapus.']);
    }

    private function formatDevice(Device $device, bool $detail = false): array
    {
        $base = [
            'device_id'    => $device->device_id,
            'hostname'     => $device->hostname,
            'ip'           => $device->ip,
            'snmpver'      => $device->snmpver,
            'port'         => $device->port,
            'transport'    => $device->transport,
            'status'       => (bool) $device->status,
            'status_reason'=> $device->status_reason,
            'uptime'       => $device->uptime,
            'uptime_human' => $device->uptime_human,
            'last_polled'  => $device->last_polled,
            'disabled'     => (bool) $device->disabled,
            'ignore'       => (bool) $device->ignore,
            'cpu_usage'    => $device->cpu_usage,
            'memory_percent' => $device->memory_percent,
            'disk_percent'   => $device->disk_percent,
            'open_alerts'    => $device->relationLoaded('alerts') ? $device->alerts->count() : 0,
            'sysDescr'     => $device->sysDescr,
            'sysName'      => $device->sysName,
            'os'           => $device->os,
            'category'     => $device->category ?? 'snmp',
        ];

        if ($detail) {
            $base['processors'] = $device->processors->map(fn($p) => [
                'id'      => $p->processor_id,
                'descr'   => $p->processor_descr,
                'usage'   => $p->processor_usage,
                'warn_at' => $p->processor_perc_warn,
            ]);

            $base['storages'] = $device->storages->map(fn($s) => [
                'id'       => $s->storage_id,
                'type'     => $s->type,
                'descr'    => $s->storage_descr,
                'size'     => $s->storage_size,
                'used'     => $s->storage_used,
                'free'     => $s->storage_free,
                'perc'     => $s->storage_perc,
                'warn_at'  => $s->storage_perc_warn,
                'size_gb'  => $s->storage_size ? round($s->storage_size / 1073741824, 2) : null,
                'used_gb'  => round($s->storage_used / 1073741824, 2),
                'free_gb'  => round($s->storage_free / 1073741824, 2),
            ]);

            $base['ports'] = $device->ports->map(fn($p) => [
                'port_id'       => $p->port_id,
                'ifIndex'       => $p->ifIndex,
                'ifName'        => $p->ifName,
                'ifDescr'       => $p->ifDescr,
                'ifType'        => $p->ifType,
                'ifSpeed'       => $p->ifSpeed,
                'speed_human'   => $p->speed_human,
                'ifAdminStatus' => $p->ifAdminStatus,
                'ifOperStatus'  => $p->ifOperStatus,
            ]);

            $base['alerts'] = $device->alerts->map(fn($a) => [
                'id'        => $a->id,
                'rule'      => $a->alertRule->name ?? null,
                'metric'    => $a->alertRule->metric ?? null,
                'severity'  => $a->alertRule->severity ?? 1,
                'state'     => $a->state,
                'open'      => (bool) $a->open,
                'note'      => $a->note,
                'timestamp' => $a->timestamp,
            ]);
        }

        return $base;
    }
}