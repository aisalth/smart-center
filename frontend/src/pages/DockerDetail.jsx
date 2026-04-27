import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, BarChart, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Import API baru yang sudah tersambung ke Laravel
import { 
  getZakiDashboardData, 
  getContainerHistory, 
  getDeviceStorage, 
  getPortTraffic,
  getDeviceDetail 
} from '../api/zakiApi';

/* ── Helpers ─────────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatNumberOnly = (bytes) => {
  if (!bytes || bytes === 0) return '0';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1));
};

const formatUnitOnly = (bytes) => {
  if (!bytes || bytes === 0) return 'B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return sizes[i];
};

const truncate = (str, n) => (str && str.length > n ? str.substr(0, n - 1) + '...' : str);

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT: DOCKER CONTAINER MONITOR
══════════════════════════════════════════════════════════════ */
export default function ContainerDocker() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State untuk menyimpan riwayat Heap Memory (maksimal 30 titik)
  const [heapTrend, setHeapTrend] = useState([]);

  // --- STATE DATABASE HISTORY (DARI LARAVEL) ---
  const [historyData, setHistoryData] = useState([]);
  const [storageData, setStorageData] = useState([]);
  const [networkTraffic, setNetworkTraffic] = useState([]);
  const [interfaces, setInterfaces] = useState([]);

  // --- STATE FILTER & SELECTION ---
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [timeFilter, setTimeFilter] = useState(1440); // Filter default 24 Jam
  const [selectedInterface, setSelectedInterface] = useState('');
  const [netTimeFilter, setNetTimeFilter] = useState(60); // Default 1 Jam

  // GANTI INI DENGAN ID DEVICE DOCKER KAMU DI TABEL 'devices' MYSQL
  const deviceId = 1; 

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Ambil data live Docker Engine
        const apiData = await getZakiDashboardData();
        setData(apiData);
        setError(null);

        if (apiData?.nodejs?.memoryUsage?.heapUsed) {
          setHeapTrend(prev => [...prev, apiData.nodejs.memoryUsage.heapUsed].slice(-30));
        }

        const containers = apiData?.docker?.containers || [];
        let targetName = selectedContainer;
        if (!targetName && containers.length > 0) {
          targetName = containers[0].name;
          setSelectedContainer(targetName);
        }

        if (targetName) {
          // 2. Fetch CPU & RAM Container dari Laravel
          const history = await getContainerHistory(targetName, timeFilter);
          const formattedHistory = history.map(h => ({
            time: new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            cpu: parseFloat(h.cpu_usage_percent || 0),
            ram: parseFloat(h.mem_usage_percent || 0)
          }));
          setHistoryData(formattedHistory);

          // 3. Fetch Storage Device dari Laravel
          const storageRes = await getDeviceStorage(deviceId);
          setStorageData(storageRes);

          // 4. Fetch Daftar Interface/Port dari Laravel
          const deviceDetail = await getDeviceDetail(deviceId);
          if (deviceDetail?.ports) {
            setInterfaces(deviceDetail.ports);
            if (!selectedInterface && deviceDetail.ports.length > 0) {
              setSelectedInterface(deviceDetail.ports[0].id); // Pilih port pertama otomatis
            }
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Gagal memuat data dari server");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 5000); 
    return () => clearInterval(interval);
  }, [selectedContainer, timeFilter]); 

  // --- EFFECT KHUSUS UNTUK FETCH NETWORK TRAFFIC ---
  useEffect(() => {
    const fetchTraffic = async () => {
      if (!selectedInterface) return;
      const traffic = await getPortTraffic(selectedInterface, netTimeFilter);
      // Asumsi format backend: [{ timestamp: '...', inbound: 10, outbound: 5 }]
      const formattedTraffic = traffic.map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        inbound: parseFloat(t.inbound || 0),
        outbound: parseFloat(t.outbound || 0)
      }));
      setNetworkTraffic(formattedTraffic);
    };

    fetchTraffic();
    const intv = setInterval(fetchTraffic, 10000); // Refresh traffic tiap 10 dtk
    return () => clearInterval(intv);
  }, [selectedInterface, netTimeFilter]);

  if (isLoading && !data) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
         <div style={{ width: 40, height: 40, border: '3px solid #f1f5f9', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
         <div style={{ color: '#64748b' }}>Memuat Konfigurasi Infrastruktur...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>
        <h3>Koneksi Terputus</h3>
        <p>{error}</p>
      </div>
    );
  }

  const system = data?.system || {};
  const docker = data?.docker || { running: 0, total: 0, containers: [] };
  const nodejs = data?.nodejs || {};
  const containers = docker.containers || [];
  const stoppedContainers = docker.total - docker.running;

  // --- LOGIKA SVG GENERATOR UNTUK GRAFIK MELENGKUNG (FITUR LAMA) ---
  const maxVal = Math.max(...heapTrend, 1) * 1.05; 
  const minVal = Math.min(...heapTrend, maxVal) * 0.95; 
  const range = maxVal - minVal || 1;

  const pathData = heapTrend.map((val, i) => {
    const x = (i / Math.max(heapTrend.length - 1, 1)) * 100;
    const y = 50 - ((val - minVal) / range) * 50; 
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaData = pathData ? `${pathData} L 100 50 L 0 50 Z` : '';

  return (
    <>
      <Topbar title="Docker Infrastructure" subtitle="Portainer-style Monitoring: Engine, Containers, & Live Events" />
      <div className="page-content section-gap" style={{ padding: '0 24px 40px' }}>

        {/* ── ROW 1: DOCKER ENGINE STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20, marginTop: 10 }}>
          <StatCard label="Docker Host" value={system.hostname || '-'} changeText={`OS: ${system.platform || '-'} ${system.arch || ''}`} color="#3b82f6" bg="rgba(59,130,246,.12)" delay="0s" />
          <StatCard label="Containers" value={`${docker.running} Running`} changeText={`${stoppedContainers} Stopped / Exited`} changeType={stoppedContainers > 0 ? "down" : "up"} color={stoppedContainers > 0 ? "#ef4444" : "#22c55e"} bg={stoppedContainers > 0 ? "rgba(239,68,68,.12)" : "rgba(34,197,94,.12)"} delay="0.1s" />
          <StatCard label="Docker Images" value="-" changeText="Data not provided by API" color="#8b5cf6" bg="rgba(139,92,246,.12)" delay="0.2s" />
          <StatCard label="Volumes & Networks" value="-" changeText="Data not provided by API" color="#f59e0b" bg="rgba(245,158,11,.12)" delay="0.3s" />
        </div>

        {/* ── ROW 2: ADVANCED CONTAINER TABLE (ORISINAL) ── */}
        <Card title="Container Instances" subtitle="Real-time resource, port mapping, and network I/O per container" delay="0.4s" style={{ marginBottom: 20 }}>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 8px' }}>Name & Image</th>
                  <th style={{ padding: '12px 8px' }}>State / Health</th>
                  <th style={{ padding: '12px 8px' }}>Published Ports</th>
                  <th style={{ padding: '12px 8px' }}>CPU</th>
                  <th style={{ padding: '12px 8px' }}>RAM Usage</th>
                  <th style={{ padding: '12px 8px' }}>Net I/O (Rx/Tx)</th>
                  <th style={{ padding: '12px 8px' }}>Block I/O</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>History</th>
                </tr>
              </thead>
              <tbody>
                {containers.length > 0 ? containers.map((c, i) => {
                  const isRunning = c.status && c.status.toLowerCase().startsWith('up');
                  const memPctRaw = c.stats?.memPercent || '0%';
                  const memPct = parseFloat(memPctRaw.replace('%', '')) || 0;
                  const isSelected = selectedContainer === c.name;
                  
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(139,92,246,0.04)' : 'transparent' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#334155' }} title={c.name}>{truncate(c.name || '-', 40)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 4 }}>{c.image || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <Badge variant={isRunning ? 'success' : 'danger'} style={{ fontSize: 10, padding: '4px 8px' }}>{isRunning ? 'RUNNING' : 'EXITED/UNKNOWN'}</Badge>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>{c.status || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4072af' }}>-</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#334155' }}>{c.stats?.cpu || '0.00%'}</span>
                      </td>
                      <td style={{ padding: '12px 8px', minWidth: '150px' }}>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span>{c.stats?.memUsage || '0B / 0B'}</span>
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{c.stats?.memPercent || '0.00%'}</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${memPct}%`, background: memPct > 80 ? '#ef4444' : '#8b5cf6', borderRadius: 3 }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>-</td>
                      <td style={{ padding: '12px 8px', fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>-</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedContainer(c.name)}
                          style={{
                            padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                            background: isSelected ? '#8b5cf6' : '#fff', color: isSelected ? '#fff' : '#64748b',
                            fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
                          }}
                        >
                          {isSelected ? 'Viewing' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="8" style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Belum ada container yang terdeteksi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── ROW 3: FITUR BARU 4 GRID DARI LARAVEL ── */}
        {selectedContainer && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Performance Overview</div>
                <div style={{ fontSize: 13, color: '#8b5cf6', marginTop: 2, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{selectedContainer}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(Number(e.target.value))}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', color: '#475569', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value={15}>15 Menit Terakhir</option>
                  <option value={30}>30 Menit Terakhir</option>
                  <option value={60}>1 Jam Terakhir</option>
                  <option value={180}>3 Jam Terakhir</option>
                  <option value={1440}>24 Jam Terakhir</option>
                  <option value={10080}>7 Hari Terakhir</option>
                  <option value={43200}>30 Hari Terakhir</option>
                </select>
              </div>
            </div>

            {/* Grid 4 Kotak (CPU, RAM, Storage, Network) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              
              {/* 1. CPU Utilization (Garis Ungu) */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', height: 260, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: '#0f172a' }}>CPU Utilization</div>
                <div style={{ flex: 1 }}>
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={30} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fill="transparent" strokeWidth={2.5} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12}}>Data tidak tersedia</div>}
                </div>
              </div>

              {/* 2. RAM Usage (Area Hijau) */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', height: 260, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: '#0f172a' }}>RAM Usage</div>
                <div style={{ flex: 1 }}>
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRamGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={30} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="ram" stroke="#22c55e" fill="url(#colorRamGreen)" strokeWidth={2.5} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12}}>Data tidak tersedia</div>}
                </div>
              </div>

              {/* 3. Storage Usage (Data dari Laravel) */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', height: 260, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: '#0f172a' }}>Storage Usage</div>
                <div style={{ flex: 1 }}>
                  {storageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={storageData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}GB`} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="square" wrapperStyle={{ fontSize: 11, bottom: -10 }} />
                        <Bar dataKey="used" name="Used (GB)" fill="#f87171" radius={[2, 2, 0, 0]} barSize={35} />
                        <Bar dataKey="free" name="Free (GB)" fill="#86efac" radius={[2, 2, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12}}>Data Storage tidak tersedia dari server</div>}
                </div>
              </div>

              {/* 4. Network Traffic (Data Dinamis dari Laravel) */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', height: 260, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: '#0f172a' }}>Network Traffic</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <select 
                    value={selectedInterface} 
                    onChange={(e) => setSelectedInterface(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', outline: 'none', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">Pilih interface</option>
                    {interfaces.map(iface => (
                      <option key={iface.id} value={iface.id}>{iface.ifDescr || iface.name || `Port ${iface.id}`}</option>
                    ))}
                  </select>
                  <select 
                    value={netTimeFilter} 
                    onChange={(e) => setNetTimeFilter(Number(e.target.value))}
                    style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', outline: 'none', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value={60}>1 Jam</option>
                    <option value={180}>3 Jam</option>
                    <option value={1440}>24 Jam</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  {networkTraffic.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={networkTraffic} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v} Mbps`} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="inbound" name="Inbound" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="outbound" name="Outbound" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
                      {selectedInterface ? 'Mencari data traffic...' : 'Pilih interface untuk melihat traffic'}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── ROW 4: APP RUNTIME & HEAP TREND (ORISINAL) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
          
          <Card title={`Node.js ${nodejs.version || ''}`} subtitle="Alokasi memori internal V8 Engine" delay="0.5s">
            {nodejs.memoryUsage ? (
              <div style={{ marginTop: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Resident Set Size (RSS)</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{formatBytes(nodejs.memoryUsage.rss)}</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20 }}>
                  <div style={{ width: '100%', height: '100%', background: '#3b82f6', borderRadius: 3 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Heap Used / Total</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatBytes(nodejs.memoryUsage.heapUsed)} / {formatBytes(nodejs.memoryUsage.heapTotal)}
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 20 }}>
                  <div style={{ width: `${Math.min((nodejs.memoryUsage.heapUsed / nodejs.memoryUsage.heapTotal) * 100, 100)}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
                </div>

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Ext C++ Binding</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', fontWeight: 600 }}>{formatBytes(nodejs.memoryUsage.external)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Array Buffers</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', fontWeight: 600 }}>{formatBytes(nodejs.memoryUsage.arrayBuffers)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>App Platform Uptime</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>{Math.floor((nodejs.uptime || 0) / 3600)} Hours</span>
                  </div>
                </div>
              </div>
            ) : (
               <div style={{ color: '#64748b', marginTop: 15 }}>Data Node.js tidak tersedia</div>
            )}
          </Card>

          <Card 
            title="Node.js Engine Status" 
            subtitle={`Runtime Version: ${nodejs.version || '-'}`} 
            delay="0.6s"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ marginTop: 25, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>Heap Memory Trend</span>
                
                <div style={{ display: 'flex', alignItems: 'baseline', color: '#8b5cf6' }}>
                  <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{formatNumberOnly(nodejs?.memoryUsage?.heapUsed)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 6 }}>{formatUnitOnly(nodejs?.memoryUsage?.heapUsed)}</span>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 120, position: 'relative', marginTop: 'auto' }}>
                {heapTrend.length > 0 ? (
                  <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaData} fill="url(#gradientArea)" />
                    <path d={pathData} fill="none" stroke="#8b5cf6" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                  </svg>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Mengumpulkan data grafik...
                  </div>
                )}
              </div>
            </div>
          </Card>

        </div>
      </div>
    </>
  );
}