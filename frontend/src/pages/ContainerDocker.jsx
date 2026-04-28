import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { getSnmpDevices, formatUptime } from '../api/snmpApi';

export default function ContainerDocker() {
  const navigate = useNavigate();

  const [devices, setDevices]         = useState([]);
  const [meta, setMeta]               = useState({ total: 0, online: 0, offline: 0 });
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(false);

  const fetchDevices = async () => {
    try {
      setError(false);
      const res = await getSnmpDevices('docker');
      setDevices(res.data || []);
      setMeta(res.meta || { total: 0, online: 0, offline: 0 });
    } catch (err) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Topbar title="Docker Container" subtitle="Monitoring server Docker dan container-nya" />
      <div className="page-content section-gap" style={{ maxWidth: '100%' }}>

        {/* ══ SUMMARY CARDS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Server', value: meta.total, color: '#8b5cf6', icon: '🐳' },
            { label: 'Online', value: meta.online, color: '#22c55e', icon: '🟢' },
            { label: 'Offline', value: meta.offline, color: '#ef4444', icon: '🔴' },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 28 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ DEVICE TABLE ══ */}
        <Card 
          title="Docker Servers" 
          subtitle={`${meta.online} online · ${meta.offline} offline`}
          rightElement={
            <button 
              onClick={fetchDevices}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              ↻
            </button>
          }
        >
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>
              ⚠ Gagal memuat data. Pastikan backend berjalan.
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #f1f5f9', borderTop: '2px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              Memuat server Docker...
            </div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Belum ada server Docker yang terdaftar.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr>
                    {['STATUS', 'NAMA SERVER', 'IP ADDRESS', 'OS', 'UPTIME', 'LAST POLLED'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev) => (
                    <tr 
                      key={dev.device_id}
                      onClick={() => navigate(`/deviceDocker/${dev.device_id}`)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: dev.status ? '#22c55e' : '#ef4444' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dev.status ? '#22c55e' : '#ef4444', boxShadow: dev.status ? '0 0 5px #22c55e' : 'none' }} />
                          {dev.status ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#8b5cf6' }}>
                        {dev.hostname}
                        {dev.sysName && dev.sysName !== dev.hostname && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{dev.sysName}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{dev.ip}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)' }}>{dev.os || '—'}</td>
                      <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatUptime(dev.uptime)}
                      </td>
                      <td style={{ padding: '12px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {dev.last_polled ? new Date(dev.last_polled).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
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