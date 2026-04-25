<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\PollerService;
use Illuminate\Console\Command;

class PollSingleDevice extends Command
{
    protected $signature = 'monitoring:poll:single {device_id}';
    protected $description = 'Poll a single device (used internally for concurrency)';

    public function handle(PollerService $poller)
    {
        $deviceId = $this->argument('device_id');
        $device = Device::find($deviceId);
        if (!$device) {
            $this->error("Device $deviceId not found.");
            return 1;
        }

        $result = $poller->pollDevice($device);
        $this->info(json_encode($result));
        return 0;
    }
}