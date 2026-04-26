import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* ── Konstanta & Seed Data ───────────────────────────────── */
const DUMMY_USERS = ['Budi S.', 'Siti A.', 'Rizky M.', 'Dina F.', 'Agus T.', 'Nisa R.', 'Hendra K.', 'Fayrin H.', 'Aca'];
const SSO_PROVIDERS = ['Google', 'Apple', 'Email'];
const TRX_TYPES = [
  { type: 'qr', name: 'Bayar QRIS Merchant', range: [15000, 250000] },
  { type: 'transfer', name: 'Kirim Uang (P2P)', range: [50000, 2000000] },
  { type: 'topup', name: 'Top Up Saldo Wallet', range: [50000, 1000000] },
  { type: 'payment', name: 'Bayar Tagihan / VA', range: [100000, 800000] },
];

const INITIAL_CASHFLOW = Array.from({ length: 15 }).map((_, i) => ({
  time: `10:${String(10 + i).padStart(2, '0')}`,
  inbound: Math.floor(Math.random() * 8000000) + 2000000,
  outbound: Math.floor(Math.random() * 6000000) + 1000000,
}));

const INITIAL_TRX_CHART = [
  { jam: '07:00', qr: 124, transfer: 89, topup: 50 },
  { jam: '08:00', qr: 210, transfer: 178, topup: 90 },
  { jam: '09:00', qr: 340, transfer: 290, topup: 120 },
  { jam: '10:00', qr: 480, transfer: 412, topup: 200 },
  { jam: '11:00', qr: 390, transfer: 355, topup: 150 },
];

