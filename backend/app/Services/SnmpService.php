<?php

namespace App\Services;

use App\Models\Device;
use Illuminate\Support\Facades\Log;

class SnmpService
{
    protected int $timeout = 3; // seconds
    protected int $retries = 1;

    /**
     * Ping an IP address and return alive status with latency.
     */
    public function ping(string $ip): array
    {
        $alive = false;
        $latency = null;

        // Use exec with system ping (Linux/macOS compatible)
        $cmd = sprintf('ping -c 1 -W 1 %s 2>&1', escapeshellarg($ip));
        exec($cmd, $output, $returnVar);

        if ($returnVar === 0) {
            $alive = true;
            // Extract time from output like "time=0.123 ms"
            foreach ($output as $line) {
                if (preg_match('/time[=<](\d+(\.\d+)?)\s*ms/', $line, $matches)) {
                    $latency = (float) $matches[1];
                    break;
                }
            }
        }

        // Fallback: socket connection to 161 if ping fails (optional)
        if (!$alive) {
            $start = microtime(true);
            $socket = @fsockopen($ip, 161, $errno, $errstr, 1);
            if ($socket) {
                $alive = true;
                $latency = (microtime(true) - $start) * 1000;
                fclose($socket);
            }
        }

        return ['alive' => $alive, 'latency_ms' => $latency];
    }

