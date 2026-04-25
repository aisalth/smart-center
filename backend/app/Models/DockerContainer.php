<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DockerContainer extends Model
{
    protected $fillable = [
        'docker_host_id', 'container_docker_id', 'name', 'image', 
        'status', 'state', 'ports', 'labels', 'networks', 
        'restart_policy', 'created_at_docker', 'ignore', 'last_polled'
    ];

    protected $casts = [
        'ports' => 'array',
        'labels' => 'array',
        'networks' => 'array',
        'ignore' => 'boolean',
        'created_at_docker' => 'datetime',
        'last_polled' => 'datetime',
    ];

    public function host(): BelongsTo
    {
        return $this->belongsTo(DockerHost::class, 'docker_host_id');
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(ContainerMetric::class, 'container_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ContainerLog::class, 'container_id');
    }
}