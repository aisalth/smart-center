<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SnmpMetricHistory extends Model
{
    protected $table = 'snmp_metrics_history';
    public $timestamps = false;

    protected $fillable = [
        'device_id',
        'metric_type',
        'metric_label',
        'value_percent',
        'value_used',
        'value_total',
        'recorded_at',
    ];

    protected $casts = [
        'value_percent' => 'float',
        'value_used'    => 'integer',
        'value_total'   => 'integer',
        'recorded_at'   => 'datetime',
    ];

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }
}
