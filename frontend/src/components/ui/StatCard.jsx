import React from 'react';

export default function StatCard({ label, value, changeText, changeType = '', color, bg, delay = '0s', children }) {
  return (
    <div 
      className="stat-card animate-fade-up" 
      style={{ 
        background: '#fff', 
        borderRadius: 12, 
        border: '1px solid #e2e8f0', 
        padding: 20, 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
        '--stat-color': color, 
        '--stat-bg': bg, 
        animationDelay: delay 
      }}
    >
      <div className="stat-info">
        <div className="stat-label" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{label}</div>
        <div className="stat-value" style={{ fontSize: 26, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, color: color }}>
          {value}
          {children}
        </div>
        {changeText && (
          <div className={`stat-change ${changeType}`} style={{ color: changeType === 'down' ? '#ef4444' : (changeType === 'up' ? color : '#64748b'), marginTop: 8, fontWeight: changeType ? 600 : 400 }}>
            {changeText}
          </div>
        )}
      </div>
    </div>
  );
}