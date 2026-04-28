import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { useNotif } from '../components/NotificationProvider';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = 'http://127.0.0.1:8000/api/smartpay';
const get = async (path) => { const r = await fetch(`${API}${path}`); return r.json(); };

const formatRp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
const mono = { fontFamily:'JetBrains Mono, monospace' };
const tblHead = { padding:'8px 12px', fontSize:10, color:'#64748b', textTransform:'uppercase' };
const tblCell = { padding:'10px 12px', fontSize:12 };

const StatusBadge = ({status}) => {
  if(status==='success') return <Badge variant="success">SUCCESS</Badge>;
  if(status==='failed') return <Badge variant="danger">FAILED</Badge>;
  return <Badge variant="warning">PENDING</Badge>;
};
const SevBadge = ({sev}) => {
  if(sev==='critical') return <Badge variant="danger">CRITICAL</Badge>;
  if(sev==='error') return <Badge variant="warning">ERROR</Badge>;
  return <Badge variant="warning">WARNING</Badge>;
};

// Toast notification colors
const TOAST_COLORS = {
  critical: { bg:'#fef2f2', border:'#fca5a5', icon:'🚨', color:'#dc2626' },
  error:    { bg:'#fff7ed', border:'#fdba74', icon:'⚠️', color:'#ea580c' },
  warning:  { bg:'#fefce8', border:'#fde047', icon:'⚡', color:'#ca8a04' },
  info:     { bg:'#eff6ff', border:'#93c5fd', icon:'ℹ️', color:'#2563eb' },
  success:  { bg:'#f0fdf4', border:'#86efac', icon:'✅', color:'#16a34a' },
};

