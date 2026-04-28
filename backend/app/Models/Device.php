<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    protected $table = 'devices';
    protected $primaryKey = 'device_id';
    public $timestamps = false;

    protected $fillable = [
        'hostname', 'sysName', 'display', 'ip', 'community', 'snmpver',
        'port', 'transport', 'snmp_disable', 'os', 'type', 'category',
        'hardware', 'version', 'sysDescr', 'status', 'status_reason',
        'uptime', 'last_polled', 'last_ping', 'last_ping_timetaken',
        'ignore', 'disabled', 'disable_notify'
    ];

    protected $casts = [
        'snmp_disable' => 'boolean',
        'status' => 'boolean',
        'ignore' => 'boolean',
        'disabled' => 'boolean',
        'disable_notify' => 'boolean',
        'last_polled' => 'datetime',
        'last_ping' => 'datetime',
    ];

    // Di app/Models/Device.php

public function getCpuUsageAttribute(): int
{
    // Kalau relasi sudah di-load, pakai itu
    if ($this->relationLoaded('processors')) {
        return $this->processors->first()->processor_usage ?? 0;
    }
    // Kalau belum, query langsung
    return $this->processors()->value('processor_usage') ?? 0;
}

public function getMemoryPercentAttribute(): int
{
    if ($this->relationLoaded('storages')) {
        return $this->storages->where('type', 'memory')->first()->storage_perc ?? 0;
    }
    return $this->storages()->where('type', 'memory')->value('storage_perc') ?? 0;
}

public function getDiskPercentAttribute(): int
{
    if ($this->relationLoaded('storages')) {
        return $this->storages->where('type', 'disk')->first()->storage_perc ?? 0;
    }
    return $this->storages()->where('type', 'disk')->value('storage_perc') ?? 0;
}
protected function serializeDate(\DateTimeInterface $date): string
{
    return \Carbon\Carbon::instance($date)
        ->setTimezone('Asia/Jakarta')
        ->format('Y-m-d H:i:s');
}

    public function ports()
    {
        return $this->hasMany(Port::class, 'device_id', 'device_id');
    }

    public function processors()
    {
        return $this->hasMany(Processor::class, 'device_id', 'device_id');
    }

    public function storages()
    {
        return $this->hasMany(Storage::class, 'device_id', 'device_id');
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class, 'device_id', 'device_id');
    }
    public function dockerHosts() { 
        return $this->hasMany(DockerHost::class, 'device_id'); 
    }
}