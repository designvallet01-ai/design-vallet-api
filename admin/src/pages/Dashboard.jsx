import React, { useEffect, useState } from 'react';
import supabase from '../config/supabase';

export default function Dashboard({ fetchWithAuth }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadStats() {
    try {
      const data = await fetchWithAuth('/admin/stats');
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();

    // Subscribe to realtime changes on orders & downloads tables
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[REALTIME UPDATE] Orders table change captured:', payload);
          loadStats();
        }
      )
      .subscribe();

    const downloadsChannel = supabase
      .channel('downloads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'downloads' },
        (payload) => {
          console.log('[REALTIME UPDATE] Downloads table insert captured:', payload);
          loadStats();
        }
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
      downloadsChannel.unsubscribe();
    };
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading Dashboard Metrics...</div>;
  if (error) return <div style={{ padding: '20px', color: 'var(--color-danger)' }}>Error loading stats: {error}</div>;

  const cardStyle = {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: '220px'
  };

  const statLabelStyle = {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const statValStyle = {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)'
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
      `}</style>

      {/* Page Title & Realtime Monitor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Real-time analytics and transaction reports.</p>
        </div>

        {/* Real-time Status Badge & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="glass-card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            border: '1px solid rgba(16, 185, 129, 0.2)',
            background: 'rgba(16, 185, 129, 0.05)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--color-success)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse 2s infinite ease-in-out'
            }} />
            <span style={{ color: 'var(--color-success)' }}>Real-time Sync Active</span>
          </div>

          <button 
            onClick={loadStats} 
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Revenue Target Goal Tracker */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.9rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>🏆 Sales Milestone Target</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
            ₹{(stats?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ₹10,000.00 ({Math.min(100, Math.round(((stats?.revenue || 0) / 10000) * 100))}% Achieved)
          </span>
        </div>
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <div style={{
            width: `${Math.min(100, ((stats?.revenue || 0) / 10000) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            borderRadius: '6px',
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Revenue Card */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Total Revenue</span>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
          </div>
          <span style={{ ...statValStyle, color: 'var(--accent-secondary)' }}>
            ₹{(stats?.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>+12% vs last month</span>
        </div>

        {/* Orders Card */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Images Purchased</span>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
          </div>
          <span style={statValStyle}>{stats?.orders || 0}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>100% individual downloads</span>
        </div>

        {/* Users Card */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Active Accounts</span>
            <span style={{ fontSize: '1.5rem' }}>👥</span>
          </div>
          <span style={statValStyle}>{stats?.users || 0}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Customer directory registrations</span>
        </div>

        {/* Downloads Card */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Total Downloads</span>
            <span style={{ fontSize: '1.5rem' }}>📥</span>
          </div>
          <span style={statValStyle}>{stats?.downloads || 0}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Successful original extracts</span>
        </div>
      </div>

      {/* Grid: Charts Simulation & Recent Sales */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Category Performance */}
        <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Gallery Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {stats?.categories?.map((cat, i) => {
              const maxVal = Math.max(...(stats.categories.map(c => c.count)), 1);
              const percentage = (cat.count / maxVal) * 100;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500 }}>{cat.category}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.count} images</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: i % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              );
            })}
            {(!stats?.categories || stats.categories.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No catalog categories found.</p>
            )}
          </div>
        </div>

        {/* Recent Purchases List */}
        <div className="glass-card" style={{ padding: '24px', flex: 2, minWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Recent Order Captures</h3>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentSales?.map((sale, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{sale.full_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.email}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                      ₹{parseFloat(sale.total_amount).toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(sale.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentSales || stats.recentSales.length === 0) && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No purchases recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
