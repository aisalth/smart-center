<?php

namespace App\Services\Pollers;

use App\Models\Device;
use App\Models\DockerHost;
use App\Models\DockerContainer;
use App\Models\ContainerMetric;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class DockerPoller
{
    public static function handle(Device $device, array $docker): void
    {
        try {
            if (empty($docker['containers']) || !is_array($docker['containers'])) {
                return;
            }

            DB::transaction(function () use ($device, $docker) {
                $host = DockerHost::updateOrCreate(
                    ['device_id' => $device->device_id],
                    [
                        'name' => $device->hostname . ' Docker',
                        'status' => ($docker['running'] ?? 0) > 0 ? 1 : 0,
                        'last_connected' => now(),
                    ]
                );

                foreach ($docker['containers'] as $containerData) {
                    $containerId = $containerData['id'] ?? $containerData['Id'] ?? $containerData['name'] ?? null;
                    
                    if (!$containerId) {
                        continue;
                    }

                    $container = DockerContainer::updateOrCreate(
                        [
                            'docker_host_id' => $host->docker_host_id,
                            'container_docker_id' => $containerId,
                        ],
                        [
                            'name' => $containerData['name'] ?? 'Unknown',
                            'image' => $containerData['image'] ?? 'Unknown',
                            'status' => $containerData['status'] ?? 'unknown',
                            'state' => 'running',
                            'ports' => [],
                            'labels' => [],
                            'networks' => [],
                            'last_polled' => now(),
                        ]
                    );

                    $stats = $containerData['stats'] ?? [];
                    
                    $cpuPercent = isset($stats['cpu']) ? (float) str_replace('%', '', $stats['cpu']) : null;
                    $memPercent = isset($stats['memPercent']) ? (float) str_replace('%', '', $stats['memPercent']) : null;

                    $memUsageBytes = null;
                    $memLimitBytes = null;
                    
                    if (!empty($stats['memUsage'])) {
                        $memParts = explode(' / ', $stats['memUsage']);
                        if (count($memParts) === 2) {
                            $memUsageBytes = self::convertToBytes($memParts[0]);
                            $memLimitBytes = self::convertToBytes($memParts[1]);
                        }
                    }

                    Log::info("Menyimpan metrik untuk container: {$container->name}", [
                        'cpu_percent' => $cpuPercent,
                        'mem_percent' => $memPercent,
                        'mem_usage' => $memUsageBytes,
                        'mem_limit' => $memLimitBytes,
                    ]);

                    Log::info("Menyimpan metrik untuk container: {$container->name}", [
                        'cpu_percent' => $cpuPercent,
                        'mem_percent' => $memPercent,
                        'mem_usage' => $memUsageBytes,
                        'mem_limit' => $memLimitBytes,
                    ]);

                    DB::table('container_metrics')->updateOrInsert(
                        [
                            'container_id' => $container->id,
                            'timestamp' => now()->startOfMinute()->toDateTimeString(),
                        ],
                        [
                            'cpu_usage_percent' => $cpuPercent,
                            'mem_usage_percent' => $memPercent,
                            'mem_usage' => $memUsageBytes,
                            'mem_limit' => $memLimitBytes,
                            'net_rx_bytes' => 0,
                            'net_tx_bytes' => 0,
                            'blk_read_bytes' => 0,
                            'blk_write_bytes' => 0,
                            'pids' => 0,
                        ]
                    );
                }
            });
        } catch (Exception $e) {
            Log::error("DockerPoller Error: " . $e->getMessage());
            throw $e;
        }
    }

    private static function convertToBytes(string $memoryString): ?int
    {
        $memoryString = trim($memoryString);
        $value = (float) preg_replace('/[^\d.]/', '', $memoryString);
        $unit = strtolower(preg_replace('/[\d.\s]/', '', $memoryString));

        return match ($unit) {
            'b' => (int) $value,
            'kib', 'kb' => (int) ($value * 1024),
            'mib', 'mb' => (int) ($value * 1024 * 1024),
            'gib', 'gb' => (int) ($value * 1024 * 1024 * 1024),
            'tib', 'tb' => (int) ($value * 1024 * 1024 * 1024 * 1024),
            default => (int) $value,
        };
    }
}