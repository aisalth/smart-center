<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerMetric extends Model
{
    // WAJIB DITAMBAHKAN AGAR LARAVEL TIDAK MENCARI KOLOM updated_at
    public $timestamps = false; 

    protected $fillable = [
        'container_id', 'timestamp', 'cpu_usage_percent', 'num_cpus',
        'mem_usage', 'mem_limit', 'mem_usage_percent', 'mem_cache', // <- PASTIKAN INI ADA
        'net_rx_bytes', 'net_tx_bytes', 'blk_read_bytes', 'blk_write_bytes', 'pids'
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    public function container(): BelongsTo
    {
        return $this->belongsTo(DockerContainer::class, 'container_id');
    }
}