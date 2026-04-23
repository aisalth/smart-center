<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\DeviceMetric;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceWebController extends Controller
{
    // Daftar device
    public function index()
    {
        $devices = Device::paginate(10);
        return view('devices.index', compact('devices'));
    }

    // Form tambah device
    public function create()
    {
        return view('devices.create');
    }

    // Proses simpan device
    public function store(Request $request)
    {
        $request->validate([
            'hostname' => 'required|string|max:128',
            'ip'       => 'nullable|ip',
            'port'     => 'required|integer|min:1|max:65535',
            'community'=> 'nullable|string',
        ]);

        Device::create([
            'hostname'  => $request->hostname,
            'sysName'   => $request->hostname,
            'display'   => $request->hostname,
            'ip'        => $request->ip,
            'community' => $request->community ?? 'public',
            'port'      => $request->port,
            'status'    => 1,
            'status_reason' => '',
            'snmp_disable' => 0,
            'ignore'    => 0,
            'disabled'  => 0,
            'poller_group' => 0,
            'port_association_mode' => 1,
            'snmpver'   => 'v2c',
            'transport' => 'udp',
        ]);

        return redirect()->route('devices.index')->with('success', 'Device added successfully.');
    }

    // Detail device + histori metrics
    public function show($id)
    {
        $device = Device::findOrFail($id);
        
        // Ambil 50 data metrics terbaru dari snmp_data
        $metrics = DeviceMetric::where('hostname', $device->hostname)
            ->orderBy('fetched_at', 'desc')
            ->limit(50)
            ->get();

        // Hitung port up/down (opsional)
        $portStats = DB::table('ports')
            ->where('device_id', $device->device_id)
            ->selectRaw("SUM(ifOperStatus = 'up') as up, SUM(ifOperStatus = 'down') as down")
            ->first();

        return view('devices.show', compact('device', 'metrics', 'portStats'));
    }
}