<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Device extends Model
{
    use HasFactory;

    protected $table = 'devices';
    protected $primaryKey = 'device_id';
    public $timestamps = true;

    protected $fillable = [
        'hostname', 'sysName', 'display', 'ip', 'community', 'port',
        'status', 'status_reason', 'snmp_disable', 'ignore', 'disabled',
        'poller_group', 'port_association_mode', 'snmpver', 'transport',
        'uptime', 'last_polled', 'os', 'hardware', 'location_id'
    ];

    protected $casts = [
        'status' => 'boolean',
        'port' => 'integer',
        'uptime' => 'integer',
    ];

    // Relasi ke metrics (snmp_data) via hostname
    public function metrics()
    {
        return $this->hasMany(DeviceMetric::class, 'hostname', 'hostname');
    }

    public function ports()
    {
        return $this->hasMany(Port::class, 'device_id');
    }

    public function storage()
    {
        return $this->hasMany(Storage::class, 'device_id');
    }

    public function processors()
    {
        return $this->hasMany(Processor::class, 'device_id');
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class, 'device_id');
    }
}