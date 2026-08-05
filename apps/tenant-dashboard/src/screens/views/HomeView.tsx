import { useEffect, useState } from 'react';
import { CheckCircle, Server, Activity, ShieldCheck } from 'lucide-react';

export default function HomeView({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1>Welcome, {user?.email}</h1>
          <p>Local Government Unit - MISO Dashboard</p>
        </div>
        <div className="badge badge-success flex-start" style={{ gap: '0.5rem' }}>
          <CheckCircle size={14} /> Server Online
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-title">System Status</span>
          <span className="stat-value text-success">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Pending Configurations</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Network Sync</span>
          <span className="stat-value">Up to date</span>
        </div>
      </div>

      <div className="grid-cards">
        <div className="panel">
          <h2><Server size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Server Health</h2>
          <p className="mb-4">The local LGU server node is running normally. CPU and memory usage are within acceptable limits.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Uptime</strong>
              <span style={{ fontSize: '0.875rem' }}>99.9%</span>
            </div>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Last Backup</strong>
              <span style={{ fontSize: '0.875rem' }}>Today, 02:00 AM</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2><ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Licensing & Security</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Node Registration</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Verified with Central Server
                </div>
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Valid</span>
            </div>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Active Domain</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Current domain binding
                </div>
              </div>
              <span style={{ fontSize: '0.875rem' }}>lgu-local.app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
