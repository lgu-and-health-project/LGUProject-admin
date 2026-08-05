import { useState, useEffect } from 'react';
import { Activity, Search, Filter } from 'lucide-react';
import { misoApi } from '../../services/api';

export default function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Mocking an API call to get audit logs efficiently
    misoApi.getAuditLogs().then(res => setLogs(res.data || [])).catch(console.error);
  }, []);

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1>Audit & Activity Logs</h1>
          <p>Trace administrative actions and system events.</p>
        </div>
        <div className="flex-start" style={{ gap: '1rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div className="flex-start" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-secondary)' }} />
              <input type="text" className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder="Search logs..." />
            </div>
          </div>
          <button className="btn btn-secondary"><Filter size={16} /> Filter</button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem' }}>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target / Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: '1rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td><span className="badge badge-info">{log.action}</span></td>
                  <td>{log.actorEmail}</td>
                  <td>{log.details}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading logs or no logs available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
