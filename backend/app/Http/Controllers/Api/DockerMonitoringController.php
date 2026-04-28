<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DockerHost;
use App\Models\DockerContainer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DockerMonitoringController extends Controller
{
    private function jsonResponse($data): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'timestamp' => now()->toIso8601ZuluString(),
        ]);
    }

    private function getTimeRange(Request $request): array
    {
        if ($request->has('from') && $request->has('to')) {
            return [
                Carbon::parse($request->from),
                Carbon::parse($request->to)
            ];
        }

        $range = $request->query('range', '24h');
        $to = now();
        $from = match ($range) {
            '1h' => now()->subHour(),
            '6h' => now()->subHours(6),
            '7d' => now()->subDays(7),
            default => now()->subHours(24),
        };

        return [$from, $to];
    }

    public function getHosts(): JsonResponse
    {
        $hosts = DockerHost::select('docker_host_id', 'name', 'status', 'last_connected')->get();
        return $this->jsonResponse($hosts);
    }

    public function getHostDetail($id): JsonResponse
    {
        $host = DockerHost::with('device')->findOrFail($id);
        $containerCount = $host->containers()->count();
        $runningCount = $host->containers()->where('state', 'running')->count();

        return $this->jsonResponse([
            'docker_host_id'  => $host->docker_host_id,
            'name'            => $host->name,
            'connection_type' => $host->connection_type,
            'socket_path'     => $host->socket_path,
            'docker_version'  => $host->docker_version,
            'api_version'     => $host->api_version,
            'status'          => $host->status,
            'last_connected'  => $host->last_connected,
            'last_error'      => $host->last_error,
            'containers_total'   => $containerCount,
            'containers_running' => $runningCount,
            'device' => $host->device ? [
                'device_id'   => $host->device->device_id,
                'hostname'    => $host->device->hostname,
                'ip'          => $host->device->ip,
                'os'          => $host->device->os,
                'hardware'    => $host->device->hardware,
                'uptime'      => $host->device->uptime,
                'status'      => (bool) $host->device->status,
                'last_polled' => $host->device->last_polled,
                'sysDescr'    => $host->device->sysDescr,
            ] : null,
        ]);
    }

    public function getContainers($id): JsonResponse
    {
        $host = DockerHost::findOrFail($id);
        $containers = $host->containers()->select('id', 'name', 'image', 'status', 'state', 'last_polled')->get();
        
        return $this->jsonResponse($containers);
    }

    public function getContainerMetrics(Request $request, $id, $containerId): JsonResponse
    {
        $container = DockerContainer::where('docker_host_id', $id)->findOrFail($containerId);
            
        [$from, $to] = $this->getTimeRange($request);

        $metrics = $container->metrics()
            ->whereBetween('timestamp', [$from, $to])
            ->orderBy('timestamp', 'asc')
            ->limit(1440)
            ->get();

        return $this->jsonResponse($metrics);
    }

    public function getContainerLogs(Request $request, $id, $containerId): JsonResponse
    {
        $container = DockerContainer::where('docker_host_id', $id)->findOrFail($containerId);

        [$from, $to] = $this->getTimeRange($request);
        
        $query = $container->logs()
            ->whereBetween('event_time', [$from, $to])
            ->orderBy('event_time', 'desc');

        if ($request->has('level')) {
            $query->where('level', $request->level);
        }

        return $this->jsonResponse($query->limit(500)->get());
    }
}