<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Processor extends Model
{
    protected $table = 'processors';
    protected $primaryKey = 'processor_id';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'device_id', 'processor_index', 'processor_type', 'processor_descr',
        'processor_usage', 'processor_perc_warn'
    ];

    protected $casts = [
        'processor_usage' => 'integer',
        'processor_perc_warn' => 'integer',
    ];
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }
}