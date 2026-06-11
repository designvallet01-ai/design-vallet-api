import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ImageManager from './pages/ImageManager.jsx';
import OrderManager from './pages/OrderManager.jsx';
import CouponManager from './pages/CouponManager.jsx';
import UsersList from './pages/UsersList.jsx';

const BACKEND_URL = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Login Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Validate session token on startup
  useEffect(() => {
    if (token) {
      // Decode user representation from token for profile display
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setAdminUser({ email: payload.email });
      } catch (e) {
        handleLogout();
      }
    }
  }, [token]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate.');
      }

      if (!data.user.is_admin) {
        throw new Error('Access Denied. You do not possess administrator rights.');
      }

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setAdminUser({ email: data.user.email });
      setEmail('');
      setPassword('');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setAdminUser(null);
  };

  // Helper fetch wrapper injecting auth header
  const fetchWithAuth = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  };

  // Render Login state page if unauthorized
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="glass-card animate-fade-in" style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Admin Login</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Access the Handloom craft marketplace controls.</p>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="designvallet01@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loginLoading} style={{ marginTop: '10px' }}>
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render main panel
  return (
    <div style={{
      display: 'flex',
      gap: '30px',
      padding: '20px',
      minHeight: '100vh',
      maxWidth: '1600px',
      margin: '0 auto',
      alignItems: 'flex-start'
    }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        adminEmail={adminUser?.email || ''}
      />
      
      <main style={{ flexGrow: 1, padding: '10px 0' }}>
        {activeTab === 'dashboard' && <Dashboard fetchWithAuth={fetchWithAuth} />}
        {activeTab === 'images' && <ImageManager fetchWithAuth={fetchWithAuth} BACKEND_URL={BACKEND_URL} />}
        {activeTab === 'orders' && <OrderManager fetchWithAuth={fetchWithAuth} />}
        {activeTab === 'coupons' && <CouponManager fetchWithAuth={fetchWithAuth} BACKEND_URL={BACKEND_URL} />}
        {activeTab === 'users' && <UsersList fetchWithAuth={fetchWithAuth} />}
      </main>
    </div>
  );
}
