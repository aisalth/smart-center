<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DeviceWebController;

Route::get('/', function () {
    return view('welcome');
});

Route::resource('devices', DeviceController::class);

Route::get('/devices', [DeviceWebController::class, 'index'])->name('devices.index');
Route::get('/devices/create', [DeviceWebController::class, 'create'])->name('devices.create');
Route::post('/devices', [DeviceWebController::class, 'store'])->name('devices.store');
Route::get('/devices/{id}', [DeviceWebController::class, 'show'])->name('devices.show');

