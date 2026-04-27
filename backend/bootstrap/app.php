<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;
use App\Console\Commands\PollDevices;
use App\Console\Commands\PollSingleDevice;
use App\Console\Commands\PruneMonitoringData;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(\App\Http\Middleware\ForceJsonTimezone::class);
    })
    ->booting(function () {
        date_default_timezone_set('Asia/Jakarta');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->withCommands([
        PollDevices::class,
        PollSingleDevice::class,
        PruneMonitoringData::class,
    ])
    ->withSchedule(function (Schedule $schedule) {
        // Schedule already defined in routes/console.php, but we can also put here
        require __DIR__.'/../routes/console.php';
    })
    ->create();