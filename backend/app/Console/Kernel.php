<?php

namespace App\Console;

use App\Jobs\PollMonitoringApiJob;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        $schedule->job(new PollMonitoringApiJob, 'monitoring')
                 ->everyMinute()
                 ->withoutOverlapping(2)
                 ->onFailure(function () {
                     Log::error('PollMonitoringApiJob failed in scheduler');
                 });
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
        require base_path('routes/console.php');
    }
}