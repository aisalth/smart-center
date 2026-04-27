<?php
// app/Http/Controllers/Api/DashboardController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;

class DashboardController extends Controller
{
    // Mengambil ringkasan untuk halaman utama frontend
    public function summary()
    {
        $devices = Device::withCount(['alerts' => function($q) {
            $q->where('open', 1);
        }])->get();

        $summary = [
            'total_devices' => $devices->count(),
            'online_devices' => $devices->where('status', 1)->count(),
            'offline_devices' => $devices->where('status', 0)->count(),
            'total_open_alerts' => $devices->sum('alerts_count'),
            'devices' => $devices
        ];

        return response()->json($summary);
    }
}