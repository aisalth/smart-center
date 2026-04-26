import React from 'react';

export default function Badge({ variant = 'warning', children, style, dot = false }) {
  const styles = {
    success: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
    warning: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    danger:  { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    critical: { bg: '#7f1d1d', color: '#fca5a5' },
    info:    { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  };

  const activeStyle = styles[variant] || styles.warning;

  return (
    <span 
      className={`badge badge-${variant}`} 
      style={{ 
        background: activeStyle.bg, 
        color: activeStyle.color, 
        minWidth: 60, 
        textAlign: 'center', 
        fontSize: 11, 
        padding: '3px 8px',
        borderRadius: 4,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: dot ? 6 : 0,
        ...style 
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeStyle.color }} />}
      {children}
    </span>
  );
}