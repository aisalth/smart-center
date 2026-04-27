import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Konstanta & Seed Data ───────────────────────────────── */
const DUMMY_USERS = [
  { name: 'Budi S.', phone: '081234567890', email: 'budi.s@mail.com' },
  { name: 'Siti A.', phone: '085678901234', email: 'siti.a@mail.com' },
  { name: 'Rizky M.', phone: '081122334455', email: 'rizky.m@mail.com' },
  { name: 'Dina F.', phone: '087766554433', email: 'dina.f@mail.com' },
  { name: 'Agus T.', phone: '089911223344', email: 'agus.t@mail.com' },
  { name: 'Fayrin H.', phone: '089988776655', email: 'fayrin.hoshizora@mail.com' },
  { name: 'Aca', phone: '082133445566', email: 'aca.dev@mail.com' }
];

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

/* ── Helpers ─────────────────────────────────────────────── */
const getCurrentTime = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
const generateIP = () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
const getStatus = (rand) => rand > 0.85 ? 'gagal' : rand > 0.70 ? 'pending' : 'berhasil';

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT: BUSINESS & TRANSACTION MONITOR
══════════════════════════════════════════════════════════════ */
export default function BusinessMonitor() {
  // Stats
  const [totalVolume, setTotalVolume] = useState(1450000000); 
  const [activeUsers, setActiveUsers] = useState(4520);
  const [successRate, setSuccessRate] = useState(99.4);
  const [ssoLoginsToday, setSsoLoginsToday] = useState(12840);

  // Charts
  const [cashflowData, setCashflowData] = useState(INITIAL_CASHFLOW);

  // Live Feeds
  const [liveTrx, setLiveTrx] = useState([]);
  const [liveAuth, setLiveAuth] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);

  /* ── SIMULASI TRAFFIC BISNIS REAL-TIME ── */
  useEffect(() => {
    // 1. Initial Populate Feeds
    setLiveTrx([
      { id: 'TX901', time: getCurrentTime(), user: DUMMY_USERS[6], ip: generateIP(), action: 'Kirim Uang (P2P)', type: 'transfer', amount: 150000, status: 'berhasil' },
      { id: 'TX902', time: getCurrentTime(), user: DUMMY_USERS[0], ip: generateIP(), action: 'Bayar QRIS Merchant', type: 'qr', amount: 45000, status: 'pending' },
    ]);
    
    setLiveAuth([
      { time: getCurrentTime(), user: DUMMY_USERS[2], ip: generateIP(), action: 'Login', provider: 'Email', status: 'berhasil' },
      { time: getCurrentTime(), user: DUMMY_USERS[1], ip: generateIP(), action: 'Register', provider: 'Email', status: 'pending' },
      { time: getCurrentTime(), user: DUMMY_USERS[5], ip: generateIP(), action: 'Login', provider: 'Email', status: 'berhasil' },
    ]);
    
    setFraudAlerts([
      { time: getCurrentTime(), user: DUMMY_USERS[3], ip: generateIP(), aktivitas: 'Multiple QR Generation Failed', severity: 'warning' }
    ]);

    // 2. Interval Updates (Traffic Simulation)
    const trafficInterval = setInterval(() => {
      // Update Volume & Users
      setTotalVolume(prev => prev + (Math.floor(Math.random() * 5000000) + 500000));
      setActiveUsers(prev => Math.max(2000, prev + (Math.floor(Math.random() * 31) - 10)));
      
      // Live Transactions Feed
      setLiveTrx(prev => {
        const t = TRX_TYPES[Math.floor(Math.random() * TRX_TYPES.length)];
        const randStatus = Math.random();
        const currentStatus = getStatus(randStatus);
        
        const newTrx = {
          id: `TX${Math.floor(Math.random() * 9000) + 1000}`,
          time: getCurrentTime(),
          user: DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
          ip: generateIP(),
          action: t.name,
          type: t.type,
          amount: Math.round((Math.floor(Math.random() * (t.range[1] - t.range[0])) + t.range[0]) / 1000) * 1000,
          status: currentStatus
        };

        if (currentStatus === 'gagal') {
          setSuccessRate(sr => Math.max(95, sr - 0.05));
        } else if (currentStatus === 'berhasil') {
          setSuccessRate(sr => Math.min(99.9, sr + 0.01));
        }

        return [newTrx, ...prev].slice(0, 10);
      });

      // Live Auth Feed (Fokus Email)
      setLiveAuth(prev => {
        const isRegister = Math.random() > 0.7; 
        const randStatus = Math.random();
        const currentStatus = getStatus(randStatus);
        
        if (currentStatus === 'berhasil') setSsoLoginsToday(prev => prev + 1);

        const newAuth = {
          time: getCurrentTime(),
          user: isRegister ? { name: 'New User', phone: '0855' + Math.floor(Math.random() * 99999999), email: `new.${Math.floor(Math.random() * 1000)}@mail.com` } : DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
          ip: generateIP(),
          action: isRegister ? 'Register' : 'Login',
          provider: 'Email',
          status: currentStatus
        };
        return [newAuth, ...prev].slice(0, 20); 
      });

      // Update Cashflow Chart
      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      setCashflowData(prev => {
        if (prev[prev.length-1].time === timeStr) return prev; 
        const newData = [...prev.slice(1)];
        newData.push({
          time: timeStr,
          inbound: Math.floor(Math.random() * 8000000) + 3000000,
          outbound: Math.floor(Math.random() * 7000000) + 1000000,
        });
        return newData;
      });

    }, 3500); 

    // 3. Fraud / Security Alerts 
    const securityInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setFraudAlerts(prev => {
          const issues = ['Velocity Check Failed (P2P)', 'Suspicious IP Login', 'Unusual QR Payment Amount', 'Brute Force Login Attempt'];
          const severities = ['suspicion', 'warning', 'error', 'critical'];
          
          return [{
            time: getCurrentTime(),
            user: DUMMY_USERS[Math.floor(Math.random() * DUMMY_USERS.length)],
            ip: generateIP(),
            aktivitas: issues[Math.floor(Math.random() * issues.length)],
            severity: severities[Math.floor(Math.random() * severities.length)]
          }, ...prev].slice(0, 10);
        });
      }
    }, 12000);

    return () => {
      clearInterval(trafficInterval);
      clearInterval(securityInterval);
    };
  }, []);

  // Filter Data Auth
  const registerAuthData = liveAuth.filter(auth => auth.action === 'Register');
  const loginAuthData = liveAuth.filter(auth => auth.action === 'Login');

  // Helper render badge status & severity
  const renderStatusBadge = (status) => {
    switch(status) {
      case 'berhasil': return <Badge variant="success">BERHASIL</Badge>;
      case 'pending': return <Badge variant="warning">PENDING</Badge>;
      case 'gagal': return <Badge variant="danger">GAGAL</Badge>;
      default: return null;
    }
  };

  const renderSeverityBadge = (severity) => {
    switch(severity) {
      case 'critical': return <Badge variant="danger">CRITICAL</Badge>;
      case 'error': return <Badge variant="warning" style={{ background: '#f97316', color: '#fff' }}>ERROR</Badge>; // Orange
      case 'warning': return <Badge variant="warning">WARNING</Badge>;
      case 'suspicion': return <Badge variant="info" style={{ background: '#e2e8f0', color: '#475569' }}>SUSPICION</Badge>;
      default: return null;
    }
  };

  return (
    <>
      <Topbar title="SmartPay Business Dashboard" subtitle="Monitoring Transaksi P2P, QRIS, Otentikasi SSO, dan Fraud" />
      <div className="page-content section-gap" style={{ padding: '0 24px 40px' }}>

        {/* ── ROW 1: TOP KPI STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 24, marginBottom: 24 }}>
          <StatCard 
            label="Active Users (Online)" 
            value={activeUsers.toLocaleString()} 
            changeText="Koneksi WebSocket aktif" 
            color="#3b82f6" bg="rgba(59,130,246,.12)" delay="0s"
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', animation: 'pulse-ring 2s infinite' }} />
          </StatCard>

          <StatCard 
            label="SSO Logins & Registers (Email)" 
            value={ssoLoginsToday.toLocaleString()} 
            changeText="Aktivitas hari ini" changeType="up" 
            color="#8b5cf6" bg="rgba(139,92,246,.12)" delay="0.1s" 
          />

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
            label="Total Volume Transaksi" 
            value={`Rp ${(totalVolume / 1000000000).toFixed(2)} M`} 
            changeText="Hari ini" changeType="up" 
            color="#10b981" bg="rgba(16,185,129,.12)" delay="0.3s" 
          />
        </div>

        {/* ── ROW 2: LIVE CASHFLOW ── */}
        <div style={{ marginBottom: 24 }}>
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
        </div>

        {/* ── ROW 3: LIVE TRANSACTIONS STREAM ── */}
        <div style={{ marginBottom: 24 }}>
          <Card title="Live Transactions Stream" subtitle="Traffic Real-time Transaksi Platform" rightElement={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'block', animation: 'pulse-ring 1s infinite' }} />} delay="0.5s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Waktu</th>
                    <th style={{ padding: '8px 12px' }}>IP Address</th>
                    <th style={{ padding: '8px 12px' }}>Nama User & Nomor</th>
                    <th style={{ padding: '8px 12px' }}>Aktivitas</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Nominal</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTrx.map((trx, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{trx.time}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{trx.ip}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>{trx.user.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{trx.user.phone}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#475569' }}>
                        <span style={{ display: 'block', fontWeight: 500 }}>{trx.action}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{trx.id}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        {formatRupiah(trx.amount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {renderStatusBadge(trx.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── ROW 4: LIVE REGISTER SSO EMAIL ── */}
        <div style={{ marginBottom: 24 }}>
          <Card title="Live Register SSO Email" subtitle="Log aktivitas pendaftaran pengguna baru via Email" rightElement={<Badge variant="success">SSO Active</Badge>} delay="0.6s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Waktu</th>
                    <th style={{ padding: '8px 12px' }}>IP Address</th>
                    <th style={{ padding: '8px 12px' }}>Nama User</th>
                    <th style={{ padding: '8px 12px' }}>Nomor HP</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Provider</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registerAuthData.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Belum ada data pendaftaran terbaru.</td></tr>
                  ) : registerAuthData.map((auth, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{auth.time}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{auth.ip}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#334155', fontSize: 12 }}>{auth.user.name}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>{auth.user.phone}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#3b82f6' }}>{auth.user.email}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                         <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                           {auth.provider}
                         </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {renderStatusBadge(auth.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── ROW 5: LIVE LOGIN SSO EMAIL ── */}
        <div style={{ marginBottom: 24 }}>
          <Card title="Live Login SSO Email" subtitle="Log aktivitas masuk pengguna via Email" rightElement={<Badge variant="primary">SSO Active</Badge>} delay="0.7s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Waktu</th>
                    <th style={{ padding: '8px 12px' }}>IP Address</th>
                    <th style={{ padding: '8px 12px' }}>Nama User</th>
                    <th style={{ padding: '8px 12px' }}>Nomor HP</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {loginAuthData.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Belum ada data login terbaru.</td></tr>
                  ) : loginAuthData.map((auth, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{auth.time}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{auth.ip}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#334155', fontSize: 12 }}>{auth.user.name}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>{auth.user.phone}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#3b82f6' }}>{auth.user.email}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                         <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                           {auth.provider}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── ROW 6: SECURITY & FRAUD MONITOR ── */}
        <div>
          <Card title="Security & Fraud Monitor" subtitle="Sistem deteksi anomali keamanan dan transaksi" rightElement={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'blink 1.5s infinite' }} />} delay="0.8s">
            <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 5, marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px' }}>Waktu</th>
                    <th style={{ padding: '8px 12px' }}>IP Address</th>
                    <th style={{ padding: '8px 12px' }}>Nama User</th>
                    <th style={{ padding: '8px 12px' }}>Nomor HP</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Aktivitas</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudAlerts.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Sistem aman, tidak ada anomali terdeteksi.</td></tr>
                  ) : fraudAlerts.map((alert, i) => (
                    <tr key={i} style={{ borderBottom: i < fraudAlerts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{alert.time}</td>
                      <td style={{ padding: '12px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{alert.ip}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#334155', fontSize: 12 }}>{alert.user.name}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>{alert.user.phone}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#3b82f6' }}>{alert.user.email}</td>
                      <td style={{ padding: '12px', fontSize: 12, fontWeight: 600, color: '#475569' }}>{alert.aktivitas}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {renderSeverityBadge(alert.severity)}
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