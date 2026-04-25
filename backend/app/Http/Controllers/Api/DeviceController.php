<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Port;
use App\Models\PortTraffic;
use App\Services\PollerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    protected PollerService $poller;

    public function __construct(PollerService $poller)
    {
        $this->poller = $poller;
    }

    public function index(Request $request)
    {
        $query = Device::query();

        if ($request->has('status')) {
            $status = $request->status === 'up' ? 1 : 0;
            $query->where('status', $status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('hostname', 'like', "%{$search}%")
                  ->orWhere('ip', 'like', "%{$search}%");
            });
        }

        $devices = $query->withCount(['ports', 'alerts' => function ($q) {
            $q->where('state', 1);
        }])->paginate($request->input('per_page', 20));

        return response()->json([
            'data'    => $devices,
            'message' => 'ok',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'hostname'       => 'required|string|unique:devices,hostname',
            'ip'             => 'required|ip',
            'community'      => 'required_unless:snmp_disable,true|string',
            'snmpver'        => 'in:v1,v2c,v3',
            'port'           => 'integer|min:1|max:65535',
            'transport'      => 'in:udp,tcp',
            'display'        => 'nullable|string',
            'type'           => 'nullable|string',
            'snmp_disable'   => 'boolean',
            'disable_notify' => 'boolean',
        ]);

        $device = Device::create($data + [
            'snmpver'   => $data['snmpver'] ?? 'v2c',
            'port'      => $data['port'] ?? 161,
            'transport' => $data['transport'] ?? 'udp',
            'disabled'  => false,
        ]);

        // Run initial discovery poll
        if (!$device->snmp_disable) {
            $this->poller->pollDevice($device);
        }

        return response()->json([
            'data'    => $device,
            'message' => 'Device created',
        ], 201);
    }

    public function show($id)
    {
        $device = Device::with(['processors', 'storages', 'ports'])
            ->withCount(['alerts as active_alerts_count' => function ($q) {
                $q->where('state', 1);
            }])
            ->findOrFail($id);

        $lastAlert = $device->alerts()->latest('timestamp')->first();

        return response()->json([
            'data' => [
                'device'               => $device,
                'active_alerts_count'  => $device->active_alerts_count,
                'last_alert'           => $lastAlert,
            ],
            'message' => 'ok',
        ]);
    }

    public function update(Request $request, $id)
    {
        $device = Device::findOrFail($id);

        $data = $request->validate([
            'hostname'       => 'sometimes|string|unique:devices,hostname,' . $device->device_id . ',device_id',
            'ip'             => 'sometimes|ip',
            'community'      => 'required_unless:snmp_disable,true|string',
            'snmpver'        => 'in:v1,v2c,v3',
            'port'           => 'integer|min:1|max:65535',
            'transport'      => 'in:udp,tcp',
            'display'        => 'nullable|string',
            'type'           => 'nullable|string',
            'snmp_disable'   => 'boolean',
            'disable_notify' => 'boolean',
        ]);

        $device->update($data);

        return response()->json([
            'data'    => $device,
            'message' => 'Device updated',
        ]);
    }

    public function destroy($id)
    {
        $device = Device::findOrFail($id);
        $device->update(['disabled' => true]);

        return response()->json(null, 204);
    }
}