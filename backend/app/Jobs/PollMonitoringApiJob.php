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

    /**
     * @param string $targetKey  Key dari config monitoring.targets ('ibra' | 'alzaki' | ...)
     */
    public function __construct(public readonly string $targetKey = 'ibra') {}

    public function backoff(): array
    {
        return [30, 60];
    }

    public function handle(): void
    {
        $target = config("monitoring.targets.{$this->targetKey}");

        // Lewati jika target tidak dikonfigurasi
        if (empty($target['api_base_url'])) {
            Log::warning("PollMonitoringApiJob: target '{$this->targetKey}' tidak memiliki api_base_url, dilewati.");
            return;
        }

        try {
            $apiService = new MonitoringApiService($target['api_base_url']);

            // Ambil data utama
            $data = $apiService->fetchAll();

            // Ambil data network secara terpisah
            $networkData = $apiService->fetchNetwork();

            Log::info("Poll [{$this->targetKey}] berhasil fetch data dari: {$target['api_base_url']}");

            $device = DevicePoller::handle(
                $data,
                $target['device_ip'],
                $target['category'] ?? 'snmp'
            );

            if (!$device) {
                throw new Exception("Gagal mendapatkan atau membuat Device untuk target '{$this->targetKey}'.");
            }

            CpuPoller::handle($device, $data['cpu'] ?? [], $data['system'] ?? []);
            DiskPoller::handle($device, $data['disk'] ?? []);
            NetworkPoller::handle($device, $networkData);
            DockerPoller::handle($device, $data['docker'] ?? []);
            AlertEvaluator::evaluate($device, $data);

        } catch (Exception $e) {
            Log::error("PollMonitoringApiJob [{$this->targetKey}] failed: " . $e->getMessage());
            $this->fail($e);
            throw $e;
        }
    }
}