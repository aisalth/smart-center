<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

class MonitoringApiService
{
    protected string $baseUrl;

    public function __construct(string $baseUrl = null)
    {
        $this->baseUrl = $baseUrl ?? config('monitoring.api_base_url');
    }

    public function fetchAll(): array
    {
        $response = Http::retry(3, 200)
            ->timeout(15)
            ->get($this->baseUrl);

        if ($response->failed() || $response->json('success') !== true) {
            throw new Exception("Gagal mengambil data dari Monitoring API ({$this->baseUrl}): " . $response->body());
        }

        return $response->json('data');
    }

    public function fetchProcesses(int $limit = 10): array
    {
        $response = Http::retry(3, 200)
            ->timeout(10)
            ->get("{$this->baseUrl}/processes", ['limit' => $limit]);

        if ($response->failed() || $response->json('success') !== true) {
            throw new Exception("Gagal mengambil proses dari Monitoring API");
        }

        return $response->json('data');
    }

    public function fetchNetwork(): array
    {
        $response = Http::retry(2, 200)
            ->timeout(10)
            ->get("{$this->baseUrl}/network");

        if ($response->failed() || $response->json('success') !== true) {
            \Illuminate\Support\Facades\Log::warning("Gagal fetch API /network ({$this->baseUrl}): " . $response->body());
            return [];
        }

        return $response->json('data') ?? [];
    }
}