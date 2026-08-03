import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { LogIn, Landmark } from 'lucide-react';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      localStorage.setItem('access_token', res.data.result.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="panel auth-card">
        <div className="text-center mb-4">
          <Landmark size={48} color="var(--primary)" />
          <h2 className="mt-4">Welcome Back</h2>
          <p>Login to the LGU HRIS Network</p>
        </div>

        {error && (
          <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="name@lgu.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'} <LogIn size={18} />
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/setup" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            First time setting up this server? Initialize here.
          </Link>
        </div>
      </div>
    </div>
  );
}
