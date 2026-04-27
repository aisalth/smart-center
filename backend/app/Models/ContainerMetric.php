<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerMetric extends Model
{
    protected $table = 'container_metrics';
    public $timestamps = false; 
    protected $guarded = []; 

    public function container(): BelongsTo
    {
        return $this->belongsTo(DockerContainer::class, 'container_id');
    }
}