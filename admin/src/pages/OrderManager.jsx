import React, { useEffect, useState } from 'react';

export default function OrderManager({ fetchWithAuth }) {
  const [orders, setOrders] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('orders'); // 'orders' or 'downloads'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleApprove = async (orderId) => {
    if (!window.confirm(`Are you sure you want to approve Order ORD-${orderId}?`)) return;
    try {
      await fetchWithAuth(`/admin/orders/${orderId}/approve`, { method: 'POST' });
      // Refresh the orders list
      const orderData = await fetchWithAuth('/admin/orders');
      setOrders(orderData);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm(`Are you sure you want to reject Order ORD-${orderId}?`)) return;
    try {
      await fetchWithAuth(`/admin/orders/${orderId}/reject`, { method: 'POST' });
      // Refresh the orders list
      const orderData = await fetchWithAuth('/admin/orders');
      setOrders(orderData);
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (activeSubTab === 'orders') {
          const orderData = await fetchWithAuth('/admin/orders');
          setOrders(orderData);
        } else {
          const downloadData = await fetchWithAuth('/admin/downloads');
          setDownloads(downloadData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeSubTab]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Orders & Downloads</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track payments logs and customer download logs.</p>
        </div>

        {/* Sub-tab Toggles */}
        <div className="glass-card" style={{ display: 'flex', padding: '4px', gap: '4px' }}>
          <button
            onClick={() => setActiveSubTab('orders')}
            style={{
              padding: '8px 16px',
              background: activeSubTab === 'orders' ? 'var(--accent-primary)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            💳 Transaction Orders
          </button>
          <button
            onClick={() => setActiveSubTab('downloads')}
            style={{
              padding: '8px 16px',
              background: activeSubTab === 'downloads' ? 'var(--accent-primary)' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            📥 Download Audits
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div>Loading Audit Logs...</div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger)' }}>Error: {error}</div>
        ) : activeSubTab === 'orders' ? (
          /* Transaction Orders Table */
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th>UPI / Reference Details</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: 600 }}>ORD-{ord.id}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{ord.full_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ord.email}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{parseFloat(ord.total_amount).toFixed(2)}</td>
                    <td style={{ color: parseFloat(ord.discount_amount) > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      ₹{parseFloat(ord.discount_amount).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge badge-${ord.payment_status}`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Ref ID: {ord.razorpay_order_id}</span>
                        {ord.razorpay_payment_id && <span>UTR (UPI): {ord.razorpay_payment_id}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(ord.created_at).toLocaleString()}
                    </td>
                    <td>
                      {ord.payment_status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApprove(ord.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981', // emerald green
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(ord.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444', // red
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No transaction records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Downloads Table */
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Customer Email</th>
                  <th>Image Title</th>
                  <th>Category</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((dl) => (
                  <tr key={dl.id}>
                    <td>DL-{dl.id}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{dl.full_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dl.email}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{dl.title}</td>
                    <td><span style={{ color: 'var(--accent-secondary)' }}>{dl.category}</span></td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{dl.ip_address}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(dl.downloaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {downloads.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No downloads recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
