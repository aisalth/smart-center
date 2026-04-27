<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortTraffic extends Model
{
    protected $table = 'port_traffic';
    public $timestamps = false;
    protected $guarded = [];

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
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }

    public function port()
    {
        return $this->belongsTo(Port::class, 'port_id', 'port_id');
    }
}