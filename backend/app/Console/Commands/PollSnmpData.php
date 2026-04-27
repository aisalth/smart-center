<?php
// app/Console/Commands/PollSnmpData.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Device;
use App\Services\SnmpService;

class PollSnmpData extends Command
{
    protected $signature = 'snmp:poll';
    protected $description = 'Poll SNMP data for all active devices';

    public function handle(SnmpService $snmpService)
    {
        $devices = Device::where('disabled', 0)
            ->where('ignore', 0)
            ->where('snmp_disable', 0)
            ->get();

        foreach ($devices as $device) {
            $this->info("Polling {$device->hostname} ({$device->ip})...");
            $snmpService->pollDevice($device);
        }
        
        $this->info("Polling complete.");
    }
}