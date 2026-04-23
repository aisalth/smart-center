<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Storage extends Model
{
    use HasFactory;

    protected $table = 'storage';
    protected $primaryKey = 'storage_id';

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}