<!DOCTYPE html>
<html>
<head><title>Edit Device</title></head>
<body>
    <h1>Edit Device: {{ $device->hostname }}</h1>
    <form method="POST" action="{{ route('devices.update', $device) }}">
        @csrf @method('PUT')
        <label>Hostname:</label> <input type="text" name="hostname" value="{{ $device->hostname }}" required><br>
        <label>IP:</label> <input type="text" name="ip" value="{{ $device->ip ? '***' : '' }}"><br>
        <label>Port:</label> <input type="number" name="port" value="{{ $device->port }}" required><br>
        <label>Community:</label> <input type="text" name="community" value="{{ $device->community }}"><br>
        <label>Status:</label>
        <select name="status">
            <option value="1" {{ $device->status ? 'selected' : '' }}>Aktif</option>
            <option value="0" {{ !$device->status ? 'selected' : '' }}>Nonaktif</option>
        </select><br>
        <button type="submit">Update</button>
        <a href="{{ route('devices.index') }}">Batal</a>
    </form>
</body>
</html>