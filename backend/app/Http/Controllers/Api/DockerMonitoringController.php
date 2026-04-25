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