export default function SmartPayDashboard() {
  const { addNotif } = useNotif();
  const [ssoStats, setSsoStats] = useState(null);
  const [ssoWeekly, setSsoWeekly] = useState([]);
  const [liveAuth, setLiveAuth] = useState([]);
  const [trafficStats, setTrafficStats] = useState(null);
  const [hourlyTraffic, setHourlyTraffic] = useState([]);
  const [liveTraffic, setLiveTraffic] = useState([]);
  const [payStats, setPayStats] = useState(null);
  const [liveTrx, setLiveTrx] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seenAlertIds] = useState(() => new Set());

  // Initial load (all dashboards + charts)
  const loadAll = useCallback(async () => {
    try {
      const [sso, week, tDash, tHour, pay, sec] = await Promise.all([
        get('/sso/dashboard'), get('/sso/weekly'),
        get('/traffic/dashboard'), get('/traffic/hourly'),
        get('/payment/dashboard'), get('/security/alerts'),
      ]);
      setSsoStats(sso.data); setSsoWeekly(week.data);
      setTrafficStats(tDash.data); setHourlyTraffic(tHour.data);
      setPayStats(pay.data); setAlerts(sec.data);
    } catch(e) { console.error('Init load failed',e); }
    setLoading(false);
  }, []);

  // Live feeds refresh + notifications (toast hanya critical)
  const refreshLive = useCallback(async () => {
    try {
      const [auth, traf, trx, sso, pay] = await Promise.all([
        get('/sso/live'), get('/traffic/live'), get('/payment/live'),
        get('/sso/dashboard'), get('/payment/dashboard'),
      ]);

      // Log failed logins (no toast)
      const failedLogins = (auth.data||[]).filter(a => a.status==='failed');
      if (failedLogins.length >= 2) {
        addNotif('warning', 'SSO Login Gagal', `${failedLogins.length} login gagal dalam batch terakhir`);
      }

      // Log failed transactions (no toast)
      const failedTrx = (trx.data||[]).filter(t => t.status==='failed');
      failedTrx.forEach(t => {
        addNotif('error', 'Transaksi Gagal', `${t.description} — ${t.user?.name} (${t.failure_reason || 'error'})`);
      });

      // CRITICAL: low success rate → toast + log
      if (pay.data?.success_rate && pay.data.success_rate < 97) {
        addNotif('critical', 'Success Rate Kritis!', `Payment success rate: ${pay.data.success_rate}% — di bawah threshold 97%`, true);
      }

      setLiveAuth(prev => [...(auth.data||[]), ...prev].slice(0,30));
      setLiveTraffic(prev => [...(traf.data||[]), ...prev].slice(0,35));
      setLiveTrx(prev => [...(trx.data||[]), ...prev].slice(0,20));
      setSsoStats(sso.data); setPayStats(pay.data);
    } catch(e) {
      console.error('Live refresh failed',e);
      addNotif('critical', 'Koneksi Terputus', 'Gagal terhubung ke API server', true);
    }
  }, [addNotif]);

  useEffect(() => {
    loadAll();
    const liveInt = setInterval(refreshLive, 5000);
    const alertInt = setInterval(async () => {
      try {
        const r = await get('/security/alerts');
        const newAlerts = r.data || [];
        newAlerts.forEach(a => {
          if (!seenAlertIds.has(a.id)) {
            seenAlertIds.add(a.id);
            // CRITICAL security → toast + log; error → log only
            const isCrit = a.severity === 'critical';
            addNotif(a.severity, `Security ${a.severity.toUpperCase()}`, `${a.description} — ${a.user?.name} (${a.ip})`, isCrit);
          }
        });
        setAlerts(newAlerts);
      } catch(e) {}
    }, 15000);
    return () => { clearInterval(liveInt); clearInterval(alertInt); };
  }, [loadAll, refreshLive, addNotif, seenAlertIds]);

  if (loading) return (
    <><Topbar title="SmartPay Dashboard" subtitle="Loading..." />
    <div style={{textAlign:'center',marginTop:80}}>
      <div style={{width:40,height:40,border:'3px solid #f1f5f9',borderTop:'3px solid #8b5cf6',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 15px'}}/>
      <div style={{color:'#64748b'}}>Memuat data dari API...</div>
    </div></>
  );

  const sso = ssoStats || {};
  const pay = payStats || {};
  const traf = trafficStats || {};

  return (
    <>
      <Topbar title="SmartPay Dashboard" subtitle="SSO Monitoring · Website Traffic Pariwisata · Transaksi · Keamanan" />
      <div className="page-content section-gap" style={{ padding:'0 24px 40px' }}>

        {/* ══ ROW 1: KPI STATS ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginTop:20, marginBottom:24 }}>
          <StatCard label="SSO Login Hari Ini" value={(sso.login?.today||0).toLocaleString()}
            changeText={`✓ ${sso.login?.success||0} OK · ✗ ${sso.login?.failed||0} Gagal · Rate: ${sso.login?.rate||0}%`}
            changeType="up" color="#8b5cf6" bg="rgba(139,92,246,.12)" delay="0s" />
          <StatCard label="SSO Register Hari Ini" value={(sso.register?.today||0).toLocaleString()}
            changeText={`✓ ${sso.register?.success||0} OK · ✗ ${sso.register?.failed||0} Gagal · Rate: ${sso.register?.rate||0}%`}
            changeType="up" color="#3b82f6" bg="rgba(59,130,246,.12)" delay="0.1s" />
          <StatCard label="Website Visitors" value={(traf.visitors_today||0).toLocaleString()}
            changeText={`${(traf.pageviews_today||0).toLocaleString()} pageviews · Bounce: ${traf.bounce_rate||0}%`}
            changeType="up" color="#10b981" bg="rgba(16,185,129,.12)" delay="0.2s" />
          <StatCard label="Active Sessions" value={(sso.active_sessions||0).toLocaleString()}
            changeText={`${sso.blocked_ips||0} IP diblokir`} color="#f59e0b" bg="rgba(245,158,11,.12)" delay="0.3s">
            <span style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b',animation:'pulse-ring 2s infinite'}} />
          </StatCard>
        </div>

        {/* ══ ROW 2: SSO WEEKLY + TRAFFIC HOURLY CHARTS ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          <Card title="📊 SSO Activity (7 Hari)" subtitle="Login & Register harian dari API">
            <div style={{ height:260, marginTop:10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ssoWeekly} margin={{top:10,right:10,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{borderRadius:8,border:'none',fontSize:12}} />
                  <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                  <Bar dataKey="login_success" name="Login OK" fill="#8b5cf6" radius={[2,2,0,0]} />
                  <Bar dataKey="login_failed" name="Login Fail" fill="#ef4444" radius={[2,2,0,0]} />
                  <Bar dataKey="register_success" name="Reg OK" fill="#3b82f6" radius={[2,2,0,0]} />
                  <Bar dataKey="register_failed" name="Reg Fail" fill="#f59e0b" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="🌐 Traffic Portal Pariwisata (24 Jam)" subtitle="Visitors & pageviews per jam dari API">
            <div style={{ height:260, marginTop:10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyTraffic} margin={{top:10,right:10,left:-20,bottom:0}}>
                  <defs>
                    <linearGradient id="gVis" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{borderRadius:8,border:'none',fontSize:12}} />
                  <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                  <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" fill="url(#gVis)" strokeWidth={2} />
                  <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#3b82f6" fill="url(#gPv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ══ ROW 3: PAYMENT STATS ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          <div style={{background:'rgba(16,185,129,.08)',borderRadius:12,padding:'16px 20px',border:'1px solid var(--card-border)'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>Volume Transaksi</div>
            <div style={{fontSize:22,fontWeight:800,color:'#10b981',...mono}}>Rp {((pay.volume_today||0)/1e9).toFixed(2)} M</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{(pay.trx_count_today||0).toLocaleString()} transaksi</div>
          </div>
          <div style={{background:'rgba(34,197,94,.08)',borderRadius:12,padding:'16px 20px',border:'1px solid var(--card-border)'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>Success Rate</div>
            <div style={{fontSize:22,fontWeight:800,color:(pay.success_rate||0)>98?'#22c55e':'#f59e0b',...mono}}>{pay.success_rate||0}%</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Peak: {pay.peak_tps||0} TPS</div>
          </div>
          <div style={{background:'rgba(59,130,246,.08)',borderRadius:12,padding:'16px 20px',border:'1px solid var(--card-border)'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>Active Users</div>
            <div style={{fontSize:22,fontWeight:800,color:'#3b82f6',...mono}}>{(pay.active_users||0).toLocaleString()}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Avg: {formatRp(pay.avg_trx_value||0)}/trx</div>
          </div>
        </div>

        {/* ══ ROW 4: LIVE SSO AUTH ══ */}
        <Card title="🔐 Live SSO Authentication" subtitle="Data real-time dari API /sso/live" rightElement={<Badge variant="success">SSO Active</Badge>} style={{marginBottom:24}}>
          <div style={{ maxHeight:300, overflowY:'auto', marginTop:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead style={{ position:'sticky', top:0, background:'var(--card-bg)', zIndex:10 }}>
                <tr style={{ borderBottom:'1px solid var(--card-border)', textAlign:'left' }}>
                  {['WAKTU','IP','USER','EMAIL','AKSI','METHOD','BROWSER','REGION','STATUS'].map(h => <th key={h} style={tblHead}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {liveAuth.length===0 ? <tr><td colSpan={9} style={{...tblCell,textAlign:'center',color:'#94a3b8'}}>Fetching data...</td></tr> :
                liveAuth.map((a,i) => (
                  <tr key={a.id+i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{...tblCell,color:'#64748b',...mono}}>{a.time}</td>
                    <td style={{...tblCell,color:'#94a3b8',...mono,fontSize:11}}>{a.ip}</td>
                    <td style={{...tblCell,fontWeight:600,color:'#334155'}}>{a.user?.name}</td>
                    <td style={{...tblCell,color:'#3b82f6',fontSize:11}}>{a.user?.email}</td>
                    <td style={tblCell}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:a.action==='register'?'rgba(59,130,246,.1)':'rgba(139,92,246,.1)', color:a.action==='register'?'#3b82f6':'#8b5cf6' }}>{a.action}</span>
                    </td>
                    <td style={{...tblCell,fontSize:11,color:'#64748b'}}>{a.method}</td>
                    <td style={{...tblCell,fontSize:11,color:'#64748b'}}>{a.browser}</td>
                    <td style={{...tblCell,fontSize:11,color:'#475569'}}>{a.region}</td>
                    <td style={{...tblCell,textAlign:'center'}}><StatusBadge status={a.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ ROW 5: LIVE WEBSITE TRAFFIC ══ */}
        <Card title="🌍 Live Website Traffic — Portal Pariwisata" subtitle="Data real-time dari API /traffic/live" rightElement={<span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',display:'block',animation:'pulse-ring 1s infinite'}}/>} style={{marginBottom:24}}>
          <div style={{ maxHeight:300, overflowY:'auto', marginTop:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead style={{ position:'sticky', top:0, background:'var(--card-bg)', zIndex:10 }}>
                <tr style={{ borderBottom:'1px solid var(--card-border)', textAlign:'left' }}>
                  {['WAKTU','IP','HALAMAN','HTTP','DEVICE','BROWSER','REGION','REFERRER','RESP','DURASI'].map(h => <th key={h} style={tblHead}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {liveTraffic.length===0 ? <tr><td colSpan={10} style={{...tblCell,textAlign:'center',color:'#94a3b8'}}>Fetching data...</td></tr> :
                liveTraffic.map((t,i) => (
                  <tr key={t.id+i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{...tblCell,color:'#64748b',...mono}}>{t.time}</td>
                    <td style={{...tblCell,color:'#94a3b8',...mono,fontSize:11}}>{t.ip}</td>
                    <td style={{...tblCell,fontWeight:600,color:'#10b981',fontSize:11,...mono}}>{t.page}</td>
                    <td style={tblCell}>
                      <span style={{fontSize:10,fontWeight:700,color:t.status_code===200?'#22c55e':t.status_code===404?'#ef4444':'#f59e0b',...mono}}>{t.status_code}</span>
                    </td>
                    <td style={{...tblCell,fontSize:11,color:'#64748b'}}>{t.device}</td>
                    <td style={{...tblCell,fontSize:11,color:'#64748b'}}>{t.browser}</td>
                    <td style={{...tblCell,fontSize:11,color:'#475569'}}>{t.region}</td>
                    <td style={tblCell}><span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:4,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#475569'}}>{t.referrer}</span></td>
                    <td style={{...tblCell,color:t.response_time_ms>500?'#ef4444':'#64748b',...mono,fontSize:11}}>{t.response_time_ms}ms</td>
                    <td style={{...tblCell,color:'#64748b',...mono,fontSize:11}}>{t.session_duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ ROW 6: LIVE TRANSACTIONS ══ */}
        <Card title="💳 Live Transactions" subtitle="Data real-time dari API /payment/live" rightElement={<span style={{width:8,height:8,borderRadius:'50%',background:'#10b981',display:'block',animation:'pulse-ring 1s infinite'}}/>} style={{marginBottom:24}}>
          <div style={{ maxHeight:300, overflowY:'auto', marginTop:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead style={{ position:'sticky', top:0, background:'var(--card-bg)', zIndex:10 }}>
                <tr style={{ borderBottom:'1px solid var(--card-border)', textAlign:'left' }}>
                  {['WAKTU','TRX ID','IP','USER','TIPE','NOMINAL','METHOD','STATUS'].map(h => <th key={h} style={tblHead}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {liveTrx.map((tx,i) => (
                  <tr key={tx.trx_id+i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{...tblCell,color:'#64748b',...mono}}>{tx.time}</td>
                    <td style={{...tblCell,...mono,fontSize:11,color:'#94a3b8'}}>{tx.trx_id}</td>
                    <td style={{...tblCell,...mono,fontSize:11,color:'#94a3b8'}}>{tx.ip}</td>
                    <td style={{...tblCell,fontWeight:600,color:'#334155'}}>{tx.user?.name}</td>
                    <td style={{...tblCell,color:'#475569',fontSize:12}}>{tx.description}</td>
                    <td style={{...tblCell,fontWeight:700,color:'#334155',textAlign:'right'}}>{formatRp(tx.amount)}</td>
                    <td style={{...tblCell,fontSize:11,color:'#64748b'}}>{tx.payment_method}</td>
                    <td style={{...tblCell,textAlign:'center'}}><StatusBadge status={tx.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ══ ROW 7: SECURITY ALERTS ══ */}
        <Card title="🛡️ Security & Fraud Monitor" subtitle="Data dari API /security/alerts" rightElement={<span style={{width:8,height:8,borderRadius:'50%',background:'#dc2626',display:'inline-block',animation:'blink 1.5s infinite'}}/>}>
          <div style={{ maxHeight:260, overflowY:'auto', marginTop:10 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead style={{ position:'sticky', top:0, background:'var(--card-bg)', zIndex:10 }}>
                <tr style={{ borderBottom:'1px solid var(--card-border)', textAlign:'left' }}>
                  {['WAKTU','IP','USER','DESKRIPSI','SEVERITY','STATUS'].map(h => <th key={h} style={tblHead}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {alerts.length===0 ? <tr><td colSpan={6} style={{...tblCell,textAlign:'center',color:'#94a3b8'}}>Sistem aman.</td></tr> :
                alerts.map((a,i) => (
                  <tr key={a.id+i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{...tblCell,color:'#64748b',...mono}}>{a.time}</td>
                    <td style={{...tblCell,...mono,fontSize:11,color:'#94a3b8'}}>{a.ip}</td>
                    <td style={{...tblCell,fontWeight:600,color:'#334155'}}>{a.user?.name}</td>
                    <td style={{...tblCell,fontWeight:600,color:'#475569'}}>{a.description}</td>
                    <td style={{...tblCell,textAlign:'center'}}><SevBadge sev={a.severity}/></td>
                    <td style={{...tblCell,textAlign:'center'}}>
                      <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4,background:a.resolved?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)',color:a.resolved?'#22c55e':'#ef4444'}}>{a.resolved?'Resolved':'Open'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </>
  );
}