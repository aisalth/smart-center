<!DOCTYPE html>
<html>
<head>
    <title>Tambah Device</title>
</head>
<body>
    <h1>Tambah Device Baru</h1>
    <form method="POST" action="{{ route('devices.store') }}">
        @csrf
        <table>
            <tr><td>Hostname:</td><td><input type="text" name="hostname" required></td></tr>
            <tr><td>IP Address (opsional):</td><td><input type="text" name="ip"></td></tr>
            <tr><td>Port SNMP:</td><td><input type="number" name="port" value="161" required></td></tr>
            <tr><td>Community:</td><td><input type="text" name="community" value="public"></td></tr>
            <tr><td></td><td><button type="submit">Simpan</button> <a href="{{ route('devices.index') }}">Batal</a></td></tr>
        </table>
    </form>
</body>
</html>