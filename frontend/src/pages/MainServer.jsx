import { useState, useEffect, useRef } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  getZakiDashboardData, getZakiHealth, getZakiNetwork, getZakiProcesses, 
  getZakiHistory 
} from '../api/zakiApi';

import { getSnmpDevices, pollSnmpDevice, formatUptime } from '../api/snmpApi';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmtPct = (v) => `${parseFloat(v || 0).toFixed(1)}%`;

function RingGauge({ pct, label, color, size = 160, stroke = 12 }) {
  const radius = (size - stroke) / 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const st = pct > 85 ? 'danger' : pct > 65 ? 'warning' : 'ok';
  const sc = st === 'danger' ? '#ef4444' : st === 'warning' ? '#f59e0b' : color;
  
  return (
    <div className="server-ring-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="server-ring" style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--accent-light)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={sc} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease' }} />
        </svg>
        <div className="ring-center" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="ring-pct" style={{ color: sc, fontSize: 24, fontWeight: 'bold' }}>{pct.toFixed(0)}%</div>
          <div className="ring-unit" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <Badge variant={st === 'danger' ? 'danger' : st === 'warning' ? 'warning' : 'success'} dot>
          {st === 'danger' ? 'KRITIS' : st === 'warning' ? 'TINGGI' : 'NORMAL'}
        </Badge>
      </div>
    </div>
  );
}

