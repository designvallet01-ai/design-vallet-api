import React, { useEffect, useState } from 'react';

export default function UsersList({ fetchWithAuth }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await fetchWithAuth('/admin/users');
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>User Directory</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View details of registered customer accounts.</p>
      </div>

      {/* Table Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div>Loading Users List...</div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger)' }}>Error: {error}</div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Completed Orders</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>USR-{user.id}</td>
                    <td style={{ fontWeight: 600 }}>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td style={{ color: user.phone_number ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {user.phone_number || 'N/A'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <span className="badge badge-success" style={{ padding: '2px 8px' }}>
                        {user.completed_purchases} Purchases
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No customers registered.</td>
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
