<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SnmpData extends Model
{
    use HasFactory;

    protected $fillable = [
        'hostname', 'uptime', 'cpu_user', 'cpu_system', 'cpu_idle',
        'ram_total', 'ram_used', 'fetched_at'
    ];
}
