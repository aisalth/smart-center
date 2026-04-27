<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Port;
use Illuminate\Http\Request;

class MetricApiController extends Controller
{
    private function rangeMinutes(string $range): int
    {
        return match ($range) {
            '1h'  => 60,
            '6h'  => 360,
            '24h' => 1440,
            '7d'  => 10080,
            '30d' => 43200,
            default => 60,
        };
    }

    /**
     * GET /api/devices/{device}/summary
     * Ringkasan semua metrik device dalam 1 response
     */
    public function summary(Device $device)
    {
        $device->load(['processors', 'storages', 'alerts' => fn($q) => $q->where('open', 1)]);

        return response()->json([
            'device_id'      => $device->device_id,
            'hostname'       => $device->hostname,
            'status'         => (bool) $device->status,
            'uptime'         => $device->uptime,
            'uptime_human'   => $device->uptime_human,
            'last_polled'    => $device->last_polled,
            'cpu' => [
                'usage'   => $device->cpu_usage,
                'cores'   => $device->processors->count(),
                'details' => $device->processors->map(fn($p) => [
                    'descr'   => $p->processor_descr,
                    'usage'   => $p->processor_usage,
                    'warn_at' => $p->processor_perc_warn,
                ]),
            ],
            'memory' => $device->storages->where('type', 'memory')->map(fn($s) => [
                'descr'   => $s->storage_descr,
                'size_gb' => $s->storage_size ? round($s->storage_size / 1073741824, 2) : null,
                'used_gb' => round($s->storage_used / 1073741824, 2),
                'free_gb' => round($s->storage_free / 1073741824, 2),
                'perc'    => $s->storage_perc,
                'warn_at' => $s->storage_perc_warn,
            ])->values(),
            'disk' => $device->storages->where('type', 'disk')->map(fn($s) => [
                'descr'   => $s->storage_descr,
                'size_gb' => $s->storage_size ? round($s->storage_size / 1073741824, 2) : null,
                'used_gb' => round($s->storage_used / 1073741824, 2),
                'free_gb' => round($s->storage_free / 1073741824, 2),
                'perc'    => $s->storage_perc,
                'warn_at' => $s->storage_perc_warn,
            ])->values(),
            'open_alerts' => $device->alerts->count(),
        ]);
    }

    /**
     * GET /api/devices/{device}/cpu
     */
    public function cpu(Device $device)
    {
        $processors = $device->processors()->get();

        return response()->json([
            'device_id' => $device->device_id,
            'data'      => $processors->map(fn($p) => [
                'processor_id'   => $p->processor_id,
                'descr'          => $p->processor_descr,
                'type'           => $p->processor_type,
                'usage'          => $p->processor_usage,
                'warn_at'        => $p->processor_perc_warn,
                'is_warning'     => $p->processor_usage >= $p->processor_perc_warn,
                'updated_at'     => $p->updated_at,
            ]),
            // Chart.js ready
            'chart' => [
                'labels'   => $processors->pluck('processor_descr'),
                'datasets' => [[
                    'label' => 'CPU Usage (%)',
                    'data'  => $processors->pluck('processor_usage'),
                ]],
            ],
        ]);
    }

    /**
     * GET /api/devices/{device}/storage
     */
    public function storage(Device $device)
    {
        $storages = $device->storages()->get();

        return response()->json([
            'device_id' => $device->device_id,
            'data'      => $storages->map(fn($s) => [
                'storage_id'  => $s->storage_id,
                'type'        => $s->type,
                'descr'       => $s->storage_descr,
                'size_bytes'  => $s->storage_size,
                'used_bytes'  => $s->storage_used,
                'free_bytes'  => $s->storage_free,
                'size_gb'     => $s->storage_size ? round($s->storage_size / 1073741824, 2) : null,
                'used_gb'     => round($s->storage_used / 1073741824, 2),
                'free_gb'     => round($s->storage_free / 1073741824, 2),
                'perc'        => $s->storage_perc,
                'warn_at'     => $s->storage_perc_warn,
                'is_warning'  => $s->storage_perc >= $s->storage_perc_warn,
                'updated_at'  => $s->updated_at,
            ]),
            // Chart.js ready
            'chart' => [
                'labels'   => $storages->pluck('storage_descr'),
                'datasets' => [
                    [
                        'label' => 'Used (GB)',
                        'data'  => $storages->map(fn($s) => round($s->storage_used / 1073741824, 2)),
                    ],
                    [
                        'label' => 'Free (GB)',
                        'data'  => $storages->map(fn($s) => round($s->storage_free / 1073741824, 2)),
                    ],
                ],
                'percentages' => $storages->pluck('storage_perc'),
            ],
        ]);
    }

