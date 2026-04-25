<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    protected $table = 'devices';
    protected $primaryKey = 'device_id';
    public $timestamps = false;

    protected $fillable = [
        'hostname', 'sysName', 'display', 'ip', 'community', 'snmpver',
        'port', 'transport', 'snmp_disable', 'os', 'type', 'hardware',
        'version', 'sysDescr', 'status', 'status_reason', 'uptime',
        'last_polled', 'last_ping', 'last_ping_timetaken', 'ignore',
        'disabled', 'disable_notify'
    ];

    protected $casts = [
        'snmp_disable' => 'boolean',
        'status' => 'boolean',
        'ignore' => 'boolean',
        'disabled' => 'boolean',
        'disable_notify' => 'boolean',
        'last_polled' => 'datetime',
        'last_ping' => 'datetime',
    ];

    public function ports()
    {
        return $this->hasMany(Port::class, 'device_id', 'device_id');
    }

    public function processors()
    {
        return $this->hasMany(Processor::class, 'device_id', 'device_id');
    }

    public function storages()
    {
        return $this->hasMany(Storage::class, 'device_id', 'device_id');
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class, 'device_id', 'device_id');
    }
}