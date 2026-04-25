<?php

namespace App\Providers;

use App\Services\SnmpService;
use App\Services\PollerService;
use App\Services\AlertService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SnmpService::class, fn ($app) => new SnmpService());
        $this->app->singleton(AlertService::class, fn ($app) => new AlertService());
        $this->app->singleton(PollerService::class, function ($app) {
            return new PollerService(
                $app->make(SnmpService::class),
                $app->make(AlertService::class)
            );
        });
    }

    public function boot(): void
    {
        //
    }
}