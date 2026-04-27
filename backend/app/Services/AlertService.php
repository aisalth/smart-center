<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\AlertLog;
use App\Models\Device;

class AlertService
{
    public function evaluateDevice(Device $device): void
    {
        $this->evaluateRule1($device);

        // Rule 2: CPU Warning
        $this->evaluateRule2($device);

        // Rule 3: Memory Warning
        $this->evaluateRule3($device);

        // Rule 4: Disk Warning
        $this->evaluateRule4($device);

        // Rule 5: Port Down
        $this->evaluateRule5($device);
    }

    protected function evaluateRule1(Device $device): void
    {
        $ruleId = 1;
        $condition = !$device->status;
        $existingAlert = Alert::where('device_id', $device->device_id)
            ->where('rule_id', $ruleId)
            ->first();

        if ($condition) {
            if (!$existingAlert || $existingAlert->state == 0) {
                Alert::updateOrCreate(
                    ['device_id' => $device->device_id, 'rule_id' => $ruleId],
                    [
                        'state'     => 1,
                        'open'      => 1,
                        'alerted'   => 1,
                        'timestamp' => now(),
                    ]
                );
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 1,
                    'details'     => json_encode(['message' => 'Device down']),
                    'time_logged' => now(),
                ]);
            }
        } else {
            if ($existingAlert && $existingAlert->state == 1) {
                $existingAlert->update(['state' => 0, 'open' => 0]);
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 0,
                    'details'     => json_encode(['message' => 'Device recovered']),
                    'time_logged' => now(),
                ]);
            }
        }
    }

    protected function evaluateRule2(Device $device): void
    {
        $ruleId = 2;
        $processor = $device->processors()->first();
        if (!$processor) return;

        $condition = $processor->processor_usage >= $processor->processor_perc_warn;
        $existingAlert = Alert::where('device_id', $device->device_id)
            ->where('rule_id', $ruleId)
            ->first();

        if ($condition) {
            if (!$existingAlert || $existingAlert->state == 0) {
                Alert::updateOrCreate(
                    ['device_id' => $device->device_id, 'rule_id' => $ruleId],
                    [
                        'state'     => 1,
                        'open'      => 1,
                        'alerted'   => 1,
                        'timestamp' => now(),
                    ]
                );
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 1,
                    'details'     => json_encode([
                        'usage' => $processor->processor_usage,
                        'threshold' => $processor->processor_perc_warn
                    ]),
                    'time_logged' => now(),
                ]);
            }
        } else {
            if ($existingAlert && $existingAlert->state == 1) {
                $existingAlert->update(['state' => 0, 'open' => 0]);
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 0,
                    'details'     => json_encode(['message' => 'CPU usage normal']),
                    'time_logged' => now(),
                ]);
            }
        }
    }

    protected function evaluateRule3(Device $device): void
    {
        $ruleId = 3;
        $memory = $device->storages()->where('type', 'ram')->first();
        if (!$memory) return;

        $condition = $memory->storage_perc >= $memory->storage_perc_warn;
        $existingAlert = Alert::where('device_id', $device->device_id)
            ->where('rule_id', $ruleId)
            ->first();

        if ($condition) {
            if (!$existingAlert || $existingAlert->state == 0) {
                Alert::updateOrCreate(
                    ['device_id' => $device->device_id, 'rule_id' => $ruleId],
                    [
                        'state'     => 1,
                        'open'      => 1,
                        'alerted'   => 1,
                        'timestamp' => now(),
                    ]
                );
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 1,
                    'details'     => json_encode([
                        'usage' => $memory->storage_perc,
                        'threshold' => $memory->storage_perc_warn
                    ]),
                    'time_logged' => now(),
                ]);
            }
        } else {
            if ($existingAlert && $existingAlert->state == 1) {
                $existingAlert->update(['state' => 0, 'open' => 0]);
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 0,
                    'details'     => json_encode(['message' => 'Memory usage normal']),
                    'time_logged' => now(),
                ]);
            }
        }
    }

    protected function evaluateRule4(Device $device): void
    {
        $ruleId = 4;
        $disks = $device->storages()->where('type', 'disk')->get();
        $anyCritical = $disks->contains(function ($disk) {
            return $disk->storage_perc >= $disk->storage_perc_warn;
        });

        $existingAlert = Alert::where('device_id', $device->device_id)
            ->where('rule_id', $ruleId)
            ->first();

        if ($anyCritical) {
            if (!$existingAlert || $existingAlert->state == 0) {
                Alert::updateOrCreate(
                    ['device_id' => $device->device_id, 'rule_id' => $ruleId],
                    [
                        'state'     => 1,
                        'open'      => 1,
                        'alerted'   => 1,
                        'timestamp' => now(),
                    ]
                );
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 1,
                    'details'     => json_encode(['disks' => $disks->pluck('storage_descr')]),
                    'time_logged' => now(),
                ]);
            }
        } else {
            if ($existingAlert && $existingAlert->state == 1) {
                $existingAlert->update(['state' => 0, 'open' => 0]);
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 0,
                    'details'     => json_encode(['message' => 'Disk usage normal']),
                    'time_logged' => now(),
                ]);
            }
        }
    }

    protected function evaluateRule5(Device $device): void
    {
        $ruleId = 5;
        $downPorts = $device->ports()
            ->where('ifAdminStatus', 'up')
            ->where('ifOperStatus', 'down')
            ->exists();

        $existingAlert = Alert::where('device_id', $device->device_id)
            ->where('rule_id', $ruleId)
            ->first();

        if ($downPorts) {
            if (!$existingAlert || $existingAlert->state == 0) {
                Alert::updateOrCreate(
                    ['device_id' => $device->device_id, 'rule_id' => $ruleId],
                    [
                        'state'     => 1,
                        'open'      => 1,
                        'alerted'   => 1,
                        'timestamp' => now(),
                    ]
                );
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 1,
                    'details'     => json_encode(['message' => 'One or more ports down']),
                    'time_logged' => now(),
                ]);
            }
        } else {
            if ($existingAlert && $existingAlert->state == 1) {
                $existingAlert->update(['state' => 0, 'open' => 0]);
                AlertLog::create([
                    'rule_id'     => $ruleId,
                    'device_id'   => $device->device_id,
                    'state'       => 0,
                    'details'     => json_encode(['message' => 'All ports operational']),
                    'time_logged' => now(),
                ]);
            }
        }
    }
}