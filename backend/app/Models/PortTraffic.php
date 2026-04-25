<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortTraffic extends Model
{
    protected $table = 'port_traffic';
    public $timestamps = false;

    protected $fillable = [
        'port_id', 'timestamp', 'in_octets', 'out_octets', 'in_rate', 'out_rate'
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'in_octets' => 'integer',
        'out_octets' => 'integer',
        'in_rate' => 'integer',
        'out_rate' => 'integer',
    ];

    public function port()
    {
        return $this->belongsTo(Port::class, 'port_id', 'port_id');
    }
}