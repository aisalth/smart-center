import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  getZakiDashboardData, 
  getZakiHealth, 
  getZakiProcesses,
  getZakiHistory
} from '../api/zakiApi';

/* ── Helpers ─────────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (isoString) => {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const truncate = (str, n) => (str.length > n ? str.substr(0, n - 1) + '...' : str);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT: ZAKI (CONTAINER & APP PLATFORM)
══════════════════════════════════════════════════════════════ */
export default function ZakiContainerMonitor() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        setApiError(false);
        const [dashData, healthData, procData, histData] = await Promise.all([
          getZakiDashboardData(),
          getZakiHealth(),
          getZakiProcesses(),
          getZakiHistory()
        ]);

        setDashboard(dashData);
        setHealth(healthData);
        setProcesses(procData);
        setHistory(histData);
      } catch (error) {
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatformData();
    const interval = setInterval(fetchPlatformData, 10000); // Polling setiap 10 detik
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !dashboard) {
    return (
      <>
        <Topbar title="App & Container Platform" subtitle="Menghubungkan ke API..." />
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #f1f5f9', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
          <div style={{ color: '#64748b' }}>Memuat Data API Zaki...</div>
        </div>
      </>
    );
  }

  const isHealthy = health?.status === 'healthy';
  const chartData = history.map(h => ({
    time: formatTime(h.timestamp),
    percentUsed: parseFloat(h.memory.percentUsed),
    usedHuman: h.memory.used
  }));

  return (
    <>
      <Topbar title="App & Container Platform" subtitle="Monitoring Docker, Node.js Runtime, dan System Processes" />
      <div className="page-content section-gap" style={{ padding: '0 24px 40px' }}>

        {/* Notifikasi Error API */}
        {apiError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <svg width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>Koneksi API Gagal</span>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>Tidak dapat menghubungi backend. Menampilkan cache terakhir yang berhasil ditarik.</span>
          </div>
        )}

        {/* ── ROW 1: QUICK STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20, marginTop: 10 }}>
          <StatCard 
            label="API Gateway Health" 
            value={isHealthy ? 'HEALTHY' : 'DOWN'} 
            changeText={`Uptime: ${Math.floor((health?.uptime || 0) / 3600)} Jam`} 
            changeType={isHealthy ? "up" : "down"}
            color={isHealthy ? "#22c55e" : "#ef4444"} 
            bg={isHealthy ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)"} 
            delay="0s" 
          />
          <StatCard 
            label="Docker Containers" 
            value={`${dashboard?.docker?.running || 0} Running`} 
            changeText={`Dari total ${dashboard?.docker?.total || 0} Container`} 
            color="#3b82f6" bg="rgba(59,130,246,.12)" delay="0.1s" 
          />
          <StatCard 
            label="Node.js Engine" 
            value={dashboard?.nodejs?.version || 'N/A'} 
            changeText="Runtime Version" 
            color="#8b5cf6" bg="rgba(139,92,246,.12)" delay="0.2s" 
          />
          <StatCard 
            label="System Load (1m)" 
            value={dashboard?.system?.loadAverage?.["1min"] || '0.00'} 
            changeText={`5m: ${dashboard?.system?.loadAverage?.["5min"] || '0'} | 15m: ${dashboard?.system?.loadAverage?.["15min"] || '0'}`} 
            color="#f59e0b" bg="rgba(245,158,11,.12)" delay="0.3s" 
          />
        </div>

        {/* ── ROW 2: DOCKER CONTAINERS TABLE ── */}
        <Card 
          title="Running Container Instances" 
          subtitle="Daftar instance Docker yang ditarik langsung dari API (/monitoring/docker)" 
          delay="0.4s"
          style={{ marginBottom: 20 }}
        >
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Container Name & Image</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px' }}>CPU Usage</th>
                  <th style={{ padding: '12px 8px', minWidth: 200 }}>Memory Usage</th>
                </tr>
              </thead>
              <tbody>
                {(!dashboard?.docker?.containers || dashboard.docker.containers.length === 0) && (
                  <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Tidak ada data container.</td></tr>
                )}
                {dashboard?.docker?.containers?.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#334155' }} title={c.name}>
                        {truncate(c.name, 35)}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                        {c.image.split('/').pop()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <Badge variant={c.status.toLowerCase().includes('up') ? 'success' : 'danger'} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {c.status.split(' ')[0]} 
                      </Badge>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{c.status}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: parseFloat(c.stats?.cpu) > 50 ? '#ef4444' : '#3b82f6' }}>
                        {c.stats?.cpu}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{c.stats?.memUsage}</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{c.stats?.memPercent}</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: c.stats?.memPercent || '0%', background: '#8b5cf6', borderRadius: 2 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── ROW 3: NODE.JS ENGINE & TREND ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, marginBottom: 20 }}>
          
          <Card title="Node.js App Engine (V8)" subtitle="Memori Runtime dari App Utama" delay="0.5s">
            <div style={{ marginTop: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Resident Set Size (RSS)</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{formatBytes(dashboard?.nodejs?.memoryUsage?.rss)}</span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20 }}>
                <div style={{ width: '100%', height: '100%', background: '#3b82f6', borderRadius: 3 }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Heap Used / Total</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                  {formatBytes(dashboard?.nodejs?.memoryUsage?.heapUsed)} / {formatBytes(dashboard?.nodejs?.memoryUsage?.heapTotal)}
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20 }}>
                <div style={{ width: `${Math.min(100, ((dashboard?.nodejs?.memoryUsage?.heapUsed || 0) / (dashboard?.nodejs?.memoryUsage?.heapTotal || 1)) * 100)}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>External C++ Binding</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{formatBytes(dashboard?.nodejs?.memoryUsage?.external)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Array Buffers</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569' }}>{formatBytes(dashboard?.nodejs?.memoryUsage?.arrayBuffers)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>App Uptime</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', fontWeight: 700 }}>{Math.floor((dashboard?.nodejs?.uptime || 0) / 60)} Mins</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Server Memory Trend" subtitle="Histori penggunaan memori (/monitoring/history)" delay="0.6s">
            <div style={{ height: 250, width: '100%', marginTop: 10 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} 
                    formatter={(value, name, props) => [`${value}% (${props.payload.usedHuman})`, 'Terpakai']} 
                  />
                  <Area type="monotone" dataKey="percentUsed" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

        {/* ── ROW 4: TOP PROCESSES ── */}
        <Card 
          title="System Processes (ps aux)" 
          subtitle="Daftar proses server realtime (/monitoring/processes)" 
          rightElement={<Badge variant="info">{processes.length} Active</Badge>} 
          delay="0.7s"
        >
          <div style={{ overflowX: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px 8px' }}>PID</th>
                  <th style={{ padding: '10px 8px' }}>USER</th>
                  <th style={{ padding: '10px 8px' }}>CPU %</th>
                  <th style={{ padding: '10px 8px' }}>MEM %</th>
                  <th style={{ padding: '10px 8px' }}>STAT</th>
                  <th style={{ padding: '10px 8px' }}>COMMAND</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p, i) => {
                  const cpuVal = parseFloat(p.cpu);
                  const shortName = p.command.split(' ')[0].split('/').pop();
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#64748b' }}>{p.pid}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: p.user === 'root' ? '#ef4444' : '#334155' }}>{p.user}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cpuVal > 50 ? '#ef4444' : cpuVal > 10 ? '#f59e0b' : '#3b82f6', minWidth: 40 }}>
                            {p.cpu}%
                          </span>
                          <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, minWidth: 50 }}>
                            <div style={{ height: '100%', width: `${clamp(cpuVal, 0, 100)}%`, background: cpuVal > 50 ? '#ef4444' : cpuVal > 10 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#8b5cf6', fontWeight: 600 }}>{p.mem}%</td>
                      <td style={{ padding: '10px 8px' }}>
                        <Badge variant={p.stat.includes('R') ? 'success' : 'info'} style={{ fontSize: 10, padding: '2px 6px' }}>{p.stat}</Badge>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                         <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{shortName}</div>
                         <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.command}>
                           {p.command}
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </>
  );
}