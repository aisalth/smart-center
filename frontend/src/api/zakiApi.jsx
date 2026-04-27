// src/api/zakiApi.jsx
import axios from 'axios';

const zakiClient = axios.create({
  baseURL: 'http://41.216.191.42:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// KLIEN BARU UNTUK DATABASE LARAVEL
const laravelClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Sesuaikan dengan port Laravel Anda
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper penangkap response standar Zaki { success, timestamp, data }
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

// Khusus health check, strukturnya langsung me-return { status, uptime, timestamp }
export const getZakiHealth = async () => {
  try {
    const response = await zakiClient.get('/monitoring/health');
    return response.data; 
  } catch (error) {
    console.error("Gagal mengambil status health Zaki:", error);
    throw error;
  }
};

// --- TAMBAHAN FITUR: Ambil History dari Laravel dengan Filter Waktu ---
export const getContainerHistory = async (containerName, minutes = 1440) => {
  try {
    const response = await laravelClient.get(`/monitoring/container-history/${containerName}?minutes=${minutes}`);
    return response.data.data;
  } catch (error) {
    console.error(`Gagal mengambil histori container ${containerName} dari Laravel:`, error);
    return [];
  }
};