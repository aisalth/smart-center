<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeviceMetric extends Model
{
    protected $table = 'snmp_data';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'hostname', 'uptime', 'cpu_user', 'cpu_system', 'cpu_idle',
        'ram_total', 'ram_used', 'fetched_at'
    ];

    protected $casts = [
        'fetched_at' => 'datetime',   // ← tambahkan ini
    ];

    // helper methods tetap sama
    public function getCpuUsageAttribute()
    {
        $idle = (int) $this->cpu_idle;
        return 100 - $idle;
    }

    public function getMemoryUsageAttribute()
    {
        $total = (int) $this->ram_total;
        $used = (int) $this->ram_used;
        return $total > 0 ? round(($used / $total) * 100) : 0;
    }

    public function device()
    {
        return $this->belongsTo(Device::class, 'hostname', 'hostname');
    }
}