import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { KeyRound, ServerCog, ArrowRight } from 'lucide-react';

export default function SetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [pairingToken, setPairingToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.pair(pairingToken);
      // Backend restarts, we wait a bit before moving to step 2
      setTimeout(() => {
        setStep(2);
        setLoading(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pair device. Check token.');
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.onboard({ email, password });
      localStorage.setItem('access_token', res.data.result.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete setup.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="panel auth-card">
        <div className="text-center mb-4">
          <ServerCog size={48} color="var(--primary)" />
          <h2 className="mt-4">LGU System Initialization</h2>
          <p>Local Tenant Server Setup</p>
        </div>

        {error && (
          <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handlePair}>
            <div className="input-group">
              <label>6-Digit Pairing Token</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter the code sent to your email"
                value={pairingToken}
                onChange={(e) => setPairingToken(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Pairing Hardware...' : 'Pair Device'} <KeyRound size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOnboard}>
            <div className="input-group">
              <label>Admin Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="sysadmin@lgu.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Admin Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Configuring System...' : 'Complete Initialization'} <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
