import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';

// ══ SNMP API IMPORT ══
import { createSnmpDevice, testSnmpConnection } from '../api/snmpApi';

export default function AddDevice() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    hostname: '',
    overwriteIp: '',
    snmpStatus: true,
    snmpVersion: 'v2c',
    port: '161',
    protocol: 'udp',
    portAssociation: 'ifIndex',
    community: '',
    pollerGroup: 'default'
  });

  // ══ SNMP STATE ══
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isTesting, setIsTesting]         = useState(false);
  const [testResult, setTestResult]       = useState(null); // { success, message }
  const [submitError, setSubmitError]     = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Reset test result kalau form berubah
    setTestResult(null);
  };

  // ══ TEST KONEKSI SNMP SEBELUM SAVE ══
  const handleTestConnection = async () => {
    if (!formData.hostname && !formData.overwriteIp) {
      setTestResult({ success: false, message: 'Masukkan hostname atau IP terlebih dahulu.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Buat device sementara untuk test (tanpa simpan ke DB)
      // Kita pakai endpoint test dengan membuat device dulu
      const createRes = await createSnmpDevice(formData);
      const deviceId  = createRes.data?.device_id;

      if (deviceId) {
        const testRes = await testSnmpConnection(deviceId);
        setTestResult(testRes);

        // Kalau test gagal, hapus device yang baru dibuat
        if (!testRes.success) {
          // Opsional: bisa langsung delete, tapi untuk simplicity biarkan dulu
        }
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Gagal melakukan test koneksi.' });
    } finally {
      setIsTesting(false);
    }
  };

  // ══ SUBMIT — SAVE DEVICE ══
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createSnmpDevice(formData);
      const deviceId = res.data?.device_id;

      alert(`Device ${formData.hostname} berhasil ditambahkan!`);
      navigate('/server');
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan device. Cek koneksi ke backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--card-border)',
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '13px',
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
    transition: 'border 0.2s'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textAlign: 'left',
    minWidth: '200px'
  };

  const rowStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px'
  };

  return (
    <>
      <Topbar title="Add Device" subtitle="Tambahkan perangkat baru untuk dimonitor" backButton={true} />
      
      <div className="page-content section-gap" style={{ maxWidth: '100%', paddingBottom: '50px' }}>
        
        <button 
          onClick={() => navigate('/server')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginBottom: '24px', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'translateX(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.transform = 'translateX(0)'; }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Kembali ke Server
        </button>

        <Card title="Device Configuration" style={{ padding: '30px' }}>
          
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '14px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '30px' }}>
            Devices will be checked for Ping/SNMP reachability before being probed.
          </div>

          {/* ══ ERROR BANNER ══ */}
          {submitError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              ⚠ {submitError}
            </div>
          )}

          {/* ══ TEST RESULT BANNER ══ */}
          {testResult && (
            <div style={{ background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: testResult.success ? '#22c55e' : '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              {testResult.success ? '✓' : '✗'} {testResult.message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ maxWidth: '100%' }}>
            
            {/* Hostname */}
            <div style={rowStyle}>
              <div style={labelStyle}>Hostname</div>
              <div style={{ flex: 1 }}>
                <input type="text" name="hostname" value={formData.hostname} onChange={handleChange} placeholder="IP Address atau FQDN (misal: 192.168.1.10)" style={inputStyle} required />
              </div>
            </div>

            {/* Overwrite IP */}
            <div style={rowStyle}>
              <div style={labelStyle}>Overwrite IP</div>
              <div style={{ flex: 1 }}>
                <input type="text" name="overwriteIp" value={formData.overwriteIp} onChange={handleChange} placeholder="Opsional" style={inputStyle} />
              </div>
            </div>

            {/* SNMP Toggle */}
            <div style={rowStyle}>
              <div style={labelStyle}>SNMP</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                  <input type="checkbox" name="snmpStatus" checked={formData.snmpStatus} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: formData.snmpStatus ? '#22c55e' : 'var(--text-muted)' }}>
                    {formData.snmpStatus ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            {/* SNMP Version, Port, Protocol */}
            <div style={rowStyle}>
              <div style={labelStyle}>SNMP Version</div>
              <div style={{ flex: 1, display: 'flex', gap: '16px', maxWidth: '600px' }}>
                <select name="snmpVersion" value={formData.snmpVersion} onChange={handleChange} style={{ ...inputStyle, flex: 2 }}>
                  <option value="v1">v1</option>
                  <option value="v2c">v2c</option>
                  <option value="v3">v3</option>
                </select>
                <input type="number" name="port" value={formData.port} onChange={handleChange} placeholder="Port" style={{ ...inputStyle, flex: 1 }} />
                <select name="protocol" value={formData.protocol} onChange={handleChange} style={{ ...inputStyle, flex: 1 }}>
                  <option value="udp">udp</option>
                  <option value="tcp">tcp</option>
                </select>
              </div>
            </div>

            {/* Port Association Mode */}
            <div style={rowStyle}>
              <div style={labelStyle}>Port Assoc. Mode</div>
              <div style={{ flex: 1 }}>
                <select name="portAssociation" value={formData.portAssociation} onChange={handleChange} style={{...inputStyle, maxWidth: '600px'}}>
                  <option value="ifIndex">ifIndex</option>
                  <option value="ifName">ifName</option>
                  <option value="ifDescr">ifDescr</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'var(--background)', padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '40px 0 24px', borderLeft: '4px solid #3b82f6' }}>
              SNMPv1/2c Configuration
            </div>

            {/* Community */}
            <div style={rowStyle}>
              <div style={labelStyle}>Community</div>
              <div style={{ flex: 1 }}>
                <input type="text" name="community" value={formData.community} onChange={handleChange} placeholder="public" style={inputStyle} />
              </div>
            </div>

            {/* Poller Group */}
            <div style={rowStyle}>
              <div style={labelStyle}>Poller Group</div>
              <div style={{ flex: 1 }}>
                <select name="pollerGroup" value={formData.pollerGroup} onChange={handleChange} style={{...inputStyle, maxWidth: '600px'}}>
                  <option value="default">Default poller group</option>
                  <option value="group1">Group 1</option>
                </select>
              </div>
            </div>

            {/* ══ ACTION BUTTONS ══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '50px', paddingTop: '24px', borderTop: '1px solid var(--card-border)' }}>
              
              {/* Test Connection Button */}
              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isTesting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isTesting ? 0.6 : 1, transition: 'all 0.2s' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 6l4.5 4.5L9 7"/><path d="M5.5 10.5A8.5 8.5 0 1 1 7 18"/>
                </svg>
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {/* Save Button */}
              <button 
                type="submit"
                disabled={isSubmitting}
                style={{ background: isSubmitting ? '#86efac' : '#22c55e', color: '#ffffff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(34, 197, 94, 0.2)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#16a34a'; }}
                onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#22c55e'; }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {isSubmitting ? 'Menyimpan...' : 'Save Device'}
              </button>
            </div>

          </form>
        </Card>
      </div>
    </>
  );
}