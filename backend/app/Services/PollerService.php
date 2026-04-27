<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Port;
use App\Models\PortTraffic;
use App\Models\Processor;
use App\Models\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PollerService
{
    protected SnmpService $snmp;
    protected AlertService $alert;

    public function __construct(SnmpService $snmp, AlertService $alert)
    {
        $this->snmp = $snmp;
        $this->alert = $alert;
    }

    /**
     * Orchestrate full polling of a device.
     */
    public function pollDevice(Device $device): array
    {
        $start = microtime(true);
        $errors = [];

        // a. Ping
        $ping = $this->snmp->ping($device->ip);
        $device->status = $ping['alive'];
        $device->last_ping = now();
        $device->last_ping_timetaken = $ping['latency_ms'];

        if (!$ping['alive']) {
            $device->save();
            $this->alert->evaluateDevice($device);
            return [
                'device_id'    => $device->device_id,
                'status'       => false,
                'duration_ms'  => round((microtime(true) - $start) * 1000, 2),
                'errors'       => ['Device unreachable'],
            ];
        }

        // b. SNMP polling starts
        try {
            // c. System info
            $sysInfo = $this->snmp->getSystemInfo($device);
            if (!empty($sysInfo['sysDescr'])) {
                $device->sysDescr = $sysInfo['sysDescr'];
                $device->sysName = $sysInfo['sysName'];
                $device->uptime = $sysInfo['sysUpTime_seconds'];
                // Attempt to deduce OS and version from sysDescr (simplified)
                $this->guessOsAndVersion($device, $sysInfo['sysDescr']);
            } else {
                $errors[] = 'Failed to retrieve system info';
            }

            // d. CPU usage
            $cpuUsage = $this->snmp->getCpuUsage($device);
            if ($cpuUsage !== null) {
                $processor = Processor::updateOrCreate(
                    ['device_id' => $device->device_id, 'processor_index' => 0],
                    [
                        'processor_type'   => 'CPU',
                        'processor_descr'  => 'Processor',
                        'processor_usage'  => $cpuUsage,
                        'processor_perc_warn' => $device->processors()->first()?->processor_perc_warn ?? 80,
                    ]
                );
            } else {
                $errors[] = 'CPU usage not available';
            }

            // e. Memory
            $memInfo = $this->snmp->getMemoryInfo($device);
            if ($memInfo) {
                Storage::updateOrCreate(
                    ['device_id' => $device->device_id, 'type' => 'ram', 'storage_index' => 0],
                    [
                        'storage_descr'   => 'Physical Memory',
                        'storage_size'    => $memInfo['total'],
                        'storage_used'    => $memInfo['used'],
                        'storage_free'    => $memInfo['free'],
                        'storage_perc'    => $memInfo['perc'],
                        'storage_perc_warn' => $device->storages()->where('type', 'ram')->first()?->storage_perc_warn ?? 80,
                    ]
                );
            } else {
                $errors[] = 'Memory info not available';
            }

            // f. Disks
            $disks = $this->snmp->getDiskInfo($device);
            foreach ($disks as $disk) {
                Storage::updateOrCreate(
                    ['device_id' => $device->device_id, 'type' => 'disk', 'storage_index' => $disk['index']],
                    [
                        'storage_descr'   => $disk['descr'],
                        'storage_size'    => $disk['size_bytes'],
                        'storage_used'    => $disk['used_bytes'],
                        'storage_free'    => $disk['free_bytes'],
                        'storage_perc'    => $disk['perc'],
                        'storage_perc_warn' => $device->storages()
                            ->where('type', 'disk')
                            ->where('storage_index', $disk['index'])
                            ->first()?->storage_perc_warn ?? 80,
                    ]
                );
            }

            // g. Interfaces
            $interfaces = $this->snmp->getInterfaces($device);
            $currentPortIds = [];
            foreach ($interfaces as $iface) {
                $port = Port::updateOrCreate(
                    ['device_id' => $device->device_id, 'ifIndex' => $iface['ifIndex']],
                    [
                        'ifName'        => $iface['ifName'],
                        'ifDescr'       => $iface['ifDescr'],
                        'ifType'        => $iface['ifType'],
                        'ifSpeed'       => $iface['ifSpeed'],
                        'ifAdminStatus' => $iface['ifAdminStatus'],
                        'ifOperStatus'  => $iface['ifOperStatus'],
                    ]
                );
                $currentPortIds[] = $port->port_id;

                // h. Traffic counters
                $counters = $this->snmp->getInterfaceCounters($device, $iface['ifIndex']);
                if ($counters) {
                    $previousTraffic = PortTraffic::where('port_id', $port->port_id)
                        ->orderBy('timestamp', 'desc')
                        ->first();

                    $inRate = 0;
                    $outRate = 0;
                    $timestamp = now();

                    if ($previousTraffic) {
                        $interval = $timestamp->diffInSeconds($previousTraffic->timestamp);
                        if ($interval > 0) {
                            $inRate = $this->calculateRate(
                                $counters['in_octets'],
                                $previousTraffic->in_octets,
                                $interval
                            );
                            $outRate = $this->calculateRate(
                                $counters['out_octets'],
                                $previousTraffic->out_octets,
                                $interval
                            );
                        }
                    }

                    PortTraffic::create([
                        'port_id'    => $port->port_id,
                        'timestamp'  => $timestamp,
                        'in_octets'  => $counters['in_octets'],
                        'out_octets' => $counters['out_octets'],
                        'in_rate'    => $inRate,
                        'out_rate'   => $outRate,
                    ]);
                } else {
                    $errors[] = "Failed to get counters for port {$iface['ifName']}";
                }
            }

            // Remove ports no longer present (optional, but careful)
            // Port::where('device_id', $device->device_id)->whereNotIn('port_id', $currentPortIds)->delete();

        } catch (\Exception $e) {
            Log::error("Polling error for device {$device->hostname}: " . $e->getMessage());
            $errors[] = "Exception: " . $e->getMessage();
        }

        // Final updates
        $device->last_polled = now();
        $device->save();

        // Evaluate alerts
        $this->alert->evaluateDevice($device);

        $duration = round((microtime(true) - $start) * 1000, 2);

        return [
            'device_id'    => $device->device_id,
            'status'       => $device->status,
            'duration_ms'  => $duration,
            'errors'       => $errors,
        ];
    }

    public function calculateRate(int $current, int $previous, int $intervalSeconds): int
    {
        $max32 = 4294967295;
        $max64 = 18446744073709551615;

        // Assume 64-bit counters are common nowadays
        $max = $max64;
        if ($current < $previous) {
            // Counter wrapped
            $delta = ($max - $previous) + $current + 1;
        } else {
            $delta = $current - $previous;
        }

        // bytes per second * 8 = bits per second
        return (int) (($delta * 8) / $intervalSeconds);
    }

    /**
     * Simple OS and version guess from sysDescr.
     */
    protected function guessOsAndVersion(Device $device, ?string $sysDescr): void
    {
        if (!$sysDescr) return;
        $descr = strtolower($sysDescr);
        if (str_contains($descr, 'linux')) {
            $device->os = 'Linux';
        } elseif (str_contains($descr, 'windows')) {
            $device->os = 'Windows';
        } elseif (str_contains($descr, 'cisco')) {
            $device->os = 'Cisco IOS';
        } elseif (str_contains($descr, 'juniper')) {
            $device->os = 'Juniper';
        } elseif (str_contains($descr, 'freebsd')) {
            $device->os = 'FreeBSD';
        }
        // Extract version using regex if needed (not implemented fully)
    }
}