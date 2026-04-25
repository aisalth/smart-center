<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AlertLog;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request)
    {
        $query = Alert::with('device');

        if ($request->has('state')) {
            $query->where('state', $request->state);
        }

        if ($request->has('device_id')) {
            $query->where('device_id', $request->device_id);
        }

        $alerts = $query->paginate($request->input('per_page', 20));

        return response()->json(['data' => $alerts, 'message' => 'ok']);
    }

    public function log(Request $request)
    {
        $query = AlertLog::with('device');

        if ($request->has('device_id')) {
            $query->where('device_id', $request->device_id);
        }
        if ($request->has('rule_id')) {
            $query->where('rule_id', $request->rule_id);
        }

        $hours = $request->input('hours', 24);
        $query->where('time_logged', '>=', now()->subHours($hours));

        $logs = $query->orderBy('time_logged', 'desc')
            ->paginate($request->input('per_page', 50));

        return response()->json(['data' => $logs, 'message' => 'ok']);
    }

    public function acknowledge(Request $request, $id)
    {
        $alert = Alert::findOrFail($id);
        $request->validate(['note' => 'nullable|string']);

        $alert->update([
            'state' => 2,
            'note'  => $request->input('note'),
        ]);

        AlertLog::create([
            'rule_id'     => $alert->rule_id,
            'device_id'   => $alert->device_id,
            'state'       => 2,
            'details'     => json_encode(['note' => $request->input('note')]),
            'time_logged' => now(),
        ]);

        return response()->json(['data' => $alert, 'message' => 'Alert acknowledged']);
    }
}