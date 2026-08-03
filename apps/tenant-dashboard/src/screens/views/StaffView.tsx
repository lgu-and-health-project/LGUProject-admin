import { useEffect, useState } from 'react';
import { misoApi } from '../../services/api';
import { ShieldCheck, Ban } from 'lucide-react';

export default function StaffView() {
  const [staff, setStaff] = useState<any[]>([]);

  const fetchStaff = () => {
    misoApi.getStaff().then(res => setStaff(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleVerify = async (id: string) => {
    if (!confirm('Verify this staff member?')) return;
    try {
      await misoApi.verifyStaff(id);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error verifying');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspend this staff member?')) return;
    try {
      await misoApi.suspendStaff(id);
      fetchStaff();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error suspending');
    }
  };

  return (
    <div>
      <h1 className="mb-4">Staff Directory (MISO)</h1>
      <div className="panel">
        <p className="mb-4 text-secondary">Manage local government unit staff accounts. Only LGU Administrators can perform verification or suspension actions.</p>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && <tr><td colSpan={4} className="text-center">No staff records found.</td></tr>}
              {staff.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {s.id.substring(0,8)}...</div>
                  </td>
                  <td><span className="badge badge-info">{s.role}</span></td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'success' : 'danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex-start">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleVerify(s.id)}
                        disabled={s.status === 'active'}
                      >
                        <ShieldCheck size={14} style={{ marginRight: 4 }} /> Verify
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleSuspend(s.id)}
                        disabled={s.status === 'suspended'}
                      >
                        <Ban size={14} style={{ marginRight: 4 }} /> Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
