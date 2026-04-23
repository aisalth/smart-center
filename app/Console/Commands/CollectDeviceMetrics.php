<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Device;
use App\Models\DeviceMetric;

class CollectDeviceMetrics extends Command
{
    protected $signature = 'metrics:collect';
    protected $description = 'Kumpulkan metrics untuk semua device (insert dummy setiap menit)';

    public function handle()
    {
        $devices = Device::where('status', 1)->get();

        if ($devices->isEmpty()) {
            $this->warn('Tidak ada device aktif.');
            return;
        }

        foreach ($devices as $device) {
            // Generate dummy data
            $cpuIdle = rand(10, 90);  // idle 10-90 -> usage 10-90
            $ramTotal = 8000000;      // dummy 8GB
            $ramUsed  = rand(2000000, 6000000);
            $uptime   = rand(100000, 9999999);

            // Insert ke snmp_data (history)
            DeviceMetric::create([
                'hostname'   => $device->hostname,
                'uptime'     => '(' . $uptime . ')',
                'cpu_user'   => rand(1, 50),
                'cpu_system' => rand(1, 50),
                'cpu_idle'   => $cpuIdle,
                'ram_total'  => $ramTotal,
                'ram_used'   => $ramUsed,
                'fetched_at' => now(),
            ]);

            // Update device uptime dan last_polled (opsional)
            $device->update([
                'uptime'      => $uptime,
                'last_polled' => now(),
            ]);

            $this->info("Metrics collected for {$device->hostname}");
        }

        $this->info('Selesai mengumpulkan metrics.');
    }
}