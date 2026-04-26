import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// --- DUMMY DATA ---

// 1. Grafik Garis: BERHASIL per 3 Jam
const LINE_SUCCESS_3H = [
  { time: '00:00', register: 12, login: 145, trx: 120 },
  { time: '03:00', register: 8, login: 85, trx: 80 },
  { time: '06:00', register: 32, login: 310, trx: 205 },
  { time: '09:00', register: 140, login: 880, trx: 820 },
  { time: '12:00', register: 205, login: 1120, trx: 1210 },
  { time: '15:00', register: 175, login: 950, trx: 1080 },
  { time: '18:00', register: 120, login: 800, trx: 930 },
  { time: '21:00', register: 65, login: 400, trx: 410 },
];

// 2. Grafik Garis: ERROR per 3 Jam
const LINE_ERROR_3H = [
  { time: '00:00', register: 0, login: 12, trx: 4 },
  { time: '03:00', register: 1, login: 5, trx: 2 },
  { time: '06:00', register: 2, login: 18, trx: 12 },
  { time: '09:00', register: 5, login: 45, trx: 32 },
  { time: '12:00', register: 8, login: 62, trx: 45 },
  { time: '15:00', register: 4, login: 38, trx: 28 },
  { time: '18:00', register: 3, login: 25, trx: 18 },
  { time: '21:00', register: 1, login: 10, trx: 8 },
];

// 3. Grafik Pie: BERHASIL Hari Ini
const PIE_SUCCESS_TODAY = [
  { name: 'Register', value: 156, color: '#f59e0b' },
  { name: 'Login', value: 1246, color: '#22c55e' },
  { name: 'Transaksi', value: 3840, color: '#4072af' },
];

// 4. Grafik Pie: ERROR Hari Ini
const PIE_ERROR_TODAY = [
  { name: 'Register Err', value: 12, color: '#d97706' },
  { name: 'Login Err', value: 84, color: '#15803d' },
  { name: 'Transaksi Err', value: 52, color: '#b91c1c' },
];

// 5. System Health
const SYS_HEALTH = [
  { label: 'CPU Usage [Core i7]', val: 42, color: '#4072af' },
  { label: 'RAM Usage [32GB]', val: 67, color: '#f59e0b' },
  { label: 'Disk Usage [NVMe]', val: 55, color: '#22c55e' },
];

// 6. Data Summary 7 Hari
const SUMMARY_7_DAYS = [
  { day: 'Sen', tx: 4820, users: 1540, err: 112 },
  { day: 'Sel', tx: 5932, users: 1620, err: 85 },
  { day: 'Rab', tx: 5901, users: 1580, err: 105 },
  { day: 'Kam', tx: 6100, users: 1710, err: 92 },
  { day: 'Jum', tx: 7240, users: 1830, err: 141 },
  { day: 'Sab', tx: 3780, users: 1420, err: 55 },
  { day: 'Min', tx: 3690, users: 1390, err: 43 },
];

// Data Dummy untuk Simulasi
const DUMMY_EMAILS = ['syifa@gmail.com', 'budi.antoro@yahoo.com', 'alexander22@gmail.com', 'dina_marlina@hotmail.com', 'rizky.kurniawan@company.id', 'nisa.sabyan@gmail.com'];
const DUMMY_ERRORS = [
  { title: 'Gateway timeout', desc: '[ERR_504] Koneksi gagal', type: 'danger' },
  { title: 'DB Latensi', desc: '[WARN] DB Latensi > 150ms', type: 'warning' },
  { title: 'Auth Failed', desc: '[AUTH_FAIL] Brute force tertahan', type: 'danger' },
  { title: 'Koneksi Fluktuatif', desc: '[NET_DROP] Koneksi node-2 fluktuatif', type: 'warning' },
  { title: 'Gagal Validasi', desc: '[TRX_ERR] Gagal validasi token', type: 'danger' }
];

// --- COMPONENTS ---

