<?php

// use App\Console\Commands\PollDevices;
// use App\Console\Commands\PruneMonitoringData;
use Illuminate\Support\Facades\Schedule;
use App\Models\DockerHost;
use App\Jobs\PollDockerHostJob;

// Scheduler untuk Polling Docker Host setiap 1 menit
Schedule::call(function () {
    // Ambil hanya host yang aktif (disabled = 0)
    $hosts = DockerHost::where('disabled', 0)->get();
    
    foreach ($hosts as $host) {
        PollDockerHostJob::dispatch($host);
    }
})
->everyMinute()
->name('poll-docker-hosts') // <-- TAMBAHKAN INI DI SINI
->withoutOverlapping();
// Schedule::command(PollDevices::class)->everyMinute()->withoutOverlapping();
// Schedule::command(PruneMonitoringData::class)->daily();