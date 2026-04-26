import { useState, useEffect } from 'react';

export default function Topbar({ title, subtitle }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d) =>
    d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="topbar">
      <div style={{ flex: 1 }}>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>

      <div className="topbar-actions">
        {/* <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>  */}

        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
          <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 14 }}>
            {time.toLocaleTimeString('id-ID')}
          </div>
          <div>{fmt(time)}</div>
        </div>

        {/* <button className="topbar-btn" title="Notifikasi">
          <span className="topbar-notif-dot" />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button> */}

        <button className="topbar-btn" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </div>
  );
}