export default function Dashboard() {
  const [tick, setTick] = useState(0);
  
  // State untuk Live Data
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Fungsi untuk mendapatkan waktu saat ini dengan detik
  const getCurrentTimeWithSeconds = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    // Inisialisasi awal list dengan waktu saat komponen diload
    setLiveMonitoring([
      { time: getCurrentTimeWithSeconds(), type: 'Transaksi', msg: 'syifa@gmail.com', status: 'pending' },
      { time: getCurrentTimeWithSeconds(), type: 'Login', msg: 'budi.antoro@yahoo.com', status: 'berhasil' },
      { time: getCurrentTimeWithSeconds(), type: 'Register', msg: 'alexander22@gmail.com', status: 'berhasil' }
    ]);

    setLiveAlerts([
      { ...DUMMY_ERRORS[0], time: getCurrentTimeWithSeconds() },
      { ...DUMMY_ERRORS[1], time: getCurrentTimeWithSeconds() }
    ]);

    // Timer utama per detik untuk update data (Simulasi)
    const t = setInterval(() => {
      setTick(p => p + 1);

      // Simulasi 30% peluang ada aktivitas baru per detik
      if (Math.random() > 0.7) {
        setLiveMonitoring(prev => {
          const type = Math.random() > 0.6 ? 'Transaksi' : Math.random() > 0.3 ? 'Login' : 'Register';
          const status = Math.random() > 0.8 ? 'gagal' : Math.random() > 0.6 ? 'pending' : 'berhasil';
          const msg = DUMMY_EMAILS[Math.floor(Math.random() * DUMMY_EMAILS.length)];
          
          const newEntry = { time: getCurrentTimeWithSeconds(), type, msg, status };
          return [newEntry, ...prev].slice(0, 6); // Maksimal 6 data terbaru
        });
      }

      // Simulasi 10% peluang ada alert baru per detik
      if (Math.random() > 0.9) {
        setLiveAlerts(prev => {
          const errorType = DUMMY_ERRORS[Math.floor(Math.random() * DUMMY_ERRORS.length)];
          const newAlert = { ...errorType, time: getCurrentTimeWithSeconds() };
          return [newAlert, ...prev].slice(0, 5); // Maksimal 5 alert terbaru
        });
      }

    }, 1000); 

    return () => clearInterval(t);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'berhasil': return <span className="badge badge-success" style={{ minWidth: 65, textAlign: 'center' }}>Berhasil</span>;
      case 'pending': return <span className="badge badge-warning" style={{ minWidth: 65, textAlign: 'center' }}>Pending</span>;
      case 'gagal': return <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', minWidth: 65, textAlign: 'center' }}>Gagal</span>;
      default: return null;
    }
  };

  const getAlertBadge = (type) => {
    if (type === 'danger') {
      return <span className="badge" style={{ backgroundColor: '#ef4444', color: '#fff', minWidth: 65, textAlign: 'center' }}>Critical</span>;
    }
    return <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#fff', minWidth: 65, textAlign: 'center' }}>Warning</span>;
  };

  return (
    <>
      <Topbar title="Dashboard Live" subtitle="Monitoring seluruh aktivitas sistem secara real-time" />
      <div className="page-content section-gap">

        {/* --- BARIS 1: STAT CARDS (4 Kolom) --- */}
        <div className="grid-4" style={{ marginBottom: '20px' }}>
          <div className="stat-card animate-fade-up" style={{ '--stat-color': '#f59e0b', '--stat-bg': 'rgba(245,158,11,.12)', animationDelay: '0s' }}>
            <div className="stat-info">
              <div className="stat-label">Register Hari Ini</div>
              <div className="stat-value">156</div>
              <div className="stat-change up">+2.1% dari kemarin</div>
            </div>
          </div>
          <div className="stat-card animate-fade-up" style={{ '--stat-color': '#22c55e', '--stat-bg': 'rgba(34,197,94,.12)', animationDelay: '0.08s' }}>
            <div className="stat-info">
              <div className="stat-label">Login Hari Ini</div>
              <div className="stat-value">1,246</div>
              <div className="stat-change up">+12% dari kemarin</div>
            </div>
          </div>
          <div className="stat-card animate-fade-up" style={{ '--stat-color': '#4072af', '--stat-bg': '#dae2ef', animationDelay: '0.16s' }}>
            <div className="stat-info">
              <div className="stat-label">Transaksi Hari Ini</div>
              <div className="stat-value">3,840</div>
              <div className="stat-change up">+5.2% dari kemarin</div>
            </div>
          </div>
          <div className="stat-card animate-fade-up" style={{ '--stat-color': '#ef4444', '--stat-bg': 'rgba(239,68,68,.12)', animationDelay: '0.24s' }}>
            <div className="stat-info">
              <div className="stat-label">Total Error Hari Ini</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>148</div>
              <div className="stat-change down">-12% dari kemarin</div>
            </div>
          </div>
        </div>

        {/* --- BARIS 2: LIVE LISTS PER MENIT --- */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          {/* Live User Monitoring */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.28s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Live Monitoring User</div>
                <div className="card-subtitle">Aktivitas realtime per menit</div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-ring 2s infinite' }} />
            </div>
            <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 5 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ paddingBottom: 8, fontWeight: 600 }}>Waktu</th>
                    <th style={{ paddingBottom: 8, fontWeight: 600 }}>Tipe</th>
                    <th style={{ paddingBottom: 8, fontWeight: 600 }}>Pengguna</th>
                    <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveMonitoring.map((item, index) => (
                    <tr key={index} style={{ borderBottom: index < liveMonitoring.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 0', fontSize: 12, color: '#4072af', fontFamily: 'monospace' }}>{item.time}</td>
                      <td style={{ padding: '12px 0', fontSize: 12, fontWeight: 600, color: item.type === 'Register' ? '#f59e0b' : item.type === 'Login' ? '#22c55e' : '#4072af' }}>{item.type}</td>
                      <td style={{ padding: '12px 0', fontSize: 12, color: '#334155', fontWeight: 500 }}>{item.msg}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>{getStatusBadge(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Error Alerts - Desain Disamakan */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.32s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Live Alert Error</div>
                <div className="card-subtitle">Log anomali dan error per menit</div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
            </div>
            <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 5 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ paddingBottom: 8, fontWeight: 600 }}>Waktu</th>
                    <th style={{ paddingBottom: 8, fontWeight: 600 }}>Pesan Error</th>
                    <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: 'right' }}>Tingkat</th>
                  </tr>
                </thead>
                <tbody>
                  {liveAlerts.map((a, i) => (
                    <tr key={i} style={{ borderBottom: i < liveAlerts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                       <td style={{ padding: '12px 0', fontSize: 12, color: '#ef4444', fontFamily: 'monospace', width: '70px' }}>{a.time}</td>
                       <td style={{ padding: '12px 0', fontSize: 12, color: a.type === 'danger' ? '#646464' : '#646464', fontWeight: 500 }}>
                          <span style={{display: 'block', fontWeight: 'bold'}}>{a.title}</span>
                          <span style={{fontSize: 11}}>{a.desc}</span>
                       </td>
                       <td style={{ padding: '12px 0', textAlign: 'right' }}>{getAlertBadge(a.type)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- BARIS 3: GRAFIK GARIS (Berhasil vs Error per 3 Jam) --- */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          <div className="card animate-fade-up" style={{ animationDelay: '0.36s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Grafik BERHASIL (Per 3 Jam)</div>
                <div className="card-subtitle">Volume request yang sukses diproses</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LINE_SUCCESS_3H} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b8aaa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8aaa' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="register" name="Register" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="login" name="Login" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="trx" name="Transaksi" stroke="#4072af" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ color: '#ef4444' }}>Grafik ERROR (Per 3 Jam)</div>
                <div className="card-subtitle">Volume request yang gagal/bermasalah</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LINE_ERROR_3H} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b8aaa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8aaa' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #fecaca' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="register" name="Register Err" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="login" name="Login Err" stroke="#15803d" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="trx" name="Transaksi Err" stroke="#b91c1c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- BARIS 4: GRAFIK PIE (Berhasil vs Error Hari Ini) --- */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          {/* Pie Chart Berhasil */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.44s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Proporsi BERHASIL</div>
                <div className="card-subtitle">Persentase aktivitas normal hari ini</div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_SUCCESS_TODAY} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {PIE_SUCCESS_TODAY.map((entry, index) => (
                      <Cell key={`cell-success-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart Error */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.48s' }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ color: '#ef4444' }}>Proporsi ERROR</div>
                <div className="card-subtitle">Persentase kegagalan aktivitas hari ini</div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_ERROR_TODAY} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {PIE_ERROR_TODAY.map((entry, index) => (
                      <Cell key={`cell-error-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #fecaca' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- BARIS 5: SYSTEM HEALTH & RINGKASAN MINGGUAN --- */}
        <div className="grid-2">
          {/* System Health */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.52s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">System Health</div>
                <div className="card-subtitle">Penggunaan resource server</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
              {SYS_HEALTH.map((r, i) => (
                <div key={i} className="progress-wrap">
                  <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="progress-label" style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</span>
                    <span className="progress-value" style={{ fontSize: 13, fontWeight: 600, color: r.val > 80 ? '#ef4444' : r.val > 60 ? '#f59e0b' : r.color }}>{r.val}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                    <div className="progress-fill" style={{ height: '100%', width: `${r.val}%`, background: r.val > 80 ? '#ef4444' : r.val > 60 ? '#f59e0b' : r.color, borderRadius: '5px', transition: 'width 1s ease-in-out' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grafik 7 Hari */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.56s' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Ringkasan 7 Hari Terakhir</div>
                <div className="card-subtitle">Kalkulasi aktivitas mingguan</div>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SUMMARY_7_DAYS} barSize={10} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b8aaa' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b8aaa' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8edf4', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  <Bar dataKey="tx" name="Transaksi" fill="#4072af" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="users" name="User Aktif" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="err" name="Error" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}