import React, { useEffect, useState } from 'react';

export default function CouponManager({ fetchWithAuth, BACKEND_URL }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function loadCoupons() {
    try {
      const data = await fetchWithAuth('/admin/coupons');
      setCoupons(data);
    } catch (err) {
      alert('Failed to load coupons: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!code || !discountPercent || !expiresAt) {
      alert('Please fill out all fields.');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          discount_percent: discountPercent,
          expires_at: expiresAt
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon');

      alert(data.message);
      setCode('');
      setDiscountPercent('');
      setExpiresAt('');
      loadCoupons();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      loadCoupons();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon code? Customers will no longer be able to claim it.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${BACKEND_URL}/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete coupon');

      alert(data.message);
      loadCoupons();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Coupon Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage discount code campaigns for single-image transactions.</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Create Coupon Card */}
        <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '320px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>🎟️ Create Discount Coupon</h3>
          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Promo Code *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. FLASH50"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Discount Percentage *</label>
              <input
                type="number"
                min="1"
                max="100"
                className="input-field"
                placeholder="e.g. 15"
                value={discountPercent}
                onChange={e => setDiscountPercent(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Expiration Date *</label>
              <input
                type="datetime-local"
                className="input-field"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: '10px' }}
              disabled={creating}
            >
              {creating ? 'Saving...' : 'Generate Coupon'}
            </button>
          </form>
        </div>

        {/* Existing Coupons Catalog List */}
        <div className="glass-card" style={{ padding: '24px', flex: 2, minWidth: '450px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Active Promo Campaigns</h3>
          {loading ? (
            <div>Loading active coupon lists...</div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th>Expires At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((cpn) => {
                    const isExpired = new Date(cpn.expires_at) < new Date();
                    return (
                      <tr key={cpn.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{cpn.code}</td>
                        <td style={{ fontWeight: 600 }}>{cpn.discount_percent}% OFF</td>
                        <td>
                          {isExpired ? (
                            <span className="badge badge-danger">Expired</span>
                          ) : cpn.is_active ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-pending">Inactive</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(cpn.expires_at).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleActive(cpn.id, cpn.is_active)}
                              disabled={isExpired}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                opacity: isExpired ? 0.5 : 1
                              }}
                            >
                              Toggle
                            </button>
                            <button
                              onClick={() => handleDelete(cpn.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No coupons generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
