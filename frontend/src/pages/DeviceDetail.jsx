import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// ══ SNMP API IMPORT ══
import { getSnmpSummary, getSnmpCpu, getSnmpStorage, getSnmpPorts, getSnmpTraffic, pollSnmpDevice, deleteSnmpDevice, formatUptime, getSnmpMetricsHistory } from '../api/snmpApi';

// Data Dummy untuk Grafik (fallback saat data belum ada)
const generateDummyData = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: `10:${10 + i}`,
    val: Math.floor(Math.random() * 40) + 20,
  }));
};

// Komponen Grafik Reusable (kode asli dipertahankan)
function MiniChart({ title, data, color, unit, domain = [0, 100], chartHeight = 220 }) {
  const id = `chart-${title.replace(/\s/g, '')}`;
  return (
    <Card title={title} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: chartHeight, marginTop: 15, marginLeft: -20, marginRight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeOpacity={0.5} />
            <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} dy={10} minTickGap={15} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}${unit}`} width={45} tick={{fill: 'var(--text-muted)'}} domain={domain} ticks={domain[0] === 0 && domain[1] === 100 ? [0, 25, 50, 75, 100] : undefined} />
            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} itemStyle={{ color: color, fontWeight: 'bold' }} />
            <Area type="monotone" dataKey="val" name={title} stroke={color} fillOpacity={1} fill={`url(#${id})`} strokeWidth={2.5} isAnimationActive={true} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function DeviceDetail() {
  const navigate  = useNavigate();
  const { id }    = useParams(); // Ambil device_id dari URL /device/:id

  // ══ SNMP DATA STATE ══
  const [summary, setSummary]       = useState(null);
  const [ports, setPorts]           = useState([]);
  const [selectedPort, setSelectedPort] = useState(null);
  const [trafficData, setTrafficData]   = useState([]);
  const [trafficRange, setTrafficRange] = useState('1h');
  const [isLoading, setIsLoading]   = useState(true);
  const [isPolling, setIsPolling]   = useState(false);
  const [error, setError]           = useState(null);
  const [lastFetch, setLastFetch]   = useState('—');

  // ══ History data dari API ══
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const [diskHistory, setDiskHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState('1h');

  // Dummy data fallback
  const [procData]    = useState(generateDummyData());
  const [diskData]    = useState(generateDummyData());
  const [networkData] = useState(generateDummyData().map(d => ({...d, val: d.val * 10})));

  // ══ FETCH METRICS HISTORY ══
  const fetchHistory = async (range) => {
    if (!id) return;
    try {
      const res = await getSnmpMetricsHistory(id, 'all', range);
      const charts = res.charts || {};

      if (charts.cpu) {
        setCpuHistory(charts.cpu.labels.map((label, i) => ({ time: label, val: charts.cpu.data[i] ?? 0 })));
      } else {
        setCpuHistory([]);
      }

      if (charts.memory) {
        setMemHistory(charts.memory.labels.map((label, i) => ({ time: label, val: charts.memory.data[i] ?? 0 })));
      } else {
        setMemHistory([]);
      }

      if (charts.disk) {
        setDiskHistory(charts.disk.labels.map((label, i) => ({ time: label, val: charts.disk.data[i] ?? 0 })));
      } else {
        setDiskHistory([]);
      }
    } catch (err) {
      console.error('History fetch failed:', err);
    }
  };

  // ══ FETCH SUMMARY ══
  const fetchData = async () => {
    if (!id) return;
    try {
      setError(null);
      const [summaryRes, portsRes] = await Promise.all([
        getSnmpSummary(id),
        getSnmpPorts(id),
      ]);

      setSummary(summaryRes);
      setPorts(portsRes.data || []);
      setLastFetch(new Date().toLocaleTimeString('id-ID'));

    } catch (err) {
      setError(err.message || 'Gagal memuat data device.');
    } finally {
      setIsLoading(false);
    }
  };

  // ══ FETCH TRAFFIC ══
  const fetchTraffic = async (portId, range) => {
    try {
      const res = await getSnmpTraffic(portId, range);
      const chartData = (res.chart?.labels || []).map((label, i) => ({
        time: label,
        in:   res.chart.datasets[0]?.data[i] ?? 0,
        out:  res.chart.datasets[1]?.data[i] ?? 0,
      }));
      setTrafficData(chartData);
    } catch (err) {
      console.error('Traffic fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistory(historyRange);
    // Auto refresh setiap 60 detik
    const interval = setInterval(() => {
      fetchData();
      fetchHistory(historyRange);
    }, 60000);
    return () => clearInterval(interval);
  }, [id, historyRange]);

  useEffect(() => {
    if (selectedPort) {
      fetchTraffic(selectedPort, trafficRange);
    }
  }, [selectedPort, trafficRange]);

  // ══ POLL MANUAL ══
  const handlePoll = async () => {
    setIsPolling(true);
    try {
      await pollSnmpDevice(id);
      await fetchData();
    } catch (err) {
      console.error('Poll failed:', err);
    } finally {
      setIsPolling(false);
    }
  };

  // ══ LOADING STATE ══
  if (isLoading) {
    return (
      <>
        <Topbar title="Device Detail" subtitle="Memuat data..." backButton={true} />
        <div className="page-content section-gap" style={{ maxWidth: '100%', textAlign: 'center', marginTop: 50 }}>
          <div style={{ display: 'inline-block', padding: '20px 40px', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #f1f5f9', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: 13 }}>Menarik data SNMP...</div>
          </div>
        </div>
      </>
    );
  }

  // ══ DEVICE INFO ══
  const deviceInfo = {
    name:       summary?.hostname       ?? 'Unknown',
    processor:  summary?.cpu?.details?.[0]?.descr ?? '—',
    os:         summary?.sysDescr       ?? '—',
    oid:        '.1.3.6.1.2.1.1',
    uptime:     formatUptime(summary?.uptime),
    lastPolled: summary?.last_polled ? new Date(summary.last_polled).toLocaleString('id-ID') : '—',
  };

  // Storage data untuk bar chart
  const storageChartData = [
    ...(summary?.memory || []).map(m => ({ name: m.descr, used: m.used_gb || 0, free: m.free_gb || 0, perc: m.perc })),
    ...(summary?.disk   || []).map(d => ({ name: d.descr, used: d.used_gb || 0, free: d.free_gb || 0, perc: d.perc })),
  ];

  return (
    <>
      <Topbar title={`Device: ${deviceInfo.name}`} subtitle="Detail monitoring spesifik perangkat" backButton={true} />
      
      <div className="page-content section-gap" style={{ maxWidth: '100%' }}>
        
        {/* Tombol Kembali (kode asli dipertahankan) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button 
            onClick={() => navigate('/server')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'translateX(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.transform = 'translateX(0)'; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Kembali ke Server
          </button>

          {/* ══ POLL & DELETE BUTTONS ══ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Update: {lastFetch}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: summary?.status ? '#22c55e' : '#ef4444' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: summary?.status ? '#22c55e' : '#ef4444', boxShadow: summary?.status ? '0 0 5px #22c55e' : 'none' }} />
              {summary?.status ? 'Online' : 'Offline'}
            </span>
            <button
              onClick={handlePoll}
              disabled={isPolling}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isPolling ? 'not-allowed' : 'pointer', opacity: isPolling ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isPolling ? '...' : '↻ Poll Now'}
            </button>
            <button
              onClick={async () => {
                if (!window.confirm(`Hapus device "${summary?.hostname || 'ini'}" beserta SELURUH datanya (CPU, Memory, Disk, Port, Traffic, History)?\n\nAksi ini tidak bisa dibatalkan!`)) return;
                try {
                  await deleteSnmpDevice(id);
                  alert('Device berhasil dihapus.');
                  navigate('/server');
                } catch (err) {
                  alert('Gagal menghapus: ' + (err.message || 'Unknown error'));
                }
              }}
              style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
            >
              🗑 Hapus
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {/* ══ ROW 1: INFO TABLE & CPU GRAPH ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start', marginBottom: 24 }}>
          
          <Card title="Device Information" subtitle="Spesifikasi & Status" style={{ height: '100%' }}>
            <div style={{ marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    { label: 'Name Host',  value: deviceInfo.name },
                    { label: 'Processor',  value: deviceInfo.processor },
                    { label: 'OS',         value: deviceInfo.os },
                    { label: 'System OID', value: deviceInfo.oid },
                    { label: 'Up/Down Time', value: deviceInfo.uptime },
                    { label: 'Last Polled',  value: deviceInfo.lastPolled },
                    // ══ DATA SNMP TAMBAHAN ══
                    { label: 'CPU Usage',   value: `${summary?.cpu?.details?.[0]?.usage ?? 0}%` },
                    { label: 'Open Alerts', value: summary?.open_alerts ?? 0 },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px dashed var(--card-border)' }}>
                      <td style={{ padding: '16px 8px 16px 0', fontWeight: 600, color: 'var(--text-muted)', width: '35%', verticalAlign: 'top' }}>
                        {row.label}
                      </td>
                      <td style={{ padding: '16px 0 16px 8px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)', verticalAlign: 'top', wordBreak: 'break-word', fontSize: 12 }}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* CPU Chart — pakai data real dari history API */}
          <MiniChart 
            title="Processor Load" 
            data={cpuHistory.length > 0 ? cpuHistory : procData} 
            color="#3b82f6" 
            unit="%" 
            chartHeight={310} 
          />
        </div>

        {/* ══ HISTORY RANGE FILTER ══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>History Range:</span>
          {['1h', '6h', '24h', '7d', '30d'].map(r => (
            <button
              key={r}
              onClick={() => setHistoryRange(r)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${historyRange === r ? '#3b82f6' : 'var(--card-border)'}`,
                background: historyRange === r ? 'rgba(59,130,246,0.1)' : 'var(--card-bg)',
                color: historyRange === r ? '#3b82f6' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {r === '1h' ? '1 Jam' : r === '6h' ? '6 Jam' : r === '24h' ? '24 Jam' : r === '7d' ? '7 Hari' : '30 Hari'}
            </button>
          ))}
        </div>

        {/* ══ ROW 2: CPU HISTORY & RAM HISTORY ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <MiniChart 
            title="CPU History" 
            data={cpuHistory.length > 0 ? cpuHistory : []} 
            color="#8b5cf6" 
            unit="%" 
            chartHeight={220} 
          />
          <MiniChart 
            title="Memory History" 
            data={memHistory.length > 0 ? memHistory : []} 
            color="#22c55e" 
            unit="%" 
            chartHeight={220} 
          />
        </div>

        {/* ══ ROW 2.5: DISK HISTORY ══ */}
        {diskHistory.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 24 }}>
            <MiniChart 
              title="Disk Usage History" 
              data={diskHistory} 
              color="#f59e0b" 
              unit="%" 
              chartHeight={220} 
            />
          </div>
        )}

        {/* ══ ROW 3: STORAGE BAR CHART & NETWORK TRAFFIC ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          
          {/* Storage Bar Chart */}
          <Card title="Storage Usage" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 220, marginTop: 15 }}>
              {storageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}GB`} width={45} tick={{fill: 'var(--text-muted)'}} />
                    <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} GB`]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="used" name="Used (GB)" fill="#ef4444" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="free" name="Free (GB)" fill="#22c55e" fillOpacity={0.4} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                  Belum ada data storage
                </div>
              )}
            </div>
          </Card>

          {/* Network Traffic */}
          <Card title="Network Traffic" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Port selector + range */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <select 
                value={selectedPort || ''} 
                onChange={e => setSelectedPort(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="">Pilih interface</option>
                {ports.map(p => (
                  <option key={p.port_id} value={p.port_id}>
                    {p.ifName || p.ifDescr} ({p.ifOperStatus})
                  </option>
                ))}
              </select>
              <select 
                value={trafficRange} 
                onChange={e => setTrafficRange(e.target.value)}
                style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="1h">1 Jam</option>
                <option value="6h">6 Jam</option>
                <option value="24h">24 Jam</option>
                <option value="7d">7 Hari</option>
              </select>
            </div>

            <div style={{ height: 185, marginLeft: -20 }}>
              {trafficData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeOpacity={0.5} />
                    <XAxis dataKey="time" fontSize={9} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}K`} width={40} tick={{fill: 'var(--text-muted)'}} />
                    <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} Kbps`]} />
                    <Area type="monotone" dataKey="in" name="In (Kbps)" stroke="#0ea5e9" fill="url(#colorIn)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="out" name="Out (Kbps)" stroke="#8b5cf6" fill="url(#colorOut)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
                  {selectedPort ? 'Belum ada data traffic' : 'Pilih interface untuk melihat traffic'}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ══ ROW 4: PORTS TABLE ══ */}
        <Card title="Network Interfaces" subtitle={`${ports.length} interface ditemukan`} style={{ marginBottom: 24 }}>
          {ports.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Belum ada data port.</div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['INTERFACE', 'DESKRIPSI', 'TYPE', 'SPEED', 'ADMIN', 'STATUS', 'TRAFFIC'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ports.map((port) => (
                    <tr key={port.port_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(64,114,175,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700 }}>{port.ifName}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{port.ifDescr}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)' }}>{port.ifType}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{port.speed_human}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 4, background: port.ifAdminStatus === 'up' ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)', color: port.ifAdminStatus === 'up' ? '#22c55e' : '#64748b' }}>
                          {port.ifAdminStatus ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 4, background: port.is_up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: port.is_up ? '#22c55e' : '#ef4444' }}>
                          {port.ifOperStatus ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => setSelectedPort(port.port_id)}
                          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${selectedPort == port.port_id ? '#3b82f6' : 'var(--card-border)'}`, background: selectedPort == port.port_id ? 'rgba(59,130,246,0.1)' : 'transparent', color: selectedPort == port.port_id ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {selectedPort == port.port_id ? '● Live' : 'Traffic'}
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