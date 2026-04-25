<?php

// use App\Http\Controllers\Api\AuthController;
// use App\Http\Controllers\Api\DeviceController;
// use App\Http\Controllers\Api\MetricsController;
// use App\Http\Controllers\Api\AlertController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DockerMonitoringController;

Route::prefix('docker-hosts')->group(function () {
    Route::get('/', [DockerMonitoringController::class, 'getHosts']);
    
    Route::prefix('{id}')->group(function () {
        // Hanya route container yang didukung oleh tabel SQL kamu
        Route::get('/containers', [DockerMonitoringController::class, 'getContainers']);
        
        Route::prefix('containers/{containerId}')->group(function () {
            Route::get('/metrics', [DockerMonitoringController::class, 'getContainerMetrics']);
            Route::get('/logs', [DockerMonitoringController::class, 'getContainerLogs']);
        });
    });
});

Route::get('/debug-tarik-data/{id}', function ($id) {
    $host = \App\Models\DockerHost::findOrFail($id);
    
    // PERINTAH DEWA: Eksekusi kode Job detik ini juga tanpa peduli Queue!
    \App\Jobs\PollDockerHostJob::dispatchSync($host); 
    
    return response()->json(['message' => 'Data sukses ditarik paksa secara langsung!']);
});

// Route::post('/auth/login', [AuthController::class, 'login']);

// Route::middleware('auth:sanctum')->group(function () {
//     Route::post('/auth/logout', [AuthController::class, 'logout']);

//     // Devices
//     Route::get('/devices', [DeviceController::class, 'index']);
//     Route::post('/devices', [DeviceController::class, 'store']);
//     Route::get('/devices/{device_id}', [DeviceController::class, 'show']);
//     Route::put('/devices/{device_id}', [DeviceController::class, 'update']);
//     Route::delete('/devices/{device_id}', [DeviceController::class, 'destroy']);

//     // Device metrics
//     Route::get('/devices/{device_id}/metrics', [MetricsController::class, 'metrics']);
//     Route::get('/devices/{device_id}/interfaces', [MetricsController::class, 'interfaces']);
//     Route::get('/devices/{device_id}/traffic', [MetricsController::class, 'traffic']);
//     Route::post('/devices/{device_id}/poll', [MetricsController::class, 'pollNow']);

//     // Alerts
//     Route::get('/alerts', [AlertController::class, 'index']);
//     Route::get('/alerts/log', [AlertController::class, 'log']);
//     Route::put('/alerts/{id}/acknowledge', [AlertController::class, 'acknowledge']);
// });