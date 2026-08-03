import { useEffect, useState } from 'react';
import { hrisApi } from '../../services/api';
import { Fingerprint, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function HomeView({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await hrisApi.getMyAttendance();
      setRecentLogs(res.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    setStatus('');
    try {
      // Dummy coords since web browser geoloc can be tricky to mock
      await hrisApi.clockIn(14.5995, 120.9842);
      setStatus('Successfully clocked in!');
      fetchLogs();
    } catch (err: any) {
      setStatus(err.response?.data?.message || 'Failed to clock in');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1>Welcome, {user?.email}</h1>
          <p>Local Government Unit Dashboard</p>
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
          <span className="stat-title">Pending Directives</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Network Sync</span>
          <span className="stat-value">Up to date</span>
        </div>
      </div>

      <div className="grid-cards">
        <div className="panel">
          <h2><Clock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Time & Attendance</h2>
          <p className="mb-4">Log your daily attendance. The system will verify your location against the LGU geofence.</p>
          
          {status && <div className={`badge ${status.includes('Success') ? 'badge-success' : 'badge-danger'} mb-4`} style={{ display: 'block' }}>{status}</div>}
          
          <button className="btn btn-primary" onClick={handleClockIn} disabled={loading} style={{ width: '100%', padding: '1rem' }}>
            <Fingerprint size={24} /> {loading ? 'Verifying Location...' : 'Tap to Clock In'}
          </button>
        </div>

        <div className="panel">
          <h2><Calendar size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Recent Logs</h2>
          {recentLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex-between" style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{log.status.toUpperCase()}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Lat: {log.latitude.toFixed(4)}, Lng: {log.longitude.toFixed(4)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.875rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4">No recent attendance records found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
