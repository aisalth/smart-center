<?php
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\DeviceApiController;
use App\Http\Controllers\Api\MetricApiController;
use App\Http\Controllers\Api\SnmpApiController;
use Illuminate\Http\Request;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AnalyticsController;

Route::get('/monitoring/container-history/{name}', function (Request $request, $name) {
    $container = DB::table('docker_containers')->where('name', 'LIKE', '%' . $name . '%')->first();

    if (!$container) {
        return response()->json(['success' => false, 'data' => []]);
    }

    $minutes = (int) $request->query('minutes', 30);
    $query = DB::table('container_metrics')
        ->where('container_id', $container->id)
        ->where('timestamp', '>=', now()->subMinutes($minutes));

    if ($minutes <= 180) {
        $query->select('timestamp', 'cpu_usage_percent', 'mem_usage_percent')
              ->orderBy('timestamp', 'desc');
    } else if ($minutes <= 10080) {
        $query->select(
            DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as timestamp"),
            DB::raw('ROUND(AVG(cpu_usage_percent), 2) as cpu_usage_percent'),
            DB::raw('ROUND(AVG(mem_usage_percent), 2) as mem_usage_percent')
        )
        ->groupBy(DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')"))
        ->orderBy('timestamp', 'desc');
    } else {
        $query->select(
            DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d 00:00:00') as timestamp"),
            DB::raw('ROUND(AVG(cpu_usage_percent), 2) as cpu_usage_percent'),
            DB::raw('ROUND(AVG(mem_usage_percent), 2) as mem_usage_percent')
        )
        ->groupBy(DB::raw("DATE_FORMAT(timestamp, '%Y-%m-%d 00:00:00')"))
        ->orderBy('timestamp', 'desc');
    }

    $history = $query->get()->reverse()->values();

    return response()->json([
        'success' => true,
        'data' => $history
    ]);
});


Route::prefix('devices')->group(function () {
    Route::get('/',                         [DeviceApiController::class, 'index']);
    Route::post('/',                        [DeviceApiController::class, 'store']);
    Route::get('/{device}',                 [DeviceApiController::class, 'show']);
    Route::put('/{device}',                 [DeviceApiController::class, 'update']);
    Route::delete('/{device}',              [DeviceApiController::class, 'destroy']);
    Route::post('/{device}/test',           [SnmpApiController::class,   'testConnection']);
    Route::post('/{device}/poll',           [SnmpApiController::class,   'pollDevice']);

    // Metrics per device
    Route::get('/{device}/cpu',             [MetricApiController::class, 'cpu']);
    Route::get('/{device}/storage',         [MetricApiController::class, 'storage']);
    Route::get('/{device}/ports',           [MetricApiController::class, 'ports']);
    Route::get('/{device}/alerts',          [MetricApiController::class, 'alerts']);
    Route::get('/{device}/summary',         [MetricApiController::class, 'summary']);
});

// Port traffic
Route::get('/ports/{port}/traffic',         [MetricApiController::class, 'traffic']);

// Poll all devices (trigger manual)
Route::post('/poll',                        [SnmpApiController::class,   'pollAll']);

Route::prefix('dashboard')->group(function () {
    
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/active', [UserController::class, 'active']);
    Route::get('/users/logins', [UserController::class, 'logins']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    
});

Route::get('/debug-parse2/{device}', function (App\Models\Device $device) {
    $ip        = $device->ip;
    $community = $device->community;

    $cpu = @snmpget($ip, $community, '.1.3.6.1.4.1.2021.10.1.3.1', 2000000, 1);

    // Manual parse di sini
    $raw   = trim($cpu);
    $step1 = preg_match('/^[A-Za-z0-9\-]+:\s*(.+)$/', $raw, $m) ? trim($m[1]) : $raw;
    $step2 = trim($step1, '"');
    $final = (int) round((float) $step2);

    return response()->json([
        'cpu_raw'   => $cpu,
        'step1'     => $step1,
        'step2'     => $step2,
        'final_int' => $final,
        'snmp_service_class_exists' => class_exists(\App\Services\SnmpService::class),
        'snmp_service_path' => (new ReflectionClass(\App\Services\SnmpService::class))->getFileName(),
    ]);
});

Route::get('/debug-poll/{device}', function (App\Models\Device $device) {
    try {
        $ip        = $device->ip;
        $community = $device->community;

        // Manual CPU insert
        $cpu = @snmpget($ip, $community, '.1.3.6.1.4.1.2021.10.1.3.1', 2000000, 1);
        $raw = trim(trim($cpu), '"');
        $usage = (int) round((float) $raw);

        $processor = \App\Models\Processor::updateOrCreate(
            ['device_id' => $device->device_id, 'processor_index' => '1'],
            ['processor_type' => 'cpu', 'processor_descr' => 'CPU', 'processor_usage' => $usage]
        );

        return response()->json([
            'cpu_usage'      => $usage,
            'processor_id'   => $processor->processor_id,
            'was_created'    => $processor->wasRecentlyCreated,
            'processor_data' => $processor->toArray(),
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error'   => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
        ], 500);
    }
});

Route::get('/debug-cpu/{device}', function (App\Models\Device $device) {
    $ip        = $device->ip;
    $community = $device->community;

    return response()->json([
        // Load average 1min, 5min, 15min
        'load_1min'  => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.10.1.3.1', 2000000, 1),
        'load_5min'  => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.10.1.3.2', 2000000, 1),
        'load_15min' => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.10.1.3.3', 2000000, 1),

        // CPU usage via hrProcessorLoad
        'hr_cpu'     => @snmpwalk($ip, $community, '.1.3.6.1.2.1.25.3.3.1.2', 2000000, 1),

        // CPU idle & user via UCD
        'cpu_user'   => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.11.9.0', 2000000, 1),
        'cpu_idle'   => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.11.11.0', 2000000, 1),
        'cpu_system' => @snmpget($ip, $community, '.1.3.6.1.4.1.2021.11.10.0', 2000000, 1),
    ]);
});

Route::get('/debug-timezone', function () {
    return response()->json([
        'app_timezone'   => config('app.timezone'),
        'php_timezone'   => date_default_timezone_get(),
        'now_carbon'     => now()->toDateTimeString(),
        'now_utc'        => now('UTC')->toDateTimeString(),
        'now_jakarta'    => now('Asia/Jakarta')->toDateTimeString(),
    ]);
});