<?php

namespace App\Jobs;

use App\Services\MonitoringApiService;
use App\Services\Pollers\DevicePoller;
use App\Services\Pollers\CpuPoller;
use App\Services\Pollers\DiskPoller;
use App\Services\Pollers\NetworkPoller;
use App\Services\Pollers\DockerPoller;
use App\Services\AlertEvaluator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class PollMonitoringApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public function backoff(): array
    {
        return [30, 60]; // Retry delay: 30s, lalu 60s
    }

    public function handle(MonitoringApiService $apiService): void
    {
        try {
            // Ambil data utama
            $data = $apiService->fetchAll();
            
            // Ambil data network secara terpisah
            $networkData = $apiService->fetchNetwork();

            \Illuminate\Support\Facades\Log::info("CEK DATA NETWORK:", ['isi_network' => $networkData]);

            $device = DevicePoller::handle($data);
            
            if (!$device) {
                throw new Exception("Gagal mendapatkan atau membuat Device.");
            }

            CpuPoller::handle($device, $data['cpu'] ?? [], $data['system'] ?? []);
            DiskPoller::handle($device, $data['disk'] ?? []);
            
            NetworkPoller::handle($device, $networkData);
            
            DockerPoller::handle($device, $data['docker'] ?? []);
            
            AlertEvaluator::evaluate($device, $data);

        } catch (Exception $e) {
            Log::error("PollMonitoringApiJob failed: " . $e->getMessage());
            $this->fail($e);
            
            throw $e; 
        }
    }
}