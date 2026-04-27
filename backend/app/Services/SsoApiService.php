<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SsoApiService
{
    protected string $baseUrl;

    public function __construct()
    {
        // Memastikan tidak ada trailing slash di akhir URL
        $this->baseUrl = rtrim(config('sso.base_url'), '/');
    }

    /**
     * Helper HTTP Request murni tanpa Authorization header
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        $url = $this->baseUrl . $endpoint;
        
        try {
            $response = Http::acceptJson()->$method($url, $data);

            if ($response->failed()) {
                // SEMENTARA KITA UBAH BAGIAN INI UNTUK DEBUGGING
                return [    
                    'debug_error' => true,
                    'status_code' => $response->status(),
                    'sso_response' => $response->json() ?? $response->body()
                ];
            }

            return $response->json() ?? [];
        } catch (\Exception $e) {
            // Tampilkan error jika Laravel bahkan gagal menghubungi server
            return [
                'debug_error' => true,
                'message' => 'Gagal koneksi ke SSO: ' . $e->getMessage()
            ];
        }
    }

    public function getUsers(): array
    {
        return $this->makeRequest('get', '/api/users');
    }

    public function getUserById(string $id): ?array
    {
        $response = $this->makeRequest('get', "/api/users/{$id}");
        return empty($response) ? null : $response;
    }

    public function getRegisters(): array
    {
        return $this->makeRequest('get', '/api/registers');
    }

    public function getLogins(): array
    {
        return $this->makeRequest('get', '/api/logins');
    }

    public function validateToken(string $token): array
    {
        return $this->makeRequest('post', '/api/validate-token', ['token' => $token]);
    }

    public function postActivity(string $userId, string $action, array $meta): array
    {
        return $this->makeRequest('post', '/api/activity', [
            'userId' => $userId,
            'action' => $action,
            'meta' => $meta
        ]);
    }

    public function updateLastActive(string $userId): array
    {
        return $this->makeRequest('post', '/api/last-active', ['userId' => $userId]);
    }

    public function getActiveUsers(): array
    {
        return $this->makeRequest('get', '/api/active-users');
    }

    public function getActiveUsersDetail(): array
    {
        return $this->makeRequest('get', '/api/active-users/detail');
    }

    public function getUserAnalytics(): array
    {
        return $this->makeRequest('get', '/api/analytics/users');
    }
}