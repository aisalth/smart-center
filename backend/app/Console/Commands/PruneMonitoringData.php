<?php

namespace App\Console\Commands;

use App\Models\PortTraffic;
use App\Models\AlertLog;
use Illuminate\Console\Command;

class PruneMonitoringData extends Command
{
    protected $signature = 'monitoring:prune';
    protected $description = 'Delete old monitoring data';

    public function handle()
    {
        // Delete port_traffic older than 30 days
        $cutoffTraffic = now()->subDays(30);
        $trafficDeleted = PortTraffic::where('timestamp', '<', $cutoffTraffic)->delete();
        $this->info("Deleted $trafficDeleted traffic records.");

        // Delete alerts_log older than 90 days
        $cutoffLogs = now()->subDays(90);
        $logsDeleted = AlertLog::where('time_logged', '<', $cutoffLogs)->delete();
        $this->info("Deleted $logsDeleted alert log records.");

        return 0;
    }
}