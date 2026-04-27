<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class DockerHost extends Model
{
    protected $primaryKey = 'docker_host_id';
    public $timestamps = false;
    protected $guarded = [];
    
    protected $fillable = [
        'device_id', 'name', 'status', 'disabled', 
        'tcp_host', 'tcp_port', 'last_connected', 'last_error'
    ];

    protected $casts = [
        'disabled' => 'boolean',
        'last_connected' => 'datetime',
    ];

    public function device() { 
        return $this->belongsTo(Device::class, 'device_id'); 
    }

    public function containers(): HasMany
    {
        return $this->hasMany(DockerContainer::class, 'docker_host_id');
    }

}