<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\PortTraffic;
use App\Services\PollerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MetricsController extends Controller
{
    protected PollerService $poller;

    public function __construct(PollerService $poller)
    {
        $this->poller = $poller;
    }

    public function metrics($deviceId)
    {
        $device = Device::with(['processors', 'storages'])->findOrFail($deviceId);

        $cpu = $device->processors->first();
        $memory = $device->storages->where('type', 'ram')->first();
        $disks = $device->storages->where('type', 'disk')->values();

        $response = [
            'cpu' => $cpu ? [
                'usage'          => $cpu->processor_usage,
                'warn_threshold' => $cpu->processor_perc_warn,
                'is_warning'     => $cpu->processor_usage >= $cpu->processor_perc_warn,
            ] : null,
            'memory' => $memory ? [
                'total'          => $memory->storage_size,
                'used'           => $memory->storage_used,
                'free'           => $memory->storage_free,
                'perc'           => $memory->storage_perc,
                'warn_threshold' => $memory->storage_perc_warn,
                'is_warning'     => $memory->storage_perc >= $memory->storage_perc_warn,
                'human'          => [
                    'total' => $this->formatBytes($memory->storage_size),
                    'used'  => $this->formatBytes($memory->storage_used),
                    'free'  => $this->formatBytes($memory->storage_free),
                ],
            ] : null,
            'disks' => $disks->map(function ($disk) {
                return [
                    'descr'          => $disk->storage_descr,
                    'size'           => $disk->storage_size,
                    'used'           => $disk->storage_used,
                    'free'           => $disk->storage_free,
                    'perc'           => $disk->storage_perc,
                    'warn_threshold' => $disk->storage_perc_warn,
                    'is_warning'     => $disk->storage_perc >= $disk->storage_perc_warn,
                    'human'          => [
                        'size' => $this->formatBytes($disk->storage_size),
                        'used' => $this->formatBytes($disk->storage_used),
                        'free' => $this->formatBytes($disk->storage_free),
                    ],
                ];
            }),
            'uptime_seconds' => $device->uptime,
            'uptime_human'   => $this->formatUptime($device->uptime),
            'last_polled'    => $device->last_polled,
        ];

        return response()->json(['data' => $response, 'message' => 'ok']);
    }

    public function interfaces($deviceId)
    {
        $device = Device::with(['ports.latestTraffic'])->findOrFail($deviceId);

        $ports = $device->ports->map(function ($port) {
            $traffic = $port->latestTraffic;
            return [
                'port_id'       => $port->port_id,
                'ifName'        => $port->ifName,
                'ifDescr'       => $port->ifDescr,
                'ifAdminStatus' => $port->ifAdminStatus,
                'ifOperStatus'  => $port->ifOperStatus,
                'ifSpeed'       => $port->ifSpeed,
                'in_rate'       => $traffic->in_rate ?? 0,
                'out_rate'      => $traffic->out_rate ?? 0,
            ];
        });

        return response()->json(['data' => $ports, 'message' => 'ok']);
    }

    public function traffic(Request $request, $deviceId)
    {
        $device = Device::findOrFail($deviceId);
        $portId = $request->input('port_id');
        $range = $request->input('range', '1h');

        // Determine start time
        $start = match ($range) {
            '1h'  => now()->subHour(),
            '6h'  => now()->subHours(6),
            '24h' => now()->subDay(),
            '7d'  => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subHour(),
        };

        $query = PortTraffic::whereHas('port', function ($q) use ($deviceId, $portId) {
            $q->where('device_id', $deviceId);
            if ($portId) {
                $q->where('port_id', $portId);
            }
        })->where('timestamp', '>=', $start);

        // For ranges > 24h, aggregate per 5 minutes
        if (in_array($range, ['7d', '30d'])) {
            $query->select(
                DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as time_bucket"),
                'port_id',
                DB::raw('AVG(in_rate) as avg_in_rate'),
                DB::raw('AVG(out_rate) as avg_out_rate')
            )->groupBy('time_bucket', 'port_id')->orderBy('time_bucket');
        } else {
            $query->orderBy('timestamp');
        }

        $trafficData = $query->get();

        // Group by port_id
        $result = [];
        foreach ($trafficData as $row) {
            $pid = $row->port_id;
            if (!isset($result[$pid])) {
                $port = $device->ports()->where('port_id', $pid)->first();
                $result[$pid] = [
                    'port_id' => $pid,
                    'ifName'  => $port->ifName ?? null,
                    'data'    => [],
                ];
            }
            if (isset($row->time_bucket)) {
                $result[$pid]['data'][] = [
                    'timestamp'  => $row->time_bucket,
                    'in_rate'    => round($row->avg_in_rate),
                    'out_rate'   => round($row->avg_out_rate),
                ];
            } else {
                $result[$pid]['data'][] = [
                    'timestamp'  => $row->timestamp,
                    'in_rate'    => $row->in_rate,
                    'out_rate'   => $row->out_rate,
                    'in_octets'  => $row->in_octets,
                    'out_octets' => $row->out_octets,
                ];
            }
        }

        return response()->json(['data' => array_values($result), 'message' => 'ok']);
    }

    public function pollNow($deviceId)
    {
        $device = Device::findOrFail($deviceId);
        $summary = $this->poller->pollDevice($device);

        // Reload device with relations
        $device->refresh()->load(['processors', 'storages', 'ports.latestTraffic']);

        return response()->json([
            'data' => [
                'summary' => $summary,
                'metrics' => $this->metrics($deviceId)->getData()->data,
            ],
            'message' => 'Poll completed',
        ]);
    }

    protected function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    protected function formatUptime($seconds)
    {
        if (!$seconds) return 'N/A';
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        return "{$days}d {$hours}h {$minutes}m";
    }
}