import { useState } from 'react';
import { Shield, Key } from 'lucide-react';

export default function LicenseManagerView() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div>
      <h1 className="mb-4">License Management</h1>
      <p className="mb-4">Manage the LGU platform license and pairing status.</p>
      
      <div className="grid-cards">
        <div className="panel">
          <h2><Shield size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Current License</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="flex-between">
              <strong>Status</strong>
              <span className="badge badge-success">Active</span>
            </div>
            <div className="flex-between">
              <strong>Registration Key ID</strong>
              <span>XXXX-XXXX</span>
            </div>
            <div className="flex-between">
              <strong>Tenant ID</strong>
              <span>SYS-001</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2><Key size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Update Registration Key</h2>
          <p className="mb-4">If your license has expired or you need to re-pair the node, enter the new registration key here.</p>
          <div className="form-group mb-4">
            <label>New Registration Key</label>
            <input 
              type="text" 
              className="form-control" 
              value={key} 
              onChange={(e) => setKey(e.target.value)} 
              placeholder="Enter 32-character key"
            />
          </div>
          <button className="btn btn-primary" onClick={handleVerify} disabled={loading || !key}>
            {loading ? 'Verifying...' : 'Verify Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
