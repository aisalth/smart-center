import { createContext, useContext, useState, useCallback } from 'react';
import {
  FaBell,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaBolt,
  FaInfoCircle,
  FaCheckCircle,
  FaClipboardList,
  FaTimes,
} from 'react-icons/fa';

const TOAST_COLORS = {
  critical: { bg:'#fef2f2', border:'#fca5a5', Icon: FaExclamationCircle,  color:'#dc2626' },
  error:    { bg:'#fff7ed', border:'#fdba74', Icon: FaExclamationTriangle, color:'#ea580c' },
  warning:  { bg:'#fefce8', border:'#fde047', Icon: FaBolt,                color:'#ca8a04' },
  info:     { bg:'#eff6ff', border:'#93c5fd', Icon: FaInfoCircle,          color:'#2563eb' },
  success:  { bg:'#f0fdf4', border:'#86efac', Icon: FaCheckCircle,         color:'#16a34a' },
};

const NotifContext = createContext(null);

export function useNotif() {
  return useContext(NotifContext);
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifLog, setNotifLog] = useState([]);
  const [showLogPanel, setShowLogPanel] = useState(false);

  // ── Berkala: min 90 menit antar alert (24h / 15 ≈ 96 min) ──
  const INTERVAL_MS = 90 * 60 * 1000;
  const [lastAlertTime] = useState(() => ({ ts: 0 }));
  const [pendingRef] = useState(() => ({ current: null })); // simpan alert terpenting saat cooldown

  const addNotif = useCallback((type, title, message, showToast = false) => {
    const now = Date.now();
    const entry = { id: now + Math.random(), type, title, message, createdAt: now, showToast };
    const elapsed = now - lastAlertTime.ts;

    if (elapsed >= INTERVAL_MS) {
      // Sudah lewat interval → langsung tampilkan
      lastAlertTime.ts = now;
      pendingRef.current = null;
      setNotifLog(prev => [entry, ...prev].slice(0, 50));
      if (showToast) {
        setToasts(prev => [entry, ...prev].slice(0, 3));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== entry.id)), 8000);
      }
    } else {
      // Masih dalam cooldown → simpan yg paling critical
      const severity = { critical: 3, error: 2, warning: 1, info: 0, success: 0 };
      const currentSev = severity[type] || 0;
      const pendingSev = pendingRef.current ? (severity[pendingRef.current.type] || 0) : -1;
      if (currentSev > pendingSev) {
        pendingRef.current = entry;
      }
    }
  }, [lastAlertTime, pendingRef]);

  // Timer: cek pending alert setiap 30 detik, tampilkan kalau cooldown sudah lewat
  useState(() => {
    const timer = setInterval(() => {
      if (pendingRef.current && Date.now() - lastAlertTime.ts >= INTERVAL_MS) {
        const entry = { ...pendingRef.current, id: Date.now() + Math.random(), createdAt: Date.now() };
        lastAlertTime.ts = Date.now();
        pendingRef.current = null;
        setNotifLog(prev => [entry, ...prev].slice(0, 50));
        if (entry.showToast) {
          setToasts(prev => [entry, ...prev].slice(0, 3));
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== entry.id)), 8000);
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  });

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearLog = useCallback(() => setNotifLog([]), []);

  const mono = { fontFamily:'JetBrains Mono, monospace' };

  return (
    <NotifContext.Provider value={{ addNotif, notifLog, clearLog, showLogPanel, setShowLogPanel }}>
      {children}

      {/* ══ BELL ICON ══ */}
      <button
        onClick={() => setShowLogPanel(p => !p)}
        style={{
          position:'fixed', bottom:24, right:24, zIndex:10000,
          width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#8b5cf6,#6366f1)', color:'#fff',
          boxShadow:'0 4px 16px rgba(139,92,246,0.4)', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, transition:'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        title="Notification Log"
      >
        <FaBell size={22} />
        {notifLog.length > 0 && (
          <span style={{
            position:'absolute', top:-2, right:-2, background:'#ef4444', color:'#fff',
            fontSize:10, fontWeight:800, minWidth:20, height:20, borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px',
            border:'2px solid #fff',
          }}>{notifLog.length > 99 ? '99+' : notifLog.length}</span>
        )}
      </button>

      {/* ══ LOG PANEL ══ */}
      {showLogPanel && (
        <div style={{
          position:'fixed', bottom:86, right:24, zIndex:10001,
          width:420, maxHeight:'70vh', background:'var(--card-bg)',
          border:'1px solid var(--card-border)', borderRadius:14,
          boxShadow:'0 12px 40px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column',
          animation:'slideInRight 0.25s ease-out',
        }}>
          <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--card-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--foreground)', display:'flex', alignItems:'center', gap:6 }}>
                <FaClipboardList size={15} /> Notification Log
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{notifLog.length} event tercatat</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {notifLog.length > 0 && (
                <button onClick={clearLog} style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:6, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', cursor:'pointer' }}>Clear All</button>
              )}
              <button onClick={() => setShowLogPanel(false)} style={{ display:'flex', alignItems:'center', background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', lineHeight:1 }}>
                <FaTimes size={16} />
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
            {notifLog.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>Belum ada notifikasi.</div>
            ) : notifLog.map(n => {
              const c = TOAST_COLORS[n.type] || TOAST_COLORS.info;
              return (
                <div key={n.id} style={{ padding:'10px 18px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ marginTop:2, color:c.color, flexShrink:0 }}>
                    <c.Icon size={14} />
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:700, fontSize:12, color:c.color }}>{n.title}</span>
                      <span style={{ fontSize:10, color:'#94a3b8', ...mono, flexShrink:0 }}>{new Date(n.createdAt).toLocaleTimeString('id-ID')}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#475569', marginTop:2, lineHeight:1.4, wordBreak:'break-word' }}>{n.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TOAST POPUP ══ */}
      {toasts.length > 0 && (
        <div style={{ position:'fixed', bottom:86, right:90, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:400 }}>
          {toasts.map(toast => {
            const colors = TOAST_COLORS[toast.type] || TOAST_COLORS.info;
            return (
              <div key={toast.id} style={{
                background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.color}`,
                borderRadius: 10, padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 320,
                animation: 'slideInRight 0.35s ease-out',
              }}>
                <span style={{ color: colors.color, flexShrink: 0, marginTop: 2 }}>
                  <colors.Icon size={20} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: colors.color, marginBottom: 3 }}>{toast.title}</div>
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4, wordBreak: 'break-word' }}>{toast.message}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, ...mono }}>{new Date(toast.createdAt).toLocaleTimeString('id-ID')}</div>
                </div>
                <button onClick={() => dismissToast(toast.id)} style={{ display:'flex', alignItems:'center', background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', padding:'0 2px', flexShrink:0 }}>
                  <FaTimes size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </NotifContext.Provider>
  );
}