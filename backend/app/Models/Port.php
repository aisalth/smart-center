<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Port extends Model
{
    protected $table = 'ports';
    protected $primaryKey = 'port_id';
    public $timestamps = false;

    protected $fillable = [
        'device_id', 'ifIndex', 'ifName', 'ifDescr', 'ifType',
        'ifSpeed', 'ifAdminStatus', 'ifOperStatus'
    ];

    protected $casts = [
        'ifSpeed' => 'integer',
    ];

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }

    public function traffic()
    {
        return $this->hasMany(PortTraffic::class, 'port_id', 'port_id');
    }

    public function latestTraffic()
    {
        return $this->hasOne(PortTraffic::class, 'port_id', 'port_id')->latestOfMany('timestamp');
    }
}