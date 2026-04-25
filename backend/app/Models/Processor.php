<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Processor extends Model
{
    protected $table = 'processors';
    protected $primaryKey = 'processor_id';
    public $timestamps = false;

    protected $fillable = [
        'device_id', 'processor_index', 'processor_type', 'processor_descr',
        'processor_usage', 'processor_perc_warn'
    ];

    protected $casts = [
        'processor_usage' => 'integer',
        'processor_perc_warn' => 'integer',
    ];

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }
}