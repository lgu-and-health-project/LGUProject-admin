import { useState, useEffect } from 'react';
import { Cloud, Wifi, RefreshCw } from 'lucide-react';
import { misoApi } from '../../services/api';

export default function NetworkSyncView() {
  const [setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Mock fetch sync status
    misoApi.getSyncStatus().then(res => setSyncStatus(res.data)).catch(console.error);
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000); // mock delay
  };

  return (
    <div>
      <h1 className="mb-4">Network & Sync Queue</h1>
      <p className="mb-4">Monitor the connection state between this local node and the Central Cloud Server.</p>
      
      <div className="grid-cards mb-4">
        <div className="panel">
          <h2><Wifi size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Connection Status</h2>
          <div className="flex-between mt-4">
            <strong>Central Server Link</strong>
            <span className="badge badge-success flex-start" style={{ gap: '0.25rem' }}>
              <Cloud size={14} /> Connected
            </span>
          </div>
          <div className="flex-between mt-4">
            <strong style={{ color: 'var(--text-secondary)' }}>Latency</strong>
            <span>24ms</span>
          </div>
        </div>

        <div className="panel">
          <h2><RefreshCw size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Synchronization</h2>
          <div className="flex-between mt-4">
            <strong>Pending Records</strong>
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>142</span>
          </div>
          <div className="flex-between mt-4">
            <strong style={{ color: 'var(--text-secondary)' }}>Last Sync</strong>
            <span>5 minutes ago</span>
          </div>
          <button 
            className="btn btn-primary mt-4" 
            style={{ width: '100%' }} 
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> 
            {isSyncing ? 'Syncing...' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: '0' }}>
        <h2 style={{ padding: '1.5rem 1.5rem 0' }}>Sync Queue details</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem 1.5rem' }}>Entity</th>
              <th>Operation</th>
              <th>Status</th>
              <th>Retries</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '1rem 1.5rem' }}>User Profile (JD-001)</td>
              <td>UPDATE</td>
              <td><span className="badge badge-warning">Pending</span></td>
              <td>0</td>
            </tr>
            <tr>
              <td style={{ padding: '1rem 1.5rem' }}>Attendance Log</td>
              <td>INSERT</td>
              <td><span className="badge badge-danger">Failed</span></td>
              <td>3</td>
            </tr>
            <tr>
              <td style={{ padding: '1rem 1.5rem' }}>Payroll Record</td>
              <td>INSERT</td>
              <td><span className="badge badge-warning">Pending</span></td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
