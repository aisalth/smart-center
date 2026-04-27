<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Storage extends Model
{
    protected $table = 'storage';
    protected $primaryKey = 'storage_id';
    public $timestamps = false;

    protected $fillable = [
        'device_id', 'type', 'storage_index', 'storage_descr',
        'storage_size', 'storage_used', 'storage_free', 'storage_perc',
        'storage_perc_warn'
    ];

    protected $casts = [
        'storage_size' => 'integer',
        'storage_used' => 'integer',
        'storage_free' => 'integer',
        'storage_perc' => 'integer',
        'storage_perc_warn' => 'integer',
    ];

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone('Asia/Jakarta')
            ->format('Y-m-d H:i:s');
    }
}