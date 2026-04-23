<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Alert extends Model
{
    use HasFactory;

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function logs()
    {
        return $this->hasMany(AlertLog::class, 'device_id', 'device_id');
    }
}