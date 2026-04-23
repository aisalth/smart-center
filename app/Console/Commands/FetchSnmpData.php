<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SnmpClient;
use Illuminate\Support\Facades\DB;
use App\Models\Device;

class FetchSnmpData extends Command
{
    protected $signature = 'snmp:fetch';
    protected $description = 'Ambil data SNMP semua device aktif tiap menit dan simpan history';

    public function handle(SnmpClient $snmp)
    {
        $devices = Device::where('status', 1)->get();

        if ($devices->isEmpty()) {
            $this->warn('Tidak ada device aktif.');
            return;
        }

        foreach ($devices as $device) {
            try {
                $snmp->setHost($device->hostname)
                     ->setPort($device->port)
                     ->setCommunity($device->community ?? 'public');

                $hostname   = $snmp->get('1.3.6.1.2.1.1.5.0');
                $uptimeRaw  = $snmp->get('1.3.6.1.2.1.1.3.0');
                $cpuUser    = $snmp->get('1.3.6.1.4.1.2021.11.9.0');
                $cpuSystem  = $snmp->get('1.3.6.1.4.1.2021.11.10.0');
                $cpuIdle    = $snmp->get('1.3.6.1.4.1.2021.11.11.0');
                $ramTotal   = $snmp->get('1.3.6.1.4.1.2021.4.5.0');
                $ramUsed    = $snmp->get('1.3.6.1.4.1.2021.4.6.0');

                $uptimeNumeric = $this->parseUptime($uptimeRaw);
                $cpuUsage = 100 - (int)$cpuIdle;

                // 1. Simpan history ke tabel snmp_data (setiap menit)
                DB::table('snmp_data')->insert([
                    'hostname'   => $hostname,
                    'uptime'     => $uptimeRaw,
                    'cpu_user'   => $cpuUser,
                    'cpu_system' => $cpuSystem,
                    'cpu_idle'   => $cpuIdle,
                    'ram_total'  => $ramTotal,
                    'ram_used'   => $ramUsed,
                    'fetched_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // 2. Update devices (uptime, last_polled)
                $device->update([
                    'uptime'      => $uptimeNumeric,
                    'last_polled' => now(),
                ]);

                // 3. Update atau insert processors
                $processor = DB::table('processors')->where('device_id', $device->device_id)->first();
                if ($processor) {
                    DB::table('processors')->where('processor_id', $processor->processor_id)->update([
                        'processor_usage' => $cpuUsage,
                        'updated_at'      => now(),
                    ]);
                } else {
                    DB::table('processors')->insert([
                        'device_id'         => $device->device_id,
                        'processor_index'   => '1',
                        'entPhysicalIndex'  => 0,
                        'hrDeviceIndex'     => 0,
                        'processor_oid'     => '',
                        'processor_usage'   => $cpuUsage,
                        'processor_descr'   => 'CPU',
                        'processor_type'    => 'ucd',
                        'processor_precision' => 1,
                        'processor_perc_warn' => 90,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }

                // 4. Update atau insert storage (RAM)
                $ramTotalInt = (int)$ramTotal;
                $ramUsedInt  = (int)$ramUsed;
                $ramFreeInt  = $ramTotalInt - $ramUsedInt;
                $ramPerc     = $ramTotalInt ? round(($ramUsedInt / $ramTotalInt) * 100) : 0;

                $storage = DB::table('storage')
                    ->where('device_id', $device->device_id)
                    ->where('storage_descr', 'RAM')
                    ->first();
                if ($storage) {
                    DB::table('storage')->where('storage_id', $storage->storage_id)->update([
                        'storage_size' => $ramTotalInt,
                        'storage_used' => $ramUsedInt,
                        'storage_free' => $ramFreeInt,
                        'storage_perc' => $ramPerc,
                        'updated_at'   => now(),
                    ]);
                } else {
                    DB::table('storage')->insert([
                        'device_id'         => $device->device_id,
                        'type'              => 'ram',
                        'storage_index'     => '1',
                        'storage_type'      => 'ram',
                        'storage_descr'     => 'RAM',
                        'storage_size'      => $ramTotalInt,
                        'storage_used'      => $ramUsedInt,
                        'storage_free'      => $ramFreeInt,
                        'storage_perc'      => $ramPerc,
                        'storage_perc_warn' => 90,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }

                $this->info("Data device {$device->hostname} tersimpan.");

            } catch (\Exception $e) {
                $this->error("Gagal polling {$device->hostname}: " . $e->getMessage());
                $device->update([
                    'status_reason'       => substr($e->getMessage(), 0, 50),
                    'last_poll_attempted' => now(),
                ]);
            }
        }
    }

    private function parseUptime($uptimeString)
    {
        if (preg_match('/\((\d+)\)/', $uptimeString, $matches)) {
            return (int) $matches[1];
        }
        return is_numeric($uptimeString) ? (int) $uptimeString : 0;
    }
}