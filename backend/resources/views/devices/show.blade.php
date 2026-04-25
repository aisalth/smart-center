<!DOCTYPE html>
<html>
<head>
    <title>Detail Device: {{ $device->hostname }}</title>
</head>
<body>
    <h1>Detail Device</h1>
    <p><strong>Hostname:</strong> {{ $device->hostname }}</p>
    <p><strong>IP Address:</strong> {{ $device->ip ?? '-' }}</p>
    <p><strong>Port:</strong> {{ $device->port }}</p>
    <p><strong>Community:</strong> {{ $device->community }}</p>
    <p><strong>Status:</strong> {{ $device->status ? 'Aktif' : 'Nonaktif' }}</p>
    <p><strong>Uptime (centiseconds):</strong> {{ $device->uptime ?? 0 }}</p>
    <p><strong>Last Polled:</strong> {{ $device->last_polled ?? '-' }}</p>
    <p><strong>OS:</strong> {{ $device->os ?? 'Unknown' }}</p>
    <p><strong>Hardware:</strong> {{ $device->hardware ?? 'Unknown' }}</p>
    <p><strong>Port Status:</strong> Up: {{ $portStats->up ?? 0 }}, Down: {{ $portStats->down ?? 0 }}</p>

    <h2>Histori Metrics (50 data terbaru)</h2>
    <table border="1" cellpadding="5">
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>CPU Usage (%)</th>
                <th>Memory Usage (%)</th>
                <th>RAM Total</th>
                <th>RAM Used</th>
                <th>Uptime Raw</th>
            </tr>
        </thead>
        <tbody>
            @forelse($metrics as $metric)
            <tr>
                <td>{{ $metric->fetched_at }}</td>
                <td>{{ $metric->cpu_usage }}</td>
                <td>{{ $metric->memory_usage }}</td>
                <td>{{ $metric->ram_total }}</td>
                <td>{{ $metric->ram_used }}</td>
                <td>{{ $metric->uptime }}</td>
            </tr>
            @empty
                <td><td colspan="6">Belum ada data metrics. Jalankan command <code>php artisan metrics:collect</code> atau tunggu scheduler.</td></tr>
            @endforelse
        </tbody>
    </table>

    <br>
    <a href="{{ route('devices.index') }}">Kembali ke daftar device</a>
</body>
</html>