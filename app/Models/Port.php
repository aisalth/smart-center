<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Port extends Model
{
    use HasFactory;

    protected $primaryKey = 'port_id';

    protected $fillable = [
        'device_id', 'ifIndex', 'ifName'
    ];

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function traffic()
    {
        return $this->hasMany(PortTraffic::class, 'port_id');
    }
}