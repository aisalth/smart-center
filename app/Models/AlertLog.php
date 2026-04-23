<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AlertLog extends Model
{
    use HasFactory;

    protected $table = 'alert_log';

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}