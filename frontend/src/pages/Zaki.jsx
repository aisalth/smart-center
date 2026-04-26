import { useState, useEffect, useRef } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { 
  getZakiDashboardData, getZakiHealth, getZakiNetwork, getZakiProcesses, 
  getZakiCpu, getZakiMemory, getZakiDisk, getZakiDocker, getZakiHistory 
} from '../api/zakiApi';

/* ── Helpers ─────────────────────────────────────────────── */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const fmtPct = (v) => `${parseFloat(v || 0).toFixed(1)}%`;

/* ── Ring Gauge ──────────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Zaki() {
  const [sysData, setSysData]       = useState(null);
  const [cpuData, setCpuData]       = useState(null);
  const [memData, setMemData]       = useState(null);
  const [diskData, setDiskData]     = useState(null);
  const [dockerData, setDockerData] = useState(null);
  
  const [health, setHealth]       = useState(null);
  const [processes, setProcesses] = useState([]);
  const [network, setNetwork]     = useState([]);
  
  const [apiError, setApiError]   = useState(false);
  const [lastFetch, setLastFetch] = useState('--:--:--');
  const [isLoading, setIsLoading] = useState(true);

  const [cpuHist, setCpuHist]   = useState([]);
  const [ramHist, setRamHist]   = useState([]);
  const [diskHist, setDiskHist] = useState([]);
  const [nodeHist, setNodeHist] = useState([]);

  // --- FITUR ALERTING (CEGAH SPAM) ---
  const lastAlertTime = useRef(0);

  // Minta izin Notifikasi ke Browser saat komponen dimuat
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  /* ── Fetch Real API ── */
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Cukup panggil 5 endpoint yang benar-benar berbeda
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
        
        // MENGAMBIL DATA DARI DASHBOARD (Sapu Jagat), BUKAN DARI API TERPISAH
        setCpuData(dataDashboard.cpu);
        setMemData(dataDashboard.memory);
        setDiskData(dataDashboard.disk);
        setDockerData(dataDashboard.docker);
        
        if (dataNetwork) {
          const flatNetwork = Object.entries(dataNetwork).flatMap(([iface, arr]) => 
            arr.map(n => ({ iface, ...n }))
          );
          setNetwork(flatNetwork);
        }

        if (dataHistory) {
           const historyMap = dataHistory.map(h => ({
               t: new Date(h.timestamp).toLocaleTimeString(),
               val: parseFloat(h.memory.percentUsed)
           }));
           setRamHist(historyMap);
        }

        const curCpu = parseFloat(dataDashboard.cpu.usage.percentUsed || 0);
        const curRam = parseFloat(dataDashboard.memory.percentUsed || 0);
        const curDisk = parseFloat(dataDashboard.disk.percentUsed || 0);
        const curNodeMem = dataDashboard.nodejs ? parseFloat((dataDashboard.nodejs.memoryUsage.heapUsed / (1024 * 1024)).toFixed(2)) : 0;
        
        setCpuHist(prev => {
            const next = [...prev, { t: 'T', val: curCpu }];
            return next.length > 20 ? next.slice(1) : next;
        });
        
        setDiskHist(prev => {
            const next = [...prev, { t: 'T', val: curDisk }];
            return next.length > 20 ? next.slice(1) : next;
        });

        setNodeHist(prev => {
            const next = [...prev, { t: 'T', val: curNodeMem }];
            return next.length > 20 ? next.slice(1) : next;
        });

        setApiError(false);
        setLastFetch(new Date().toLocaleTimeString('id-ID'));

        // --- LOGIKA ALERTING ---
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
  }, []); // Hapus dependency isAuthenticated

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

  /* ── Derived Variables ── */
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

        {/* ══ ROW 0: System Info + Health Check ══ */}
        <div className="grid-2" style={{ marginBottom: 20, alignItems: 'stretch' }}>

          <Card 
            title="System Information" 
            subtitle="Info dasar server yang dimonitor" 
            rightElement={<HealthDot isOnline={isOnline} />} 
            delay="0.02s" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', flex: 1 }}>
              {[
                { label: 'Hostname',  value: sysData?.system?.hostname ?? '—' },
                { label: 'Platform',  value: sysData?.system?.platform ?? '—' },
                { label: 'Arch',      value: sysData?.system?.arch     ?? '—' },
                { label: 'CPU Cores', value: cpuData?.cores        ?? '—' },
                { label: 'Uptime',    value: uptime },
                { label: 'CPU Model', value: (cpuData?.model || '').split('@')[0].trim() || '—' },
                { label: 'Load 1m',   value: loadAvg?.['1min']         ?? '—' },
                { label: 'Load 5m',   value: loadAvg?.['5min']         ?? '—' },
              ].map((r, i) => (
                <div key={i} className="server-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span className="server-detail-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                  <span className="server-detail-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Update terakhir: {lastFetch}
            </div>
          </Card>

          <Card 
            title="Health Check" 
            subtitle="Status layanan dari endpoint /health" 
            rightElement={<Badge variant={isOnline ? 'success' : 'danger'} dot>{isOnline ? 'HEALTHY' : 'ERROR'}</Badge>}
            delay="0.06s" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ textAlign: 'center', padding: '18px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `2px solid ${isOnline ? '#22c55e' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isOnline
                  ? <svg width="36" height="36" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="36" height="36" fill="none" stroke="#ef4444" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isOnline ? '#22c55e' : '#ef4444' }}>
                {isOnline ? 'Server Online' : 'Server Error'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {health?.uptime ? `Uptime Secs: ${Math.floor(health.uptime)}` : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'CPU Check',  ok: cpu  < 90, val: fmtPct(cpu)  },
                { label: 'RAM Check',  ok: ram  < 90, val: fmtPct(ram)  },
                { label: 'Disk Check', ok: disk < 90, val: fmtPct(disk) },
                { label: 'Docker',     ok: dockerData?.running > 0, val: `${dockerData?.running ?? 0}/${dockerData?.total ?? 0}` },
              ].map((item, i) => (
                <div key={i} style={{ background: item.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${item.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.ok ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ══ ROW 1: CPU / RAM / Disk Gauges ══ */}
        <div className="grid-3" style={{ alignItems: 'stretch' }}>

          <Card 
            title="CPU Usage" 
            subtitle={`${cpuData?.cores ?? '—'} Cores Active`} 
            rightElement={
              <Badge variant={cpu > 85 ? 'danger' : cpu > 65 ? 'warning' : 'success'} dot>
                {cpu > 85 ? 'Kritis' : cpu > 65 ? 'Tinggi' : 'Normal'}
              </Badge>
            } 
            delay="0.08s" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <RingGauge pct={cpu} label="CPU" color="#4072af" />
                <Sparkline data={cpuHist} color={cpuColor} />
              </div>
              <div className="server-details" style={{ marginTop: '20px' }}>
                {[
                  { label: 'User / Sys',  value: `${(cpuData?.usage?.user / 1000000).toFixed(1)}M / ${(cpuData?.usage?.system / 1000000).toFixed(1)}M` },
                  { label: 'Idle / Wait', value: `${(cpuData?.usage?.idle / 1000000).toFixed(1)}M / ${cpuData?.usage?.iowait || 0}` },
                  { label: 'Load 1m',     value: loadAvg?.['1min'] ?? '—' },
                  { label: 'Load 5m',     value: loadAvg?.['5min'] ?? '—' },
                ].map((r, i) => (
                  <div key={i} className="server-detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span className="server-detail-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                    <span className="server-detail-value" style={{ fontSize: 12, fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card 
            title="RAM Usage" 
            subtitle={`Total ${memData?.human?.total ?? '—'}`} 
            rightElement={
              <Badge variant={ram > 85 ? 'danger' : ram > 65 ? 'warning' : 'success'} dot>
                {ram > 85 ? 'Kritis' : ram > 65 ? 'Tinggi' : 'Normal'}
              </Badge>
            } 
            delay="0.16s" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <RingGauge pct={ram} label="RAM" color="#22c55e" />
                <Sparkline data={ramHist} color={ramColor} />
              </div>
              <div className="server-details" style={{ marginTop: '20px' }}>
                {[
                  { label: 'Terpakai',   value: memData?.human?.used  ?? '—' },
                  { label: 'Tersedia',   value: memData?.human?.available  ?? '—' },
                  { label: 'Cache',      value: ((memData?.cache || 0) / (1024 * 1024)).toFixed(1) + ' MB' },
                  { label: 'Free',       value: memData?.human?.free ?? '—' },
                ].map((r, i) => (
                  <div key={i} className="server-detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span className="server-detail-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                    <span className="server-detail-value" style={{ fontSize: 12, fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card 
            title="Disk Usage" 
            subtitle={`Total ${diskData?.human?.total ?? '—'}`} 
            rightElement={
              <Badge variant={disk > 85 ? 'danger' : disk > 65 ? 'warning' : 'success'} dot>
                {disk > 85 ? 'Kritis' : disk > 65 ? 'Tinggi' : 'Normal'}
              </Badge>
            } 
            delay="0.24s" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <RingGauge pct={disk} label="Disk" color="#f59e0b" />
                <Sparkline data={diskHist} color={diskColor} />
              </div>
              <div className="server-details" style={{ marginTop: '20px' }}>
                {[
                  { label: 'Terpakai', value: diskData?.human?.used  ?? '—' },
                  { label: 'Total',    value: diskData?.human?.total  ?? '—' },
                  { label: 'Tersedia', value: diskData?.human?.available  ?? '—' },
                  { label: 'Utilisasi',value: fmtPct(disk) },
                ].map((r, i) => (
                  <div key={i} className="server-detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span className="server-detail-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
                    <span className="server-detail-value" style={{ fontSize: 12, fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ══ ROW 2: Network Interfaces ══ */}
        <Card 
          title="Network Interfaces" 
          subtitle="Daftar koneksi & IP aktif" 
          rightElement={<Badge variant="info">{network.filter(n => !n.internal && n.family === 'IPv4').length} Ext IPv4</Badge>} 
          delay="0.3s" 
          style={{ marginTop: 20 }}
        >
          <div style={{ marginTop: 10, overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {['INTERFACE', 'IP ADDRESS', 'MAC', 'TIPE'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {network.map((n, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: n.internal ? 'var(--text-muted)' : '#3b82f6' }}>{n.iface}</span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.family}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{n.address}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>{n.mac}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 4, background: n.internal ? 'rgba(100,116,139,0.1)' : 'rgba(34,197,94,0.1)', color: n.internal ? '#64748b' : '#22c55e' }}>
                        {n.internal ? 'Loopback' : 'External'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ ROW 3: Docker Containers ══ */}
        <Card 
          title="Docker Containers" 
          subtitle="Aplikasi yang berjalan via kontainer" 
          rightElement={<Badge variant="success" dot>{dockerData?.running ?? 0} Running</Badge>} 
          delay="0.36s" 
          style={{ marginTop: 20 }}
        >
          <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {['CONTAINER', 'IMAGE', 'STATUS', 'CPU%'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid var(--card-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dockerData?.containers ?? []).map((c, i) => {
                   const cCpu = parseFloat(c.stats?.cpu || 0);
                   const cName = c.name;
                   const cImg = c.image.split('/').pop();
                   
                   return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }} title={c.name}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>{cName}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }} title={c.image}>{cImg}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, color: (c.status ?? '').toLowerCase().includes('up') ? '#22c55e' : '#ef4444' }}>{c.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: cCpu > 10 ? '#f59e0b' : 'var(--foreground)' }}>
                        {c.stats?.cpu || '0%'}
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ ROW 4: Node.js Engine ══ */}
        <Card 
          title="Node.js Engine Status" 
          subtitle={`Runtime Version: ${sysData?.nodejs?.version ?? '—'}`} 
          rightElement={<Badge variant="info">Online</Badge>} 
          delay="0.38s" 
          style={{ marginTop: 20 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 4px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Heap Memory Trend</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>
                  {sysData?.nodejs ? (sysData.nodejs.memoryUsage.heapUsed / (1024 * 1024)).toFixed(1) : 0} <span style={{ fontSize: 14 }}>MB</span>
                </span>
              </div>
              <Sparkline data={nodeHist} color="#8b5cf6" />
            </div>
            
            <div className="server-details" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {[
                { label: 'Node.js Uptime', value: sysData?.nodejs ? `${Math.floor(sysData.nodejs.uptime)} detik` : '—' },
                { label: 'RSS (Resident Set)', value: sysData?.nodejs ? `${(sysData.nodejs.memoryUsage.rss / (1024 * 1024)).toFixed(1)} MB` : '—' },
                { label: 'Total Heap Allocated', value: sysData?.nodejs ? `${(sysData.nodejs.memoryUsage.heapTotal / (1024 * 1024)).toFixed(1)} MB` : '—' },
                { label: 'External Memory', value: sysData?.nodejs ? `${(sysData.nodejs.memoryUsage.external / (1024 * 1024)).toFixed(1)} MB` : '—' },
              ].map((r, i) => (
                <div key={i} className="server-detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span className="server-detail-label" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.label}</span>
                  <span className="server-detail-value" style={{ fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ══ ROW 5: Top Processes ══ */}
        <Card 
          title="Top Processes" 
          subtitle="Proses teratas berdasarkan penggunaan resource" 
          rightElement={<Badge variant="info">{processes.length} proses</Badge>} 
          delay="0.40s" 
          style={{ marginTop: 20 }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr>
                  {['PID', 'COMMAND', 'CPU %', 'MEM %', 'STAT', 'USER'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processes.map((p, i) => {
                  const cpuPct = parseFloat(p.cpu ?? 0);
                  const memPct = parseFloat(p.mem ?? 0);
                  const shortName = p.command.split(' ')[0].split('/').pop();

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(64,114,175,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.pid}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{shortName}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.command}>{p.command}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, minWidth: 60 }}>
                            <div style={{ height: '100%', width: `${clamp(cpuPct, 0, 100)}%`, background: cpuPct > 50 ? '#ef4444' : cpuPct > 20 ? '#f59e0b' : '#4072af', borderRadius: 2, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: cpuPct > 50 ? '#ef4444' : cpuPct > 20 ? '#f59e0b' : 'var(--foreground)', minWidth: 40 }}>{cpuPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: memPct > 10 ? '#f59e0b' : 'var(--foreground)' }}>
                        {p.mem}%
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.stat.includes('R') ? '#22c55e' : 'var(--text-muted)' }}>{p.stat}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.user}</td>
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