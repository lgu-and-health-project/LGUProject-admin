import { useState } from 'react';
import { Database, Download, Upload, Activity } from 'lucide-react';

export default function DatabaseManagerView() {
  const [loading, setLoading] = useState(false);

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div>
      <h1 className="mb-4">Database Management</h1>
      <p className="mb-4">Manage the local PostgreSQL and Redis instances for this node.</p>
      
      <div className="grid-cards">
        <div className="panel">
          <h2><Database size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Local DB Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="flex-between">
              <strong>PostgreSQL (Main)</strong>
              <span className="badge badge-success">Healthy</span>
            </div>
            <div className="flex-between">
              <strong>Redis (Cache)</strong>
              <span className="badge badge-success">Healthy</span>
            </div>
            <div className="flex-between">
              <strong>Disk Usage</strong>
              <span>12 GB / 500 GB</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2><Activity size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Backup & Restore</h2>
          <p className="mb-4">Create a manual snapshot or upload a snapshot to restore the database.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary flex-1" onClick={handleAction} disabled={loading}>
              <Download size={18} style={{ marginRight: 8 }} /> Backup Now
            </button>
            <button className="btn btn-secondary flex-1" onClick={handleAction} disabled={loading}>
              <Upload size={18} style={{ marginRight: 8 }} /> Restore DB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
