import { useState } from 'react';
import { Server, Globe, RefreshCw } from 'lucide-react';

export default function ServerSettingsView() {
  const [domain, setDomain] = useState('lgu-local.app');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div>
      <h1 className="mb-4">Server Settings</h1>
      <p className="mb-4">Configure your local tenant server identity and domains.</p>
      
      <div className="grid-cards">
        <div className="panel">
          <h2><Server size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Server Initialization</h2>
          <p className="mb-4">Reset or re-initialize the core server services. This will restart the container stack.</p>
          <button className="btn btn-secondary">
            <RefreshCw size={16} style={{ marginRight: 8 }} /> Re-initialize Server
          </button>
        </div>

        <div className="panel">
          <h2><Globe size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Domain Configuration</h2>
          <p className="mb-4">Set a custom domain for local access.</p>
          <div className="form-group mb-4">
            <label>Internal Domain Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={domain} 
              onChange={(e) => setDomain(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
