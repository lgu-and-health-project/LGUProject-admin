import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { KeyRound, ServerCog, ArrowRight } from 'lucide-react';

export default function SetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [pairingToken, setPairingToken] = useState<string[]>(Array(6).fill(''));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    const char = value
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-1)
    .toUpperCase();

    const updated = [...pairingToken];
    updated[index] = char;
    setPairingToken(updated);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !pairingToken[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);

    const updated = Array(6).fill('');

    pasted.split('').forEach((char, idx) => {
      updated[idx] = char;
    });

    setPairingToken(updated);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = pairingToken.join('');

      if (token.length !== 6) {
        setError('Please enter the complete 6-digit pairing token.');
        setLoading(false);
        return;
      }
      
      const res = await authApi.pair(token);
      if (!res._trpc?.success) {
        throw new Error('Pairing did not complete.');
      }
      // Backend restarts, we wait a bit before moving to step 2
      setTimeout(() => {
        setStep(2);
        setLoading(false);
      }, 3000);
    } catch (err: any) {
      setError(
      err.response?.data?.error?.message ||
      err.message ||
      'Failed to pair device. Check token.'
    );
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.onboard({ email, password });
      localStorage.setItem('access_token', res._trpc.access_token);
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
              <div className="pin-container" onPaste={handlePaste}>
                {pairingToken.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="pin-input"
                    required
                  />
                ))}
              </div>
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