/* ── Sparkline ───────────────────────────────────────────── */
function Sparkline({ data, color }) {
  const id = `sg-${color.replace('#', '')}`;
  return (
    <div style={{ height: 60, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="val" stroke={color} fill={`url(#${id})`} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const HealthDot = ({ isOnline }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: isOnline ? '#22c55e' : '#ef4444' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', animation: 'blink 1.5s infinite', boxShadow: `0 0 6px ${isOnline ? '#22c55e' : '#ef4444'}` }} />
    {isOnline ? 'ONLINE' : 'OFFLINE'}
  </span>
);

export default function MainServer() {
  const navigate = useNavigate();

  const handleRowClick = (deviceId) => {
    navigate(`/device/${deviceId}`);
  };

  const handleAddDevice = () => {
    navigate('/device/add');
  };

  const [sysData, setSysData]       = useState(null);
  const [cpuData, setCpuData]       = useState(null);
  const [memData, setMemData]       = useState(null);
  const [diskData, setDiskData]     = useState(null);
  
  const [health, setHealth]       = useState(null);
  const [processes, setProcesses] = useState([]);
  const [network, setNetwork]     = useState([]);
  
  const [apiError, setApiError]   = useState(false);
  const [lastFetch, setLastFetch] = useState('--:--:--');
  const [isLoading, setIsLoading] = useState(true);

  const [cpuHist, setCpuHist]   = useState([]);
  const [ramHist, setRamHist]   = useState([]);
  const [diskHist, setDiskHist] = useState([]);

  // ══ SNMP DEVICE STATE ══
  const [snmpDevices, setSnmpDevices]         = useState([]);
  const [snmpMeta, setSnmpMeta]               = useState({ total: 0, online: 0, offline: 0 });
  const [snmpLoading, setSnmpLoading]         = useState(true);
  const [snmpError, setSnmpError]             = useState(false);
  const [pollingDeviceId, setPollingDeviceId] = useState(null);

  const lastAlertTime = useRef(0);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // ══ FETCH ZAKI API (existing) ══
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [
          dataDashboard, dataHealth, dataNetwork, dataProcesses, dataHistory
        ] = await Promise.all([
          getZakiDashboardData(), 
          getZakiHealth(), 
          getZakiNetwork(), 
          getZakiProcesses(),
          getZakiHistory()
        ]);

        setSysData(dataDashboard);
        setHealth(dataHealth);
        setProcesses(dataProcesses);
        
        setCpuData(dataDashboard.cpu);
        setMemData(dataDashboard.memory);
        setDiskData(dataDashboard.disk);
        
        if (dataNetwork) {
          const flatNetwork = Object.entries(dataNetwork).flatMap(([iface, arr]) => 
            arr.map(n => ({ iface, ...n }))
          );
          setNetwork(flatNetwork);
        }

        if (dataHistory && Array.isArray(dataHistory)) {
           const historyMap = dataHistory.slice(-30).map(h => ({
               t: new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
               val: parseFloat(h.memory.percentUsed)
           }));
           setRamHist(historyMap);
        }

        const curCpu = parseFloat(dataDashboard.cpu.usage.percentUsed || 0);
        const curRam = parseFloat(dataDashboard.memory.percentUsed || 0);
        const curDisk = parseFloat(dataDashboard.disk.percentUsed || 0);
        
        setCpuHist(prev => {
            const next = [...prev, { t: new Date().toLocaleTimeString(), val: curCpu }];
            return next.length > 20 ? next.slice(1) : next;
        });
        
        setDiskHist(prev => {
            const next = [...prev, { t: new Date().toLocaleTimeString(), val: curDisk }];
            return next.length > 20 ? next.slice(1) : next;
        });

        setApiError(false);
        setLastFetch(new Date().toLocaleTimeString('id-ID'));

        if ((curCpu > 85 || curRam > 85) && "Notification" in window && Notification.permission === "granted") {
            const now = Date.now();
            if (now - lastAlertTime.current > 60000) { 
                new Notification("⚠ Peringatan Kritis SmartDeploy", {
                    body: `Kondisi Server: CPU ${curCpu.toFixed(1)}% | RAM ${curRam.toFixed(1)}%. Segera periksa dashboard!`,
                    icon: "/favicon.ico" 
                });
                lastAlertTime.current = now;
            }
        }

      } catch (error) {
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  // ══ FETCH SNMP DEVICES ══
  const fetchSnmpDevices = async () => {
    try {
      setSnmpError(false);
      const res = await getSnmpDevices();
      setSnmpDevices(res.data || []);
      setSnmpMeta(res.meta || { total: 0, online: 0, offline: 0 });
    } catch (err) {
      setSnmpError(true);
    } finally {
      setSnmpLoading(false);
    }
  };

  useEffect(() => {
    fetchSnmpDevices();
    // Refresh device list setiap 30 detik
    const interval = setInterval(fetchSnmpDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  // ══ POLL DEVICE HANDLER ══
  const handlePollDevice = async (e, deviceId) => {
    e.stopPropagation(); // Jangan trigger row click
    setPollingDeviceId(deviceId);
    try {
      await pollSnmpDevice(deviceId);
      await fetchSnmpDevices(); // Refresh list setelah poll
    } catch (err) {
      console.error('Poll failed:', err);
    } finally {
      setPollingDeviceId(null);
    }
  };

  if (isLoading && !sysData) {
    return (
      <>
        <Topbar title="SmartDeploy Monitoring Center" subtitle="Menghubungkan ke Server 41.216.191.42..." />
        <div className="page-content section-gap" style={{ maxWidth: '100%', textAlign: 'center', marginTop: 50 }}>
           <div style={{ display: 'inline-block', padding: '20px 40px', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #f1f5f9', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
              <div style={{ fontWeight: 600 }}>Menarik Data API...</div>
           </div>
        </div>
      </>
    );
  }

  const cpu  = parseFloat(cpuData?.usage?.percentUsed || 0);
  const ram  = parseFloat(memData?.percentUsed      || 0);
  const disk = parseFloat(diskData?.percentUsed       || 0);

  const cpuColor  = cpu  > 85 ? '#ef4444' : cpu  > 65 ? '#f59e0b' : '#4072af';
  const ramColor  = ram  > 85 ? '#ef4444' : ram  > 65 ? '#f59e0b' : '#22c55e';
  const diskColor = disk > 85 ? '#ef4444' : disk > 65 ? '#f59e0b' : '#f59e0b';

  const isCritical = cpu > 85 || ram > 85 || disk > 85;
  const isOnline   = health?.status === 'healthy';
  const uptime     = sysData?.system?.uptime?.formatted ?? '—';
  const loadAvg    = sysData?.system?.loadAverage;

  return (
    <>
      <Topbar title="SmartDeploy Monitoring Center" subtitle="Pantau kondisi CPU, RAM, Network, dan Container secara real-time" />
      <div className="page-content section-gap" style={{ maxWidth: '100%' }}>

        {apiError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>Koneksi API Terputus / Gagal</span>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>Pastikan backend server berjalan normal. Menampilkan cache terakhir.</span>
          </div>
        )}

        {isCritical && !apiError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>⚠ Peringatan Sistem</span>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>Salah satu resource melebihi batas kritis. Segera periksa!</span>
          </div>
        )}
        
        {/* ══ MONITORED DEVICES — SNMP INTEGRATED ══ */}
        <Card 
          title="Monitored Devices" 
          subtitle={`${snmpMeta.online} online · ${snmpMeta.offline} offline · ${snmpMeta.total} total`}
          delay="0.45s" 
          style={{ marginTop: 20 }}
          rightElement={
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Refresh Button */}
              <button 
                onClick={fetchSnmpDevices}
                style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                title="Refresh device list"
              >
                ↻
              </button>
              {/* Add Device Button */}
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
          {/* Error State */}
          {snmpError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>
              ⚠ Gagal memuat daftar device SNMP. Pastikan backend Laravel berjalan.
            </div>
          )}

          {/* Loading State */}
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
                      {/* Status */}
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: dev.status ? '#22c55e' : '#ef4444' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dev.status ? '#22c55e' : '#ef4444', boxShadow: dev.status ? '0 0 5px #22c55e' : 'none' }} />
                          {dev.status ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      {/* Hostname */}
                      <td style={{ padding: '12px', fontWeight: 600, color: '#3b82f6' }}>
                        {dev.hostname}
                        {dev.sysName && dev.sysName !== dev.hostname && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{dev.sysName}</div>
                        )}
                      </td>

                      {/* IP */}
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                        {dev.ip}
                      </td>

                      {/* CPU */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.cpu_usage ?? 0}%`, background: dev.cpu_usage > 80 ? '#ef4444' : dev.cpu_usage > 60 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.cpu_usage ?? 0}%</span>
                        </div>
                      </td>

                      {/* Memory */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.memory_percent ?? 0}%`, background: dev.memory_percent > 80 ? '#ef4444' : dev.memory_percent > 60 ? '#f59e0b' : '#22c55e', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.memory_percent ?? 0}%</span>
                        </div>
                      </td>

                      {/* Disk */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dev.disk_percent ?? 0}%`, background: dev.disk_percent > 80 ? '#ef4444' : dev.disk_percent > 60 ? '#f59e0b' : '#f59e0b', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{dev.disk_percent ?? 0}%</span>
                        </div>
                      </td>

                      {/* Uptime */}
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatUptime(dev.uptime)}
                      </td>

                      {/* Last Polled */}
                      <td style={{ padding: '12px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {dev.last_polled ? new Date(dev.last_polled).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
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