<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlertsLog extends Model {
    protected $table = 'alerts_log';
    public $timestamps = false;
    protected $guarded = [];
    public function device() { return $this->belongsTo(Device::class, 'device_id'); }
    public function rule() { return $this->belongsTo(AlertRule::class, 'rule_id'); }
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }
}