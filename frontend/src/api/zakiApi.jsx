// src/api/zakiApi.jsx
import axios from 'axios';

const zakiClient = axios.create({
  baseURL: 'http://41.216.191.42:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// KLIEN UNTUK DATABASE LARAVEL
const laravelClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Sesuaikan dengan port Laravel Anda
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const fetchZakiData = async (endpoint) => {
  try {
    const response = await zakiClient.get(endpoint);
    return response.data.data;
  } catch (error) {
    console.error(`Gagal mengambil data dari ${endpoint}:`, error);
    throw error;
  }
};

export const getZakiDashboardData = () => fetchZakiData('/monitoring/');
export const getZakiCpu           = () => fetchZakiData('/monitoring/cpu');
export const getZakiMemory        = () => fetchZakiData('/monitoring/memory');
export const getZakiDisk          = () => fetchZakiData('/monitoring/disk');
export const getZakiDocker        = () => fetchZakiData('/monitoring/docker');
export const getZakiNetwork       = () => fetchZakiData('/monitoring/network');
export const getZakiProcesses     = () => fetchZakiData('/monitoring/processes');
export const getZakiHistory       = () => fetchZakiData('/monitoring/history');

export const getZakiHealth = async () => {
  try {
    const response = await zakiClient.get('/monitoring/health');
    return response.data; 
  } catch (error) {
    console.error("Gagal mengambil status health Zaki:", error);
    throw error;
  }
};

// --- API KE LARAVEL BACKEND ---

// 1. History Container (CPU & RAM)
export const getContainerHistory = async (containerName, minutes = 1440) => {
  try {
    const response = await laravelClient.get(`/monitoring/container-history/${containerName}?minutes=${minutes}`);
    return response.data.data;
  } catch (error) {
    console.error(`Gagal mengambil histori container dari Laravel:`, error);
    return [];
  }
};

// 2. Storage Device
export const getDeviceStorage = async (deviceId) => {
  try {
    const response = await laravelClient.get(`/v1/devices/${deviceId}/storage`);
    return response.data.data || [];
  } catch (error) {
    console.error(`Gagal mengambil storage device dari Laravel:`, error);
    return [];
  }
};

// 3. Network Traffic Port
export const getPortTraffic = async (portId, minutes = 60) => {
  try {
    const response = await laravelClient.get(`/v1/ports/${portId}/traffic?minutes=${minutes}`);
    return response.data.data || [];
  } catch (error) {
    console.error(`Gagal mengambil network traffic dari Laravel:`, error);
    return [];
  }
};

// 4. Detail Device (Untuk mendapatkan daftar Port/Interface)
export const getDeviceDetail = async (deviceId) => {
  try {
    const response = await laravelClient.get(`/v1/devices/${deviceId}`);
    return response.data.data || null;
  } catch (error) {
    console.error(`Gagal mengambil detail device dari Laravel:`, error);
    return null;
  }
};