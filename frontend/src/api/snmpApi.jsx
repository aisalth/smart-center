// src/api/snmpApi.js

const BASE_URL ='http://127.0.0.1:8000/api';

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// ─── Helper ───────────────────────────────────────────────
async function request(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Devices ──────────────────────────────────────────────

/**
 * Ambil semua device + meta (total, online, offline)
 * Response: { data: Device[], meta: { total, online, offline } }
 */
export async function getSnmpDevices() {
  return request('GET', '/devices');
}

/**
 * Ambil detail 1 device (include processors, storages, ports, alerts)
 * Response: { data: Device }
 */
export async function getSnmpDevice(deviceId) {
  return request('GET', `/devices/${deviceId}`);
}

/**
 * Tambah device baru
 * @param {Object} payload - { hostname, ip, community, snmpver, port, transport }
 */
export async function createSnmpDevice(payload) {
  return request('POST', '/devices', {
    hostname:  payload.hostname,
    ip:        payload.overwriteIp || payload.hostname,
    community: payload.community || 'public',
    snmpver:   payload.snmpVersion || 'v2c',
    port:      parseInt(payload.port) || 161,
    transport: payload.protocol || 'udp',
  });
}

/**
 * Update device
 */
export async function updateSnmpDevice(deviceId, payload) {
  return request('PUT', `/devices/${deviceId}`, payload);
}

/**
 * Hapus device
 */
export async function deleteSnmpDevice(deviceId) {
  return request('DELETE', `/devices/${deviceId}`);
}

// ─── SNMP Actions ─────────────────────────────────────────

/**
 * Test koneksi SNMP ke device
 * Response: { success: bool, message: string }
 */
export async function testSnmpConnection(deviceId) {
  return request('POST', `/devices/${deviceId}/test`);
}

/**
 * Poll 1 device sekarang (ambil data SNMP terbaru)
 * Response: { success, status, last_polled, cpu_usage, memory_percent, disk_percent }
 */
export async function pollSnmpDevice(deviceId) {
  return request('POST', `/devices/${deviceId}/poll`);
}

/**
 * Poll semua device sekarang
 * Response: { message, results: [{ device_id, hostname, success }] }
 */
export async function pollAllSnmpDevices() {
  return request('POST', '/poll');
}

// ─── Metrics ──────────────────────────────────────────────

/**
 * Ringkasan semua metrik device dalam 1 response
 * Response: { device_id, hostname, status, uptime, cpu, memory, disk, open_alerts }
 */
export async function getSnmpSummary(deviceId) {
  return request('GET', `/devices/${deviceId}/summary`);
}

/**
 * Data CPU device
 * Response: { data: Processor[], chart: { labels, datasets } }
 */
export async function getSnmpCpu(deviceId) {
  return request('GET', `/devices/${deviceId}/cpu`);
}

/**
 * Data Storage device (memory + disk)
 * Response: { data: Storage[], chart: { labels, datasets, percentages } }
 */
export async function getSnmpStorage(deviceId) {
  return request('GET', `/devices/${deviceId}/storage`);
}

/**
 * Daftar port/interface device
 * Response: { data: Port[] }
 */
export async function getSnmpPorts(deviceId) {
  return request('GET', `/devices/${deviceId}/ports`);
}

/**
 * Data traffic port (untuk grafik)
 * @param {number} portId
 * @param {string} range - '1h' | '6h' | '24h' | '7d'
 * Response: { data: Traffic[], chart: { labels, datasets } }
 */
export async function getSnmpTraffic(portId, range = '1h') {
  return request('GET', `/ports/${portId}/traffic?range=${range}`);
}

/**
 * Alert aktif device
 * @param {number} deviceId
 * @param {boolean} openOnly - hanya alert yang masih open
 * Response: { count, data: Alert[] }
 */
export async function getSnmpAlerts(deviceId, openOnly = true) {
  return request('GET', `/devices/${deviceId}/alerts?open=${openOnly ? 1 : 0}`);
}

// ─── Helper Formatters ────────────────────────────────────

/**
 * Format bytes ke human readable
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format uptime seconds ke human readable
 */
export function formatUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}