<?php
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/monitoring/container-history/{name}', function ($name) {
    // Gunakan 'LIKE' agar lebih fleksibel mencari nama container
    $container = DB::table('docker_containers')
        ->where('name', 'LIKE', '%' . $name . '%')
        ->first();

    // Jika container tidak ketemu di DB, kembalikan pesan jelas
    if (!$container) {
        return response()->json([
            'success' => false, 
            'data' => [], 
            'message' => 'Container ' . $name . ' tidak ditemukan di tabel docker_containers'
        ]);
    }

    // Jika ketemu, ambil 30 metrik terakhirnya
    $history = DB::table('container_metrics')
        ->where('container_id', $container->id)
        ->select('timestamp', 'cpu_usage_percent', 'mem_usage_percent', 'mem_usage')
        ->orderBy('timestamp', 'desc')
        ->limit(30)
        ->get()
        ->reverse() // Balik agar di grafik dari kiri ke kanan (lama ke baru)
        ->values();

    return response()->json([
        'success' => true,
        'data' => $history
    ]);
});