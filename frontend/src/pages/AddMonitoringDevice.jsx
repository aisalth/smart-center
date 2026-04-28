import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import { createSnmpDevice, pollSnmpDevice } from '../api/snmpApi';

export default function AddDevice() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    hostname: '',
    ip: '',
    community: 'public',
    snmpver: 'v2c',
    port: '161',
    transport: 'udp',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError]   = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.hostname.trim()) {
      setSubmitError('Hostname wajib diisi.');
      return;
    }
    if (!formData.ip.trim()) {
      setSubmitError('IP Address wajib diisi.');
      return;
    }
    if (!formData.community.trim()) {
      setSubmitError('SNMP Community wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createSnmpDevice({
        hostname:    formData.hostname.trim(),
        overwriteIp: formData.ip.trim(),
        community:   formData.community.trim(),
        snmpVersion: formData.snmpver,
        port:        formData.port,
        protocol:    formData.transport,
      });

      const deviceId = res.data?.device_id;
      const polled   = res.polled;

      setSubmitSuccess(
        polled
          ? `✓ Device "${formData.hostname}" berhasil ditambahkan dan data SNMP berhasil diambil!`
          : `✓ Device "${formData.hostname}" berhasil ditambahkan. SNMP poll akan berjalan otomatis tiap menit.`
      );

      // Redirect setelah 2 detik
      setTimeout(() => navigate('/server'), 2000);
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan device. Periksa koneksi backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--card-border)', background: 'var(--background)',
    color: 'var(--foreground)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace',
    outline: 'none', transition: 'border 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)',
    marginBottom: '6px', display: 'block', textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <>
      <Topbar title="Add Device" subtitle="Tambahkan perangkat baru untuk dimonitor via SNMP" />

      <div className="page-content section-gap" style={{ maxWidth: '100%', paddingBottom: '50px' }}>

        <button
          onClick={() => navigate('/server')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 24, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--foreground)'; }}
        >
          ← Kembali ke Server
        </button>

        <Card title="Device Configuration" subtitle="Isi informasi SNMP untuk menambahkan device baru" style={{ maxWidth: 700 }}>

          <form onSubmit={handleSubmit}>

            {/* Hostname & IP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Hostname / Nama Device *</label>
                <input type="text" name="hostname" value={formData.hostname} onChange={handleChange}
                  placeholder="contoh: vps-testing" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Nama yang tampil di dashboard</div>
              </div>
              <div>
                <label style={labelStyle}>IP Address *</label>
                <input type="text" name="ip" value={formData.ip} onChange={handleChange}
                  placeholder="contoh: 192.168.1.10" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>IP yang bisa diakses via SNMP</div>
              </div>
            </div>

            {/* SNMP Community */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>SNMP Community *</label>
              <input type="text" name="community" value={formData.community} onChange={handleChange}
                placeholder="public" style={{ ...inputStyle, maxWidth: 400 }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Community string untuk SNMP v1/v2c (default: public)</div>
            </div>

            {/* SNMP Version, Port, Transport */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>SNMP Version</label>
                <select name="snmpver" value={formData.snmpver} onChange={handleChange} style={inputStyle}>
                  <option value="v1">v1</option>
                  <option value="v2c">v2c</option>
                  <option value="v3">v3</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Port</label>
                <input type="number" name="port" value={formData.port} onChange={handleChange}
                  placeholder="161" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Transport</label>
                <select name="transport" value={formData.transport} onChange={handleChange} style={inputStyle}>
                  <option value="udp">UDP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
            </div>


            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--card-border)' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: isSubmitting ? '#86efac' : '#22c55e', color: '#fff', border: 'none',
                  padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 4px 6px rgba(34,197,94,0.2)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#16a34a'; }}
                onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.background = '#22c55e'; }}
              >
                
                {isSubmitting ? 'Menyimpan & Polling...' : 'Simpan & Poll SNMP'}
              </button>
            </div>

          </form>
        </Card>
      </div>
    </>
  );
}