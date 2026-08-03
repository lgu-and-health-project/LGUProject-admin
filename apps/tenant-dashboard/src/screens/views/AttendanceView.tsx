import React, { useEffect, useState } from 'react';
import { hrisApi } from '../../services/api';
import { FileText, Send } from 'lucide-react';

export default function AttendanceView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  
  const [type, setType] = useState('SICK');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hrisApi.getMyAttendance().then(res => setLogs(res.data)).catch(console.error);
    hrisApi.getMyLeaveRequests().then(res => setLeaves(res.data)).catch(console.error);
  }, []);

  const handleFileLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await hrisApi.createLeaveRequest({ type, startDate, endDate, reason });
      hrisApi.getMyLeaveRequests().then(res => setLeaves(res.data));
      setStartDate(''); setEndDate(''); setReason('');
      alert('Leave request filed successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to file leave');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="mb-4">My Attendance & Leaves</h1>
      
      <div className="grid-cards" style={{ alignItems: 'start' }}>
        <div className="panel">
          <h2><FileText size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> File New Leave / OT</h2>
          <form onSubmit={handleFileLeave}>
            <div className="input-group">
              <label>Request Type</label>
              <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
                <option value="SICK">Sick Leave</option>
                <option value="VACATION">Vacation Leave</option>
                <option value="OT">Overtime</option>
                <option value="FIELD">Field Work</option>
              </select>
            </div>
            <div className="input-group">
              <label>Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>End Date</label>
              <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Reason</label>
              <textarea className="input-field" rows={3} value={reason} onChange={e => setReason(e.target.value)} required></textarea>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              <Send size={18} /> {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel">
            <h2>My Requests</h2>
            <div className="table-container mt-4">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 && <tr><td colSpan={3} className="text-center">No requests found.</td></tr>}
                  {leaves.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.type}</td>
                      <td>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'danger'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="panel">
            <h2>Full Attendance History</h2>
            <div className="table-container mt-4">
              <table>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Type</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && <tr><td colSpan={3} className="text-center">No logs found.</td></tr>}
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td>{new Date(l.timestamp).toLocaleString()}</td>
                      <td><span className="badge badge-info">{l.status}</span></td>
                      <td>{l.latitude.toFixed(2)}, {l.longitude.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