    /**
     * Get a single OID value.
     */
    public function get(Device $device, string $oid): mixed
    {
        try {
            $session = $this->createSnmpSession($device);
            $value = snmpget($session, $oid);
            $this->closeSession($session);
            return $value !== false ? $value : null;
        } catch (\Exception $e) {
            Log::channel('snmp')->error("SNMP get failed for device {$device->hostname}, OID $oid", [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Walk a subtree OID.
     */
    public function walk(Device $device, string $oid): array
    {
        try {
            $session = $this->createSnmpSession($device);
            $result = snmpwalk($session, $oid);
            $this->closeSession($session);
            return $result !== false ? $result : [];
        } catch (\Exception $e) {
            Log::channel('snmp')->error("SNMP walk failed for device {$device->hostname}, OID $oid", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Get system information OIDs.
     */
    public function getSystemInfo(Device $device): array
    {
        $oids = [
            'sysDescr'    => '.1.3.6.1.2.1.1.1.0',
            'sysName'     => '.1.3.6.1.2.1.1.5.0',
            'sysObjectID' => '.1.3.6.1.2.1.1.2.0',
            'sysUpTime'   => '.1.3.6.1.2.1.1.3.0',
            'sysContact'  => '.1.3.6.1.2.1.1.4.0',
        ];

        $info = [];
        foreach ($oids as $key => $oid) {
            $val = $this->get($device, $oid);
            $info[$key] = $val !== null ? trim((string) $val) : null;
        }

        // Convert uptime from hundredths of seconds to seconds
        if (isset($info['sysUpTime']) && is_numeric($info['sysUpTime'])) {
            $info['sysUpTime_seconds'] = (int) ($info['sysUpTime'] / 100);
        } else {
            $info['sysUpTime_seconds'] = null;
        }

        return $info;
    }

    /**
     * Get CPU usage percentage (integer).
     */
    public function getCpuUsage(Device $device): ?int
    {
        // Try UCD-SNMP-MIB idle percentage
        $idleOid = '.1.3.6.1.4.1.2021.11.11.0';
        $idle = $this->get($device, $idleOid);
        if (is_numeric($idle)) {
            return 100 - (int) $idle;
        }

        // Fallback: HOST-RESOURCES-MIB hrProcessorLoad (1.3.6.1.2.1.25.3.3.1.2)
        $hrLoad = $this->walk($device, '.1.3.6.1.2.1.25.3.3.1.2');
        if (!empty($hrLoad)) {
            // Take average of all processor loads if multiple CPUs
            $sum = 0;
            $count = 0;
            foreach ($hrLoad as $val) {
                if (is_numeric($val)) {
                    $sum += (int) $val;
                    $count++;
                }
            }
            return $count > 0 ? (int) round($sum / $count) : null;
        }

        return null;
    }

    /**
     * Get memory information: total, used, free, percentage.
     */
    public function getMemoryInfo(Device $device): ?array
    {
        $memTotalReal = $this->get($device, '.1.3.6.1.4.1.2021.4.5.0');  // memTotalReal (KB)
        $memAvailReal = $this->get($device, '.1.3.6.1.4.1.2021.4.6.0');  // memAvailReal (KB)
        $memTotalFree = $this->get($device, '.1.3.6.1.4.1.2021.4.11.0'); // memTotalFree (KB)

        if (!is_numeric($memTotalReal) || !is_numeric($memAvailReal) || !is_numeric($memTotalFree)) {
            return null;
        }

        $total = (int) $memTotalReal * 1024; // convert to bytes
        $free = (int) $memTotalFree * 1024;
        $used = $total - $free;
        $perc = $total > 0 ? (int) round(($used / $total) * 100) : 0;

        return [
            'total' => $total,
            'used'  => $used,
            'free'  => $free,
            'perc'  => $perc,
        ];
    }

    /**
     * Get disk information from hrStorageTable.
     */
    public function getDiskInfo(Device $device): array
    {
        $disks = [];
        try {
            $session = $this->createSnmpSession($device);

            // Walk hrStorageType to filter fixed disks
            $storageTypes = snmpwalk($session, '.1.3.6.1.2.1.25.2.3.1.2');
            if ($storageTypes === false) {
                $this->closeSession($session);
                return [];
            }

            // hrStorageFixedDisk OID: .1.3.6.1.2.1.25.2.1.4
            $fixedDiskOid = '.1.3.6.1.2.1.25.2.1.4';
            $diskIndexes = [];
            foreach ($storageTypes as $fullOid => $type) {
                if (trim($type) === $fixedDiskOid) {
                    // Extract index from OID
                    preg_match('/\.(\d+)$/', $fullOid, $matches);
                    if (isset($matches[1])) {
                        $diskIndexes[] = $matches[1];
                    }
                }
            }

            if (empty($diskIndexes)) {
                $this->closeSession($session);
                return [];
            }

            // Prepare data
            foreach ($diskIndexes as $index) {
                $descr = snmpget($session, ".1.3.6.1.2.1.25.2.3.1.3.$index");
                $allocUnits = snmpget($session, ".1.3.6.1.2.1.25.2.3.1.4.$index");
                $size = snmpget($session, ".1.3.6.1.2.1.25.2.3.1.5.$index");
                $used = snmpget($session, ".1.3.6.1.2.1.25.2.3.1.6.$index");

                if ($descr === false || $size === false || $used === false || $allocUnits === false) {
                    continue;
                }

                $allocUnits = (int) $allocUnits;
                $sizeBytes = (int) $size * $allocUnits;
                $usedBytes = (int) $used * $allocUnits;
                $freeBytes = $sizeBytes - $usedBytes;
                $perc = $sizeBytes > 0 ? (int) round(($usedBytes / $sizeBytes) * 100) : 0;

                $disks[] = [
                    'index'      => $index,
                    'descr'      => trim((string) $descr),
                    'size_bytes' => $sizeBytes,
                    'used_bytes' => $usedBytes,
                    'free_bytes' => $freeBytes,
                    'perc'       => $perc,
                ];
            }

            $this->closeSession($session);
        } catch (\Exception $e) {
            Log::channel('snmp')->error("Failed to get disk info for device {$device->hostname}", [
                'error' => $e->getMessage()
            ]);
        }

        return $disks;
    }

    /**
     * Get network interfaces from ifTable.
     */
    public function getInterfaces(Device $device): array
    {
        $interfaces = [];
        try {
            $session = $this->createSnmpSession($device);
            $ifIndexes = snmpwalk($session, '.1.3.6.1.2.1.2.2.1.1');
            if ($ifIndexes === false) {
                $this->closeSession($session);
                return [];
            }

            foreach ($ifIndexes as $fullOid => $index) {
                $index = (int) $index;
                $descr = snmpget($session, ".1.3.6.1.2.1.2.2.1.2.$index");
                $type = snmpget($session, ".1.3.6.1.2.1.2.2.1.3.$index");
                $speed = snmpget($session, ".1.3.6.1.2.1.2.2.1.5.$index");
                $adminStatus = snmpget($session, ".1.3.6.1.2.1.2.2.1.7.$index");
                $operStatus = snmpget($session, ".1.3.6.1.2.1.2.2.1.8.$index");

                $interfaces[] = [
                    'ifIndex'       => $index,
                    'ifName'        => trim((string) $descr),
                    'ifDescr'       => trim((string) $descr),
                    'ifType'        => (int) $type,
                    'ifSpeed'       => is_numeric($speed) ? (int) $speed : 0,
                    'ifAdminStatus' => trim((string) $adminStatus),
                    'ifOperStatus'  => trim((string) $operStatus),
                ];
            }

            $this->closeSession($session);
        } catch (\Exception $e) {
            Log::channel('snmp')->error("Failed to get interfaces for device {$device->hostname}", [
                'error' => $e->getMessage()
            ]);
        }

        return $interfaces;
    }

    /**
     * Get interface counters (in/out octets).
     */
    public function getInterfaceCounters(Device $device, int $ifIndex): ?array
    {
        $inOid = ".1.3.6.1.2.1.2.2.1.10.$ifIndex";
        $outOid = ".1.3.6.1.2.1.2.2.1.16.$ifIndex";

        $in = $this->get($device, $inOid);
        $out = $this->get($device, $outOid);

        if (!is_numeric($in) || !is_numeric($out)) {
            return null;
        }

        return [
            'in_octets'  => (int) $in,
            'out_octets' => (int) $out,
        ];
    }

    /**
     * Create SNMP session based on device credentials.
     */
    protected function createSnmpSession(Device $device)
    {
        $version = $device->snmpver === 'v3' ? SNMP_VERSION_3 : ($device->snmpver === 'v2c' ? SNMP_VERSION_2c : SNMP_VERSION_1);
        $port = $device->port ?: 161;
        $transport = $device->transport ?: 'udp';

        // Build SNMP session string
        $host = "{$transport}:{$device->ip}:{$port}";

        // For now v3 is stub, just use v2c
        if ($version === SNMP_VERSION_3) {
            // Not implemented, fallback to v2c
            $version = SNMP_VERSION_2c;
        }

        $session = snmp_init($host, $device->community, $this->timeout, $this->retries, $version);
        if (!$session) {
            throw new \Exception("Failed to initialize SNMP session for {$device->hostname}");
        }

        // Set quick print for numeric output
        snmp_set_quick_print(1);
        snmp_set_enum_print(0);
        snmp_set_oid_output_format(SNMP_OID_OUTPUT_NUMERIC);

        return $session;
    }

    protected function closeSession($session): void
    {
        if ($session) {
            snmp_close($session);
        }
    }
}