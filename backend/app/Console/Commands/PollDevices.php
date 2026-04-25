<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\PollerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Log;

class PollDevices extends Command
{
    protected $signature = 'monitoring:poll';
    protected $description = 'Poll all active devices concurrently';

    public function handle(PollerService $poller)
    {
        $devices = Device::where('disabled', false)
            ->where('ignore', false)
            ->get();

        if ($devices->isEmpty()) {
            $this->info('No devices to poll.');
            return 0;
        }

        $this->info("Starting poll for {$devices->count()} devices...");
        $start = microtime(true);

        // Use Laravel Process pool for concurrency (max 10)
        $pool = Process::pool(function ($pool) use ($devices, $poller) {
            foreach ($devices as $device) {
                $pool->as("device_{$device->device_id}")->command(
                    sprintf(
                        'php artisan monitoring:poll:single %d',
                        $device->device_id
                    )
                );
            }
        })->concurrently(10);

        $results = $pool->wait();

        $success = 0;
        $failed = 0;
        foreach ($results as $key => $result) {
            $output = $result->output();
            $error = $result->errorOutput();
            if ($result->successful()) {
                $success++;
                Log::info("Poll result: $key - $output");
            } else {
                $failed++;
                Log::error("Poll failed: $key - $error");
            }
            $this->line("$key: " . ($result->successful() ? 'OK' : 'FAIL'));
        }

        $duration = round(microtime(true) - $start, 2);
        $this->info("Poll completed. Success: $success, Failed: $failed, Duration: {$duration}s");

        return 0;
    }
}