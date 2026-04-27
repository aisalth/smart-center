<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;
use App\Jobs\PollMonitoringApiJob;

Schedule::job(new PollMonitoringApiJob, 'monitoring')
    ->everyMinute()
    ->withoutOverlapping(2)
    ->onFailure(function () {
        Log::error('PollMonitoringApiJob failed in scheduler');
    });

Schedule::call(function () {
    $deleted = DB::table('container_metrics')
                 ->where('timestamp', '<', now()->subDays(30))
                 ->delete();
                 
    Log::info("Membersihkan database: {$deleted} baris container_metrics lama dihapus.");
})->dailyAt('02:00');

Schedule::call(function () {
    $deleted = DB::table('container_metrics')
                 ->where('timestamp', '<', now()->subDays(30))
                 ->delete();
                 
    \Log::info("Membersihkan database: {$deleted} baris container_metrics lama dihapus.");
})->dailyAt('02:00');