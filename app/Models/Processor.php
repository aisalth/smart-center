<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Processor extends Model
{
    use HasFactory;

    protected $primaryKey = 'processor_id';

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}