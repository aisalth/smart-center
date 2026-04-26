import React from 'react';

export default function Card({ title, subtitle, rightElement, delay = '0s', children, style = {} }) {
  return (
    <div 
      className="card animate-fade-up" 
      style={{ 
        background: '#fff', 
        borderRadius: 12, 
        border: '1px solid #e2e8f0', 
        padding: 20, 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', 
        animationDelay: delay, 
        ...style 
      }}
    >
      {(title || subtitle || rightElement) && (
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
          <div>
            {title && <div className="card-title" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>}
            {subtitle && <div className="card-subtitle" style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{subtitle}</div>}
          </div>
          {rightElement && <div>{rightElement}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}