<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
// routes/api.php
use App\Http\Controllers\DeviceController;

Route::get('/snmp', function () {
    $data = Cache::get('snmp_latest');
    
    if (!$data) {
        return response()->json([
            'error' => 'Belum ada data. Jalankan php artisan snmp:fetch dulu.'
        ], 404);
    }
    
    return response()->json($data);
});



Route::post('/devices', [DeviceController::class, 'store']);
Route::get('/devices', [DeviceController::class, 'index']);
Route::get('/devices/{id}', [DeviceController::class, 'show']);