    /**
     * GET /api/devices/{device}/ports
     */
    public function ports(Device $device)
    {
        $ports = $device->ports()->get();

        return response()->json([
            'device_id' => $device->device_id,
            'data'      => $ports->map(fn($p) => [
                'port_id'       => $p->port_id,
                'ifIndex'       => $p->ifIndex,
                'ifName'        => $p->ifName,
                'ifDescr'       => $p->ifDescr,
                'ifType'        => $p->ifType,
                'ifSpeed'       => $p->ifSpeed,
                'speed_human'   => $p->speed_human,
                'ifAdminStatus' => $p->ifAdminStatus,
                'ifOperStatus'  => $p->ifOperStatus,
                'is_up'         => $p->ifOperStatus === 'up',
            ]),
        ]);
    }

    /**
     * GET /api/ports/{port}/traffic?range=1h|6h|24h|7d|30d
     */
    public function traffic(Port $port, Request $request)
    {
        $range   = $request->get('range', '1h');
        $minutes = $this->rangeMinutes($range);

        $traffic = $port->portTraffic()
            ->where('timestamp', '>=', now()->subMinutes($minutes))
            ->orderBy('timestamp')
            ->get(['timestamp', 'in_octets', 'out_octets', 'in_rate', 'out_rate']);

        return response()->json([
            'port_id'  => $port->port_id,
            'ifName'   => $port->ifName,
            'range'    => $range,
            'data'     => $traffic->map(fn($t) => [
                'timestamp'  => $t->timestamp,
                'in_octets'  => $t->in_octets,
                'out_octets' => $t->out_octets,
                'in_rate'    => $t->in_rate,
                'out_rate'   => $t->out_rate,
                // Bytes/s ke Kbps untuk display
                'in_kbps'    => $t->in_rate ? round($t->in_rate * 8 / 1000, 2) : null,
                'out_kbps'   => $t->out_rate ? round($t->out_rate * 8 / 1000, 2) : null,
            ]),
            // Chart.js ready
            'chart' => [
                'labels'   => $traffic->map(fn($t) => $t->timestamp->format('H:i')),
                'datasets' => [
                    [
                        'label' => 'In (Kbps)',
                        'data'  => $traffic->map(fn($t) => $t->in_rate ? round($t->in_rate * 8 / 1000, 2) : 0),
                    ],
                    [
                        'label' => 'Out (Kbps)',
                        'data'  => $traffic->map(fn($t) => $t->out_rate ? round($t->out_rate * 8 / 1000, 2) : 0),
                    ],
                ],
            ],
        ]);
    }

    /**
     * GET /api/devices/{device}/alerts
     */
    public function alerts(Device $device, Request $request)
    {
        $open = $request->boolean('open', true);

        $alerts = $device->alerts()
            ->with('alertRule')
            ->when($open, fn($q) => $q->where('open', 1))
            ->orderByDesc('timestamp')
            ->get();

        return response()->json([
            'device_id' => $device->device_id,
            'count'     => $alerts->count(),
            'data'      => $alerts->map(fn($a) => [
                'id'        => $a->id,
                'rule_id'   => $a->rule_id,
                'rule_name' => $a->alertRule->name ?? null,
                'metric'    => $a->alertRule->metric ?? null,
                'severity'  => $a->alertRule->severity ?? 1,
                'state'     => $a->state,
                'open'      => (bool) $a->open,
                'note'      => $a->note,
                'timestamp' => $a->timestamp,
            ]),
        ]);
    }
}