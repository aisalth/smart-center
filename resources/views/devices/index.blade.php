<!DOCTYPE html>
<html>
<head>
    <title>Daftar Device</title>
</head>
<body>
    <h1>Daftar Device SNMP</h1>
    <a href="{{ route('devices.create') }}">Tambah Device Baru</a>
    @if(session('success'))
        <p style="color:green">{{ session('success') }}</p>
    @endif
    <table border="1" cellpadding="8">
        <thead>
            <tr>
                <th>ID</th>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>Port</th>
                <th>Community</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Aksi</th>
            </tr>
        </thead>
        <tbody>
            @foreach($devices as $device)
            <tr>
                <td>{{ $device->device_id }}</td>
                <td>{{ $device->hostname }}</td>
                <td>{{ $device->ip ?? '-' }}</td>
                <td>{{ $device->port }}</td>
                <td>{{ $device->community }}</td>
                <td>{{ $device->status ? 'Aktif' : 'Nonaktif' }}</td>
                <td>{{ $device->uptime ?? '0' }}</td>
                <td>
                    <a href="{{ route('devices.show', $device->device_id) }}">Detail</a>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    {{ $devices->links() }}
</body>
</html>