/* ── Helpers ─────────────────────────────────────────────── */
const getCurrentTime = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT: BUSINESS & TRANSACTION MONITOR
══════════════════════════════════════════════════════════════ */
export default function BusinessMonitor() {
  // Stats
  const [totalVolume, setTotalVolume] = useState(1450000000); // 1.45 Miliar
  const [activeUsers, setActiveUsers] = useState(4520);
  const [successRate, setSuccessRate] = useState(99.4);
  const [ssoLoginsToday, setSsoLoginsToday] = useState(12840);

  // Charts
  const [cashflowData, setCashflowData] = useState(INITIAL_CASHFLOW);
  const [trxChartData, setTrxChartData] = useState(INITIAL_TRX_CHART);

  // Live Feeds
  const [liveTrx, setLiveTrx] = useState([]);
  const [liveAuth, setLiveAuth] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [failedQueue, setFailedQueue] = useState([]);

  /* ── SIMULASI TRAFFIC BISNIS REAL-TIME ── */
  useEffect(() => {
    // 1. Initial Populate Feeds
    setLiveTrx([
      { id: 'TX901', time: getCurrentTime(), user: 'Aca', action: 'Kirim Uang (P2P)', type: 'transfer', amount: 150000, status: 'success' },
      { id: 'TX902', time: getCurrentTime(), user: 'Budi S.', action: 'Bayar QRIS Merchant', type: 'qr', amount: 45000, status: 'success' },
    ]);
    setLiveAuth([
      { time: getCurrentTime(), user: 'Rizky M.', action: 'Login', provider: 'Google', status: 'success', ip: '114.12.x.x' },
      { time: getCurrentTime(), user: 'Siti A.', action: 'Register', provider: 'Email', status: 'pending', ip: '103.44.x.x' },
    ]);
    setFraudAlerts([
      { time: getCurrentTime(), user: 'anon_77', issue: 'Multiple QR Generation Failed', severity: 'warning' }
    ]);

    // 2. Interval Updates (Traffic Simulation)
    const trafficInterval = setInterval(() => {
      // Update Volume & Users
      setTotalVolume(prev => prev + (Math.floor(Math.random() * 5000000) + 500000));
      setActiveUsers(prev => Math.max(2000, prev + (Math.floor(Math.random() * 31) - 10)));
      
      // Live Transactions Feed
      setLiveTrx(prev => {
        const t = TRX_TYPES[Math.floor(Math.random() * TRX_TYPES.length)];
        const isFailed = Math.random() > 0.95;
        const newTrx = {
          id: `TX${Math.floor(Math.random() * 9000) + 1000}`,
          time: getCurrentTime(),
          user: DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
          action: t.name,
          type: t.type,
          amount: Math.round((Math.floor(Math.random() * (t.range[1] - t.range[0])) + t.range[0]) / 1000) * 1000,
          status: isFailed ? 'failed' : 'success'
        };

        // Jika gagal, masukan ke Failed Queue
        if (isFailed) {
          setFailedQueue(q => [{ ...newTrx, reason: 'Gateway Timeout / Insufficient Balance' }, ...q].slice(0, 5));
          setSuccessRate(sr => Math.max(95, sr - 0.05));
        } else {
          setSuccessRate(sr => Math.min(99.9, sr + 0.01));
        }

        return [newTrx, ...prev].slice(0, 6);
      });

      // Live Auth (SSO / Login) Feed
      setLiveAuth(prev => {
        const isRegister = Math.random() > 0.8;
        const provider = SSO_PROVIDERS[Math.floor(Math.random() * SSO_PROVIDERS.length)];
        const isFailed = Math.random() > 0.9;
        
        if (!isFailed) setSsoLoginsToday(prev => prev + 1);

        const newAuth = {
          time: getCurrentTime(),
          user: isRegister ? 'New User' : DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
          action: isRegister ? 'Register' : 'Login',
          provider: provider,
          status: isFailed ? 'failed' : 'success',
          ip: `192.168.${Math.floor(Math.random()*255)}.x`
        };
        return [newAuth, ...prev].slice(0, 6);
      });

      // Update Cashflow Chart
      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      setCashflowData(prev => {
        if (prev[prev.length-1].time === timeStr) return prev; // Avoid duplicate x-axis
        const newData = [...prev.slice(1)];
        newData.push({
          time: timeStr,
          inbound: Math.floor(Math.random() * 8000000) + 3000000,
          outbound: Math.floor(Math.random() * 7000000) + 1000000,
        });
        return newData;
      });

    }, 3500); // Update every 3.5 seconds

    // 3. Fraud / Security Alerts (Slower interval)
    const securityInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setFraudAlerts(prev => {
          const issues = ['Velocity Check Failed (P2P)', 'Suspicious IP Login', 'Unusual QR Payment Amount'];
          return [{
            time: getCurrentTime(),
            user: DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
            issue: issues[Math.floor(Math.random() * issues.length)],
            severity: Math.random() > 0.8 ? 'critical' : 'warning'
          }, ...prev].slice(0, 5);
        });
      }
    }, 12000);

    return () => {
      clearInterval(trafficInterval);
      clearInterval(securityInterval);
    };
  }, []);

  return (
    <>
      <Topbar title="SmartPay Business Dashboard" subtitle="Monitoring Transaksi P2P, QRIS, Otentikasi SSO, dan Fraud" />
      <div className="page-content section-gap" style={{ padding: '0 24px 40px' }}>

        {/* ── ROW 1: TOP KPI STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 24, marginBottom: 20 }}>
          <StatCard 
            label="Total Volume Transaksi" 
            value={`Rp ${(totalVolume / 1000000000).toFixed(2)} M`} 
            changeText="Hari ini" changeType="up" 
            color="#10b981" bg="rgba(16,185,129,.12)" delay="0s" 
          />
          <StatCard 
            label="Active Users (Online)" 
            value={activeUsers.toLocaleString()} 
            changeText="Koneksi WebSocket aktif" 
            color="#3b82f6" bg="rgba(59,130,246,.12)" delay="0.1s"
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', animation: 'pulse-ring 2s infinite' }} />
          </StatCard>
          <StatCard 
            label="Transaction Success Rate" 
            value={`${successRate.toFixed(2)}%`} 
            changeText={successRate > 98 ? "Sangat Stabil" : "Butuh Perhatian"} 
            changeType={successRate > 98 ? "up" : "down"}
            color={successRate > 98 ? "#22c55e" : "#f59e0b"} 
            bg={successRate > 98 ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)"} 
            delay="0.2s" 
          />
          <StatCard 
            label="SSO Logins & Registers" 
            value={ssoLoginsToday.toLocaleString()} 
            changeText="Via Google, Apple, Email" changeType="up" 
            color="#8b5cf6" bg="rgba(139,92,246,.12)" delay="0.3s" 
          />
        </div>

        {/* ── ROW 2: TRANSACTION CHARTS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
          
          <Card title="Live Cashflow: Inbound vs Outbound" subtitle="Aliran dana masuk (Topup/Deposit) vs Keluar (P2P/Payment)" delay="0.4s">
            <div style={{ height: 280, width: '100%', marginTop: 10 }}>
              <ResponsiveContainer>
                <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(value) => `Rp ${(value / 1000000).toFixed(1)}M`} />
                  <Area type="monotone" dataKey="inbound" name="Inbound" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                  <Area type="monotone" dataKey="outbound" name="Outbound" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Distribusi Tipe Transaksi" subtitle="Komparasi P2P Transfer, QRIS, dan Top Up" delay="0.5s">
            <div style={{ height: 280, width: '100%', marginTop: 10 }}>
              <ResponsiveContainer>
                <BarChart data={trxChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
                  <Bar dataKey="transfer" name="Kirim Uang (P2P)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qr" name="Bayar QRIS" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="topup" name="Top Up" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>

        {/* ── ROW 3: LIVE TABLES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
          
          {/* Table 1: Live Transactions (Kirim Uang & QR) */}
          <Card title="Live Transactions Stream" subtitle="Traffic P2P dan QR Payment" rightElement={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'block', animation: 'pulse-ring 1s infinite' }} />} delay="0.6s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>Waktu & ID</th>
                    <th style={{ padding: '8px 4px' }}>Aktivitas</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTrx.map((trx, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{trx.time}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{trx.id}</div>
                      </td>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Badge variant={trx.type === 'qr' ? 'info' : trx.type === 'transfer' ? 'primary' : 'warning'} style={{ fontSize: 9, padding: '2px 6px' }}>
                            {trx.type.toUpperCase()}
                          </Badge>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>{trx.user}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{trx.action}</div>
                      </td>
                      <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: trx.status === 'success' ? '#059669' : '#dc2626' }}>
                          {formatRupiah(trx.amount)}
                        </div>
                        {trx.status === 'failed' && <span style={{ fontSize: 10, color: '#dc2626' }}>FAILED</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Table 2: SSO Authentication */}
          <Card title="SSO Auth & Registrations" subtitle="Log aktivitas Login & Daftar User" rightElement={<Badge variant="primary">SSO Active</Badge>} delay="0.7s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>Waktu & IP</th>
                    <th style={{ padding: '8px 4px' }}>User & Action</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>Provider</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveAuth.map((auth, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{auth.time}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{auth.ip}</div>
                      </td>
                      <td style={{ padding: '12px 4px' }}>
                        <span style={{ display: 'block', fontWeight: 600, color: '#334155', fontSize: 12 }}>{auth.user}</span>
                        <span style={{ fontSize: 10, color: auth.action === 'Register' ? '#10b981' : '#3b82f6', fontWeight: 500 }}>{auth.action}</span>
                      </td>
                      <td style={{ padding: '12px 4px', textAlign: 'center' }}>
                         <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                           {auth.provider}
                         </span>
                      </td>
                      <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                        <Badge variant={auth.status === 'success' ? 'success' : auth.status === 'failed' ? 'danger' : 'warning'}>
                          {auth.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>

        {/* ── ROW 4: SECURITY & ALERTS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          
          {/* Table 3: Fraud & Security */}
          <Card title="Security & Fraud Monitor" subtitle="Sistem deteksi anomali (Velocity & IP)" rightElement={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'blink 1.5s infinite' }} />} delay="0.8s">
            <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>Deteksi & Waktu</th>
                    <th style={{ padding: '8px 4px' }}>User Affected</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudAlerts.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Sistem aman, tidak ada anomali terdeteksi.</td></tr>
                  ) : fraudAlerts.map((alert, i) => (
                    <tr key={i} style={{ borderBottom: i < fraudAlerts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: alert.severity === 'critical' ? '#dc2626' : '#d97706' }}>{alert.issue}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>{alert.time}</div>
                      </td>
                      <td style={{ padding: '12px 4px', fontSize: 12, color: '#334155', fontWeight: 500 }}>{alert.user}</td>
                      <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                        <Badge variant={alert.severity === 'critical' ? 'critical' : 'warning'}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Table 4: Failed Transactions Queue */}
          <Card title="Failed Transactions Log" subtitle="Transaksi gagal bayar / Gateway Timeout" delay="0.9s">
             <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 4px' }}>ID Transaksi</th>
                    <th style={{ padding: '8px 4px' }}>User & Nominal</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Alasan Gagal</th>
                  </tr>
                </thead>
                <tbody>
                  {failedQueue.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Tidak ada transaksi gagal terbaru.</td></tr>
                  ) : failedQueue.map((fail, i) => (
                    <tr key={i} style={{ borderBottom: i < failedQueue.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#475569' }}>{fail.id}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{fail.time}</div>
                      </td>
                      <td style={{ padding: '12px 4px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{fail.user}</div>
                        <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{formatRupiah(fail.amount)}</div>
                      </td>
                      <td style={{ padding: '12px 4px', textAlign: 'right', fontSize: 11, color: '#64748b' }}>
                         {fail.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>

      </div>
    </>
  );
}