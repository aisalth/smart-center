<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerMetric extends Model
{
    protected $table = 'container_metrics';
    
    // Matikan fitur otomatis created_at & updated_at karena tabelmu tidak punya kolom itu
    public $timestamps = false; 
    
    // INI DIA KUNCI JAWABANNYA: Izinkan Laravel mengisi semua kolom!
    protected $guarded = []; 

    public function container(): BelongsTo
    {
        return $this->belongsTo(DockerContainer::class, 'container_id');
    }
}