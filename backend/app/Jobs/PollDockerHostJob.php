<?php

namespace App\Jobs;

use App\Models\DockerHost;
use App\Models\DockerContainer;
use App\Models\ContainerMetric;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class PollDockerHostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected DockerHost $host;

    public function __construct(DockerHost $host)
    {
        $this->host = $host;
    }

    public function handle(): void
    {
        $url = "http://{$this->host->tcp_host}:{$this->host->tcp_port}/monitoring";

        try {
            $response = Http::timeout(10)->get($url);

            if ($response->failed()) {
                $this->handleFailure("HTTP Error: " . $response->status());
                return;
            }

            $payload = $response->json();
            
            if (!data_get($payload, 'success')) {
                $this->handleFailure("API returned success: false");
                return;
            }

            $data = data_get($payload, 'data', []);
            $timestamp = Carbon::parse(data_get($payload, 'timestamp', now()));

            // Update Device Uptime
            DB::table('devices')->where('device_id', $this->host->device_id)->update([
                'uptime' => data_get($data, 'system.uptime.seconds', 0),
                'last_polled' => now(),
            ]);

            // Eksekusi Container
            $containers = data_get($data, 'docker.containers', []);
            $this->processContainers($containers, $timestamp);

            // Update status Host
            $this->host->update([
                'status' => 1,
                'last_connected' => now(),
                'last_error' => null,
            ]);

        } catch (Exception $e) {
            Log::error("PollDockerHostJob Exception for Host ID {$this->host->docker_host_id}: " . $e->getMessage());
            $this->handleFailure($e->getMessage());
        }
    }

    protected function handleFailure(string $errorMessage): void
    {
        $this->host->update([
            'status' => 2,
            'last_error' => substr($errorMessage, 0, 255),
        ]);
    }

    protected function processContainers(array $containers, Carbon $timestamp): void
    {
        foreach ($containers as $containerData) {
            // KARENA API TIDAK PUNYA 'id', KITA GUNAKAN 'name' SEBAGAI ID UNIK
            $containerName = data_get($containerData, 'name');
            if (!$containerName) continue; 

            $statusText = data_get($containerData, 'status', 'unknown');
            // Deteksi "Up 9 hours" menjadi state "running"
            $state = str_contains(strtolower($statusText), 'up') ? 'running' : 'exited';

            // Upsert Container
            $containerModel = DockerContainer::updateOrCreate(
                [
                    'docker_host_id' => $this->host->docker_host_id,
                    // Potong maksimal 64 char karena struktur databasemu membatasi varchar(64)
                    'container_docker_id' => substr($containerName, 0, 64), 
                ],
                [
                    'name' => $containerName,
                    'image' => data_get($containerData, 'image'),
                    'status' => $statusText,
                    'state' => $state,
                    'last_polled' => now(),
                ]
            );

            // PARSING METRIK CPU & RAM PERSEN
            $cpuString = data_get($containerData, 'stats.cpu', '0%');
            $cpuPercent = (float) str_replace('%', '', $cpuString);

            $memString = data_get($containerData, 'stats.memPercent', '0%');
            $memPercent = (float) str_replace('%', '', $memString);

            // PARSING MEMORY USAGE
            $memUsageString = data_get($containerData, 'stats.memUsage', '');
            $memUsageBytes = null;
            $memLimitBytes = null;

            if ($memUsageString) {
                // Hilangkan semua spasi biar aman ("4.641MiB/512MiB")
                $cleanString = str_replace(' ', '', $memUsageString); 
                $parts = explode('/', $cleanString);

                if (count($parts) === 2) {
                    $convertToBytes = function($valueStr) {
                        $val = (float) preg_replace('/[^0-9.]/', '', $valueStr); // Ambil angka
                        $valueStr = strtolower($valueStr); // Jadikan huruf kecil semua
                        
                        if (str_contains($valueStr, 'g')) return (int) ($val * 1073741824); // GB/GiB
                        if (str_contains($valueStr, 'm')) return (int) ($val * 1048576);    // MB/MiB
                        if (str_contains($valueStr, 'k')) return (int) ($val * 1024);       // KB/KiB
                        return (int) $val; // Bytes
                    };

                    $memUsageBytes = $convertToBytes($parts[0]);
                    $memLimitBytes = $convertToBytes($parts[1]);
                }
            }

            // --- TAMBAHKAN BARIS INI UNTUK CCTV (DEBUGGING) ---
            Log::info("DEBUG MEMORY CONTAINER {$containerModel->name}", [
                'Teks_Asli' => $memUsageString,
                'Hasil_Byte_Usage' => $memUsageBytes,
                'Hasil_Byte_Limit' => $memLimitBytes
            ]);

            // Simpan metrik ke database
            ContainerMetric::create([
                'container_id' => $containerModel->id,
                'timestamp' => $timestamp,
                'cpu_usage_percent' => $cpuPercent,
                'mem_usage_percent' => $memPercent,
                'mem_usage' => $memUsageBytes,      // Sekarang ini terisi!
                'mem_limit' => $memLimitBytes,      // Sekarang ini terisi!
            ]);
        }
    }
}