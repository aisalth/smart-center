import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getContainerHistory } from '../api/zakiApi';
import { formatUptime } from '../api/snmpApi';
import { useNotif } from '../components/NotificationProvider';
import { FaServer, FaCircle } from 'react-icons/fa';

const BASE_URL = 'http://127.0.0.1:8000/api';

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const truncate = (str, n) => (str && str.length > n ? str.substr(0, n - 1) + '...' : str);

export default function DockerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotif } = useNotif();
  const alertedRef = useRef(new Set());

  const [hostInfo, setHostInfo] = useState(null);
  const [containers, setContainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Container detail monitoring
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [timeFilter, setTimeFilter] = useState(1440);

  // Find docker host for this device
  const fetchData = async () => {
    try {
      setError(null);

      // Get all docker hosts, find one linked to this device
      const hostsRes = await fetchJson('/docker/hosts');
      const hosts = hostsRes.data || [];
      const host = hosts.find(h => String(h.docker_host_id) === String(id)) || hosts[0];

      if (host) {
        // Get full host detail
        const detailRes = await fetchJson(`/docker/hosts/${host.docker_host_id}`);
        setHostInfo(detailRes.data);

        // Get containers
        const containersRes = await fetchJson(`/docker/hosts/${host.docker_host_id}/containers`);
        setContainers(containersRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch container history + check thresholds
  const fetchContainerHistory = async (containerName, minutes) => {
    try {
      const history = await getContainerHistory(containerName, minutes);
      const formatted = history.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        cpu: parseFloat(h.cpu_usage_percent || 0),
        ram: parseFloat(h.mem_usage_percent || 0),
      }));
      setHistoryData(formatted);

      // Check latest metrics for alerts
      if (formatted.length > 0) {
        const latest = formatted[0];
        const alerted = alertedRef.current;
        const name = containerName;

        if (latest.cpu >= 80) {
          const key = `docker-cpu-${name}`;
          if (!alerted.has(key)) {
            alerted.add(key);
            addNotif('critical', `Container CPU Tinggi: ${name}`, `CPU usage ${latest.cpu}% — melebihi batas 80%`, true);
          }
        } else { alertedRef.current.delete(`docker-cpu-${name}`); }

        if (latest.ram >= 85) {
          const key = `docker-ram-${name}`;
          if (!alerted.has(key)) {
            alerted.add(key);
            addNotif('critical', `Container RAM Tinggi: ${name}`, `RAM usage ${latest.ram}% — melebihi batas 85%`, true);
          }
        } else { alertedRef.current.delete(`docker-ram-${name}`); }
      }
    } catch (err) {
      setHistoryData([]);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (selectedContainer) {
      fetchContainerHistory(selectedContainer, timeFilter);
      const interval = setInterval(() => fetchContainerHistory(selectedContainer, timeFilter), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedContainer, timeFilter]);

  if (isLoading) {
    return (
      <>
        <Topbar title="Docker Detail" subtitle="Memuat..." />
        <div className="page-content section-gap" style={{ maxWidth: '100%', textAlign: 'center', marginTop: 50 }}>
          <div style={{ display: 'inline-block', padding: '20px 40px', background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #f1f5f9', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: 13 }}>Memuat data Docker...</div>
          </div>
        </div>
      </>
    );
  }

  const deviceName = hostInfo?.device?.hostname || hostInfo?.name || 'Docker Server';
  const device = hostInfo?.device || {};
  const runningCount = containers.filter(c => c.state === 'running').length;

  // InfoRow helper
  const InfoRow = ({ label, value, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 600, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value || '—'}</span>
    </div>
  );

  return (
    <>
      <Topbar title={`Docker: ${deviceName}`} subtitle="Detail server dan container monitoring" />
      <div className="page-content section-gap" style={{ maxWidth: '100%' }}>

        {/* Back button */}
        <button 
          onClick={() => navigate('/docker')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 24, transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = '#8b5cf6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--foreground)'; }}
        >
          ← Kembali
        </button>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {/* ══ HOST INFO CARDS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Server Info */}
          <Card title="Server Info" style={{ height: '100%' }}>
            <div style={{ marginTop: 8 }}>
              <InfoRow label="Hostname"         value={device.hostname} mono />
              <InfoRow label="IP Address"       value={device.ip} mono />
              <InfoRow label="Operating System" value={device.os} />
              <InfoRow label="Hardware (CPU)"   value={device.hardware} />
              <InfoRow label="Uptime"           value={formatUptime(device.uptime)} mono />
              <InfoRow
                label="Status"
                value={
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <FaCircle size={10} color={device.status ? '#22c55e' : '#ef4444'} />
                    {device.status ? 'Online' : 'Offline'}
                  </span>
                }
              />
              <InfoRow
                label="Last Polled"
                value={device.last_polled ? new Date(device.last_polled).toLocaleString('id-ID') : '—'}
              />
            </div>
          </Card>

          {/* Docker Info */}
          <Card title="Docker Engine" style={{ height: '100%' }}>
            <div style={{ marginTop: 8 }}>
              <InfoRow label="Docker Host Name" value={hostInfo?.name} />
              <InfoRow label="Connection Type" value={hostInfo?.connection_type || 'socket'} mono />
              <InfoRow label="Socket Path" value={hostInfo?.socket_path} mono />
              <InfoRow label="Docker Version" value={hostInfo?.docker_version || 'N/A'} mono />
              <InfoRow label="API Version" value={hostInfo?.api_version || 'N/A'} mono />
              <InfoRow label="Containers (Running / Total)" value={`${hostInfo?.containers_running ?? 0} / ${hostInfo?.containers_total ?? 0}`} mono />
              <InfoRow label="Last Connected" value={hostInfo?.last_connected ? new Date(hostInfo.last_connected).toLocaleString('id-ID') : '—'} />
            </div>
          </Card>
        </div>

        {/* ══ SUMMARY STATS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Container', value: containers.length, color: '#3b82f6', icon: '' },
            { label: 'Running', value: runningCount, color: '#22c55e', icon: '' },
            { label: 'Stopped', value: containers.length - runningCount, color: '#ef4444', icon: '' },
            { label: 'Engine', value: device.status ? 'Online' : 'Offline', color: device.status ? '#22c55e' : '#ef4444', icon: '' },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12,
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 24 }}>{card.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ CONTAINER TABLE ══ */}
        <Card title="Container Instances" subtitle={`${containers.length} container — klik Monitor untuk lihat detail`} style={{ marginBottom: 24 }}>
          {containers.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>
              Belum ada container yang tercatat.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Nama</th>
                    <th style={{ padding: '12px 8px' }}>Image</th>
                    <th style={{ padding: '12px 8px' }}>Last Polled</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Monitoring</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((c, i) => {
                    const isRunning = c.state === 'running';
                    const isSelected = selectedContainer === c.name;

                    return (
                      <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(139,92,246,0.06)' : 'transparent', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(64,114,175,0.04)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(139,92,246,0.06)' : 'transparent'; }}
                      >
                        <td style={{ padding: '12px 8px' }}>
                          <Badge variant={isRunning ? 'success' : 'danger'} style={{ fontSize: 10, padding: '4px 8px' }}>
                            {isRunning ? 'RUNNING' : 'STOPPED'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>{truncate(c.name || '—', 40)}</div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                          {truncate(c.image || '—', 50)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.last_polled ? new Date(c.last_polled).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button 
                            onClick={() => setSelectedContainer(isSelected ? null : c.name)}
                            style={{
                              padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${isSelected ? '#8b5cf6' : 'var(--card-border)'}`,
                              background: isSelected ? '#8b5cf6' : 'transparent',
                              color: isSelected ? '#fff' : 'var(--text-muted)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {isSelected ? '● Viewing' : 'Monitor'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ══ CONTAINER MONITORING DETAIL ══ */}
        {selectedContainer && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>Performance Overview</div>
                <div style={{ fontSize: 13, color: '#8b5cf6', marginTop: 2, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{selectedContainer}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: '15m', value: 15 },
                  { label: '1h', value: 60 },
                  { label: '3h', value: 180 },
                  { label: '24h', value: 1440 },
                  { label: '7d', value: 10080 },
                  { label: '30d', value: 43200 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeFilter(opt.value)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${timeFilter === opt.value ? '#8b5cf6' : 'var(--card-border)'}`,
                      background: timeFilter === opt.value ? 'rgba(139,92,246,0.1)' : 'var(--card-bg)',
                      color: timeFilter === opt.value ? '#8b5cf6' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* CPU Chart */}
              <Card title="CPU Utilization" style={{ height: '100%' }}>
                <div style={{ height: 220, marginTop: 10, marginLeft: -20 }}>
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeOpacity={0.5} />
                        <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} minTickGap={20} />
                        <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={45} tick={{fill: 'var(--text-muted)'}} />
                        <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#8b5cf6" fill="url(#cpuGrad)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      Belum ada data CPU history
                    </div>
                  )}
                </div>
              </Card>

              {/* RAM Chart */}
              <Card title="RAM Usage" style={{ height: '100%' }}>
                <div style={{ height: 220, marginTop: 10, marginLeft: -20 }}>
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeOpacity={0.5} />
                        <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} minTickGap={20} />
                        <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={45} tick={{fill: 'var(--text-muted)'}} />
                        <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="ram" name="RAM %" stroke="#22c55e" fill="url(#ramGrad)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      Belum ada data RAM history
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>
    </>
  );
}