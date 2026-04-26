<?php

namespace App\Services;

use App\Models\Device;
use App\Models\AlertRule;
use App\Models\Alert;
use App\Models\AlertLog;
use Illuminate\Support\Facades\Log;
use Exception;

class AlertEvaluator
{
    public static function evaluate(Device $device, array $data): void
    {
        try {
            $rules = AlertRule::where('enabled', 1)->where('source_type', 'api')->get();

            foreach ($rules as $rule) {
                $currentValue = self::resolveMetricValue($rule->metric, $data);
                if ($currentValue === null) continue;

                $isBreached = self::evaluateCondition($currentValue, $rule->operator, (float) $rule->threshold_value);
                
                $existingAlert = Alert::where('device_id', $device->device_id)
                                      ->where('rule_id', $rule->rule_id)
                                      ->where('open', 1)
                                      ->first();

                if ($isBreached) {
                    if (!$existingAlert) {
                        Alert::create([
                            'source_type' => 'api',
                            'source_id' => $device->device_id,
                            'device_id' => $device->device_id,
                            'rule_id' => $rule->rule_id,
                            'state' => 1,
                            'open' => 1,
                            'timestamp' => now(),
                        ]);

                        AlertLog::create([
                            'source_type' => 'api',
                            'source_id' => $device->device_id,
                            'rule_id' => $rule->rule_id,
                            'device_id' => $device->device_id,
                            'state' => 1,
                            'details' => json_encode(['metric' => $rule->metric, 'value' => $currentValue, 'threshold' => $rule->threshold_value]),
                            'time_logged' => now(),
                        ]);
                    }
                } else {
                    if ($existingAlert) {
                        $existingAlert->update(['open' => 0, 'state' => 0]);

                        AlertLog::create([
                            'source_type' => 'api',
                            'source_id' => $device->device_id,
                            'rule_id' => $rule->rule_id,
                            'device_id' => $device->device_id,
                            'state' => 0,
                            'details' => json_encode(['status' => 'Resolved', 'value' => $currentValue]),
                            'time_logged' => now(),
                        ]);
                    }
                }
            }
        } catch (Exception $e) {
            Log::error("AlertEvaluator Error: " . $e->getMessage());
        }
    }

    private static function resolveMetricValue(string $metric, array $data): ?float
    {
        return match ($metric) {
            'cpu_usage' => (float) ($data['cpu']['usage']['percentUsed'] ?? 0),
            'memory_usage' => (float) ($data['memory']['percentUsed'] ?? 0),
            'disk_usage' => (float) ($data['disk']['percentUsed'] ?? 0),
            default => null,
        };
    }

    private static function evaluateCondition(float $value, string $operator, float $threshold): bool
    {
        return match ($operator) {
            '>' => $value > $threshold,
            '<' => $value < $threshold,
            '>=' => $value >= $threshold,
            '<=' => $value <= $threshold,
            '==' => $value == $threshold,
            default => false,
        };
    }
}