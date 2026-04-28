<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Port extends Model
{
    protected $table = 'ports';
    protected $primaryKey = 'port_id';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'device_id', 'ifIndex', 'ifName', 'ifDescr', 'ifType',
        'ifSpeed', 'ifAdminStatus', 'ifOperStatus'
    ];
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }

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

    public function portTraffic()
    {
        return $this->hasMany(PortTraffic::class, 'port_id', 'port_id');
    }
}