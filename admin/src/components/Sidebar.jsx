import React from 'react';
import logo from '../logo.jpg';

export default function Sidebar({ activeTab, setActiveTab, onLogout, adminEmail }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'images', label: 'Image Catalog', icon: '🖼️' },
    { id: 'orders', label: 'Orders & Payments', icon: '💸' },
    { id: 'coupons', label: 'Discount Coupons', icon: '🎟️' },
    { id: 'users', label: 'User Directory', icon: '👥' },
  ];

  return (
    <aside className="glass-card" style={{
      width: '280px',
      height: 'calc(100vh - 40px)',
      position: 'sticky',
      top: '20px',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      gap: '30px'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={logo}
          alt="Pavan Kumar Silks Logo"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        />
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Handloom craft</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>ADMIN PORTAL</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 16px',
                background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Admin Profile Details */}
      <div style={{
        borderTop: '1px solid var(--glass-border)',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Developer Profile Details */}
        <div style={{
          padding: '12px',
          background: 'rgba(6, 182, 212, 0.05)',
          borderRadius: '8px',
          border: '1px dashed rgba(6, 182, 212, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', letterSpacing: '0.05em' }}>🛠️ DEVELOPER</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>G. Gowrinarayana</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Elite Web Kingdom</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UPI: 9985369590@fam</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Administrator</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{adminEmail}</span>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            color: '#f87171',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          🚪 Log Out
        </button>
      </div>
    </aside>
  );
}
