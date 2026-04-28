<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;
use App\Jobs\PollMonitoringApiJob;

// ── Poll ibra (qode.my.id) ──
Schedule::job(new PollMonitoringApiJob('ibra'), 'monitoring')
    ->everyMinute()
    ->name('poll-monitoring-ibra')
    ->withoutOverlapping(2)
    ->onFailure(function () {
        Log::error('PollMonitoringApiJob [ibra] failed in scheduler');
    });

// ── Poll alzaki (41.216.191.42:3000) ──
Schedule::job(new PollMonitoringApiJob('alzaki'), 'monitoring')
    ->everyMinute()
    ->name('poll-monitoring-alzaki')
    ->withoutOverlapping(2)
    ->skip(fn () => empty(config('monitoring.targets.alzaki.api_base_url')))
    ->onFailure(function () {
        Log::error('PollMonitoringApiJob [alzaki] failed in scheduler');
    });


Schedule::command('snmp:poll')
    ->everyMinute()
    ->withoutOverlapping(2)
    ->onFailure(function () {
        Log::error('SNMP Poll failed in scheduler');
    });

Schedule::call(function () {
    $deleted = DB::table('container_metrics')
                 ->where('timestamp', '<', now()->subDays(30))
                 ->delete();
                 
    Log::info("Membersihkan database: {$deleted} baris container_metrics lama dihapus.");
})->dailyAt('02:00');

Schedule::call(function () {
    $deleted = DB::table('snmp_metrics_history')
                 ->where('recorded_at', '<', now()->subDays(30))
                 ->delete();
                 
    Log::info("Cleanup: {$deleted} baris snmp_metrics_history lama dihapus.");
})->dailyAt('02:30');