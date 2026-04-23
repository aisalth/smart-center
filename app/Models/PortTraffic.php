<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PortTraffic extends Model
{
    use HasFactory;

    protected $table = 'port_traffic';

    protected $fillable = [
        'port_id', 'timestamp', 'in_octets', 'out_octets', 'in_rate', 'out_rate'
    ];

    public function port()
    {
        return $this->belongsTo(Port::class, 'port_id');
    }
}