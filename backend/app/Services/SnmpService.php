<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Port;
use App\Models\PortTraffic;
use App\Models\Processor;
use App\Models\Storage;
use Illuminate\Support\Facades\Log;

class SnmpService
{
    private int $timeout = 2000000;
    private int $retries = 1;

    public function testConnection(Device $device): bool
    {
        try {
            $result = @snmpget($device->ip, $device->community, '.1.3.6.1.2.1.1.3.0', $this->timeout, $this->retries);
            return $result !== false;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function getUptime(Device $device): ?int
    {
        try {
            $raw = @snmpget($device->ip, $device->community, '.1.3.6.1.2.1.1.3.0', $this->timeout, $this->retries);
            if (!$raw) return null;
            preg_match('/\((\d+)\)/', $raw, $matches);
            return isset($matches[1]) ? (int)($matches[1] / 100) : null;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function getSysInfo(Device $device): array
    {
        $info = [];
        try {
            $oids = [
                'sysDescr' => '.1.3.6.1.2.1.1.1.0',
                'sysName'  => '.1.3.6.1.2.1.1.5.0',
            ];
            foreach ($oids as $key => $oid) {
                $raw = @snmpget($device->ip, $device->community, $oid, $this->timeout, $this->retries);
                if ($raw !== false) {
                    $info[$key] = $this->parseSnmpValue($raw);
                }
            }
        } catch (\Exception $e) {
            Log::warning("SNMP getSysInfo failed for {$device->hostname}: " . $e->getMessage());
        }
        return $info;
    }

    public function pollCpu(Device $device): void
{
    try {
        // Ambil CPU idle, lalu hitung usage = 100 - idle
        $idleRaw = @snmpget($device->ip, $device->community, '.1.3.6.1.4.1.2021.11.11.0', $this->timeout, $this->retries);
        $userRaw = @snmpget($device->ip, $device->community, '.1.3.6.1.4.1.2021.11.9.0', $this->timeout, $this->retries);
        $sysRaw  = @snmpget($device->ip, $device->community, '.1.3.6.1.4.1.2021.11.10.0', $this->timeout, $this->retries);

        if ($idleRaw === false) return;

        $idle  = (int) $this->parseSnmpValue($idleRaw);
        $user  = $userRaw !== false ? (int) $this->parseSnmpValue($userRaw) : 0;
        $sys   = $sysRaw  !== false ? (int) $this->parseSnmpValue($sysRaw)  : 0;
        $usage = max(0, min(100, 100 - $idle));

        Processor::updateOrCreate(
            [
                'device_id'       => $device->device_id,
                'processor_index' => '1',
            ],
            [
                'processor_type'  => 'cpu',
                'processor_descr' => 'CPU',
                'processor_usage' => $usage,
            ]
        );
    } catch (\Exception $e) {
        Log::warning("SNMP pollCpu failed for {$device->hostname}: " . $e->getMessage());
    }
    }

    public function pollStorage(Device $device): void
    {
        try {
            $storageDescr = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.25.2.3.1.3', $this->timeout, $this->retries);
            $storageSize  = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.25.2.3.1.5', $this->timeout, $this->retries);
            $storageUsed  = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.25.2.3.1.6', $this->timeout, $this->retries);
            $storageUnit  = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.25.2.3.1.4', $this->timeout, $this->retries);

            if (!$storageDescr || !$storageSize || !$storageUsed) return;

            foreach ($storageDescr as $i => $descrRaw) {
                $descr = $this->parseSnmpValue($descrRaw);
                $descrLower = strtolower($descr);

                // Tentukan tipe: memory atau disk
                $isMemory = in_array($descrLower, ['physical memory', 'virtual memory', 'swap space']);
                $isDisk   = str_starts_with($descr, '/') && !in_array($descr, ['/run', '/dev/shm', '/run/lock']) && !str_starts_with($descr, '/run/');

                if (!$isMemory && !$isDisk) continue;

                $unit  = isset($storageUnit[$i]) ? (int) $this->parseSnmpValue($storageUnit[$i]) : 1;
                $size  = isset($storageSize[$i]) ? (int) $this->parseSnmpValue($storageSize[$i]) * $unit : 0;
                $used  = isset($storageUsed[$i]) ? (int) $this->parseSnmpValue($storageUsed[$i]) * $unit : 0;
                $free  = max(0, $size - $used);
                $perc  = $size > 0 ? (int) round(($used / $size) * 100) : 0;
                $type  = $isMemory ? 'memory' : 'disk';
                $index = (string) ($i + 1);

                Storage::updateOrCreate(
                    [
                        'device_id'     => $device->device_id,
                        'type'          => $type,
                        'storage_index' => $index,
                    ],
                    [
                        'storage_descr' => $descr,
                        'storage_size'  => $size,
                        'storage_used'  => $used,
                        'storage_free'  => $free,
                        'storage_perc'  => $perc,
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning("SNMP pollStorage failed for {$device->hostname}: " . $e->getMessage());
        }
    }

    public function pollPorts(Device $device): void
    {
        try {
            $ifIndex     = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.1', $this->timeout, $this->retries);
            $ifDescr     = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.2', $this->timeout, $this->retries);
            $ifType      = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.3', $this->timeout, $this->retries);
            $ifSpeed     = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.5', $this->timeout, $this->retries);
            $ifAdminStat = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.7', $this->timeout, $this->retries);
            $ifOperStat  = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.8', $this->timeout, $this->retries);
            $ifInOctets  = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.10', $this->timeout, $this->retries);
            $ifOutOctets = @snmpwalk($device->ip, $device->community, '.1.3.6.1.2.1.2.2.1.16', $this->timeout, $this->retries);

            if (!$ifIndex) return;

            foreach ($ifIndex as $i => $idxRaw) {
                $idx = (int) $this->parseSnmpValue($idxRaw);

                $port = Port::updateOrCreate(
                    ['device_id' => $device->device_id, 'ifIndex' => $idx],
                    [
                        'ifDescr'       => isset($ifDescr[$i])     ? $this->parseSnmpValue($ifDescr[$i]) : null,
                        'ifName'        => isset($ifDescr[$i])     ? $this->parseSnmpValue($ifDescr[$i]) : null,
                        'ifType'        => isset($ifType[$i])      ? $this->parseSnmpValue($ifType[$i]) : null,
                        'ifSpeed'       => isset($ifSpeed[$i])     ? (int) $this->parseSnmpValue($ifSpeed[$i]) : null,
                        'ifAdminStatus' => isset($ifAdminStat[$i]) ? ($this->parseSnmpValue($ifAdminStat[$i]) == '1' ? 'up' : 'down') : null,
                        'ifOperStatus'  => isset($ifOperStat[$i])  ? ($this->parseSnmpValue($ifOperStat[$i]) == '1' ? 'up' : 'down') : null,
                    ]
                );

                $inOctets  = isset($ifInOctets[$i])  ? (int) $this->parseSnmpValue($ifInOctets[$i]) : 0;
                $outOctets = isset($ifOutOctets[$i]) ? (int) $this->parseSnmpValue($ifOutOctets[$i]) : 0;

                $last    = PortTraffic::where('port_id', $port->port_id)->latest('timestamp')->first();
                $inRate  = null;
                $outRate = null;

                if ($last) {
                    $seconds = max(1, now()->diffInSeconds($last->timestamp));
                    $inRate  = max(0, (int)(($inOctets - $last->in_octets) / $seconds));
                    $outRate = max(0, (int)(($outOctets - $last->out_octets) / $seconds));
                }

                PortTraffic::create([
                    'port_id'    => $port->port_id,
                    'timestamp'  => now(),
                    'in_octets'  => $inOctets,
                    'out_octets' => $outOctets,
                    'in_rate'    => $inRate,
                    'out_rate'   => $outRate,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning("SNMP pollPorts failed for {$device->hostname}: " . $e->getMessage());
        }
    }

    public function pollDevice(Device $device): bool
    {
        if (!$this->testConnection($device)) {
            $device->update(['status' => 0, 'status_reason' => 'snmp']);
            return false;
        }

        $uptime  = $this->getUptime($device);
        $sysInfo = $this->getSysInfo($device);

        $device->update([
            'status'        => 1,
            'status_reason' => '',
            'uptime'        => $uptime,
            'last_polled'   => now(),
            'sysDescr'      => $sysInfo['sysDescr'] ?? $device->sysDescr,
            'sysName'       => $sysInfo['sysName']  ?? $device->sysName,
        ]);

        $this->pollCpu($device);
        $this->pollStorage($device);
        $this->pollPorts($device);

        return true;
    }

    /**
     * Parse nilai mentah SNMP, hapus prefix type dan tanda kutip
     * Contoh:
     *   STRING: "value"   → value
     *   INTEGER: 42       → 42
     *   "0.00"            → 0.00
     *   Gauge32: 1000     → 1000
     */
    private function parseSnmpValue(string $raw): string
    {
        $raw = trim($raw);

        // Ada prefix type seperti "STRING: ..." atau "INTEGER: ..."
        if (preg_match('/^[A-Za-z0-9\-]+:\s*(.+)$/', $raw, $matches)) {
            $raw = trim($matches[1]);
        }

        // Hapus tanda kutip di awal/akhir
        $raw = trim($raw, '"');

        return $raw;
    }
}