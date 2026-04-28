import { useState, useEffect, useRef } from 'react';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { getSnmpDevices, pollSnmpDevice, deleteSnmpDevice, formatUptime } from '../api/snmpApi';
import { useNotif } from '../components/NotificationProvider';

export default function MainServer() {
  const navigate = useNavigate();
  const { addNotif } = useNotif();
  const alertedRef = useRef(new Set());

  const handleRowClick = (deviceId) => {
    navigate(`/device/${deviceId}`);
  };

  const handleAddDevice = () => {
    navigate('/device/add');
  };

  // ══ SNMP DEVICE STATE ══
  const [snmpDevices, setSnmpDevices]         = useState([]);
  const [snmpMeta, setSnmpMeta]               = useState({ total: 0, online: 0, offline: 0 });
  const [snmpLoading, setSnmpLoading]         = useState(true);
  const [snmpError, setSnmpError]             = useState(false);
  const [pollingDeviceId, setPollingDeviceId] = useState(null);

  // ══ CHECK THRESHOLDS & PUSH ALERTS ══
  const checkDeviceAlerts = (devices) => {
    const THRESHOLDS = { cpu: 90, memory: 85, disk: 90 };
    const alerted = alertedRef.current;

    devices.forEach(dev => {
      const name = dev.hostname || dev.ip;

      // CPU Critical
      if (dev.cpu_percent >= THRESHOLDS.cpu) {
        const key = `cpu-${dev.device_id}`;
        if (!alerted.has(key)) {
          alerted.add(key);
          addNotif('critical', `CPU Kritis: ${name}`, `CPU usage ${dev.cpu_percent}% — melebihi batas ${THRESHOLDS.cpu}%`, true);
        }
      }

      // Memory Warning
      if (dev.memory_percent >= THRESHOLDS.memory) {
        const key = `mem-${dev.device_id}`;
        if (!alerted.has(key)) {
          alerted.add(key);
          const isCrit = dev.memory_percent >= 95;
          addNotif(isCrit ? 'critical' : 'warning', `RAM ${isCrit ? 'Kritis' : 'Tinggi'}: ${name}`, `Memory usage ${dev.memory_percent}% — ${isCrit ? 'melebihi' : 'mendekati'} batas`, isCrit);
        }
      }

      // Disk Warning
      if (dev.disk_percent >= THRESHOLDS.disk) {
        const key = `disk-${dev.device_id}`;
        if (!alerted.has(key)) {
          alerted.add(key);
          addNotif('critical', `Disk Penuh: ${name}`, `Disk usage ${dev.disk_percent}% — melebihi batas ${THRESHOLDS.disk}%`, true);
        }
      }

      // Device Offline
      if (!dev.status) {
        const key = `offline-${dev.device_id}`;
        if (!alerted.has(key)) {
          alerted.add(key);
          addNotif('critical', `Device Offline: ${name}`, `${name} (${dev.ip}) tidak merespons SNMP polling`, true);
        }
      } else {
        // Clear offline alert when back online
        alerted.delete(`offline-${dev.device_id}`);
      }

      // Reset alerts when value goes back below threshold
      if (dev.cpu_percent < THRESHOLDS.cpu - 5) alerted.delete(`cpu-${dev.device_id}`);
      if (dev.memory_percent < THRESHOLDS.memory - 5) alerted.delete(`mem-${dev.device_id}`);
      if (dev.disk_percent < THRESHOLDS.disk - 5) alerted.delete(`disk-${dev.device_id}`);
    });
  };

  // ══ FETCH SNMP DEVICES ══
  const fetchSnmpDevices = async () => {
    try {
      setSnmpError(false);
      const res = await getSnmpDevices('snmp');
      const devices = res.data || [];
      setSnmpDevices(devices);
      setSnmpMeta(res.meta || { total: 0, online: 0, offline: 0 });
      checkDeviceAlerts(devices);
    } catch (err) {
      setSnmpError(true);
    } finally {
      setSnmpLoading(false);
    }
  };

  useEffect(() => {
    fetchSnmpDevices();
    const interval = setInterval(fetchSnmpDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  // ══ POLL DEVICE HANDLER ══
  const handlePollDevice = async (e, deviceId) => {
    e.stopPropagation();
    setPollingDeviceId(deviceId);
    try {
      await pollSnmpDevice(deviceId);
      await fetchSnmpDevices();
    } catch (err) {
      console.error('Poll failed:', err);
    } finally {
      setPollingDeviceId(null);
    }
  };

  return (
    <>
      <Topbar title="Server Monitoring" subtitle="Pantau semua device SNMP yang sudah ditambahkan" />
      <div className="page-content section-gap" style={{ maxWidth: '100%' }}>

        {/* ══ SUMMARY CARDS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Device', value: snmpMeta.total, color: '#3b82f6', icon: '' },
            { label: 'Online', value: snmpMeta.online, color: '#22c55e', icon: '' },
            { label: 'Offline', value: snmpMeta.offline, color: '#ef4444', icon: '' },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 28 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ MONITORED DEVICES TABLE ══ */}
        <Card 
          title="SNMP Devices" 
          subtitle={`${snmpMeta.online} online · ${snmpMeta.offline} offline · ${snmpMeta.total} total`}
          rightElement={
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={fetchSnmpDevices}
                style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                title="Refresh device list"
              >
                ↻
              </button>
              <button 
                onClick={handleAddDevice}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Device
              </button>
            </div>
          }
        >
          {snmpError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>
              ⚠ Gagal memuat daftar device SNMP. Pastikan backend Laravel berjalan.
            </div>
          )}

          {snmpLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #f1f5f9', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              Memuat device...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr>
                    {['STATUS', 'NAMA HOST', 'IP ADDRESS', 'CPU', 'MEMORY', 'DISK', 'UPTIME', 'LAST POLLED', 'AKSI'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snmpDevices.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Belum ada device.{' '}
                        <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={handleAddDevice}>Tambah sekarang →</span>
                      </td>
                    </tr>
                  ) : snmpDevices.map((dev) => (
                    <tr 
                      key={dev.device_id}
                      onClick={() => handleRowClick(dev.device_id)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(64,114,175,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: dev.status ? '#22c55e' : '#ef4444' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dev.status ? '#22c55e' : '#ef4444', boxShadow: dev.status ? '0 0 5px #22c55e' : 'none' }} />
                          {dev.status ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#3b82f6' }}>
                        {dev.hostname}
                        {dev.sysName && dev.sysName !== dev.hostname && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{dev.sysName}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{dev.ip}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.cpu_usage ?? 0}%`, background: dev.cpu_usage > 80 ? '#ef4444' : dev.cpu_usage > 60 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.cpu_usage ?? 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.memory_percent ?? 0}%`, background: dev.memory_percent > 80 ? '#ef4444' : dev.memory_percent > 60 ? '#f59e0b' : '#22c55e', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.memory_percent ?? 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.disk_percent ?? 0}%`, background: dev.disk_percent > 80 ? '#ef4444' : dev.disk_percent > 60 ? '#f59e0b' : '#f59e0b', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.disk_percent ?? 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatUptime(dev.uptime)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {dev.last_polled ? new Date(dev.last_polled).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handlePollDevice(e, dev.device_id)}
                          disabled={pollingDeviceId === dev.device_id}
                          style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          title="Poll sekarang"
                        >
                          {pollingDeviceId === dev.device_id ? '...' : '↻ Poll'}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Hapus device "${dev.hostname}" beserta SELURUH datanya?\n\nAksi ini tidak bisa dibatalkan!`)) return;
                            try {
                              await deleteSnmpDevice(dev.device_id);
                              await fetchSnmpDevices();
                            } catch (err) {
                              alert('Gagal menghapus: ' + (err.message || 'Error'));
                            }
                          }}
                          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
                          title="Hapus device"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        
      </div>
    </>
  );
}