import { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldAlert } from 'lucide-react';
import { misoApi } from '../../services/api';

export default function AccountsView() {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, rolesRes] = await Promise.all([
        misoApi.getStaff(),
        misoApi.getRoles()
      ]);
      setStaff(staffRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (staffId: string, roleId: string) => {
    try {
      await misoApi.updateStaffRole(staffId, roleId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1>Account Management</h1>
          <p>Manage staff accounts, assign roles and offices internally.</p>
        </div>
        <button className="btn btn-primary flex-start" style={{ gap: '0.5rem' }}>
          <UserPlus size={16} /> Add Account
        </button>
      </div>
      
      <div className="panel">
        <h2 className="mb-4"><Users size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Staff Directory</h2>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--panel-border)' }}>
              <th style={{ padding: '0.75rem 0' }}>Name / Email</th>
              <th>Office</th>
              <th>Position</th>
              <th>System Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                <td style={{ padding: '0.75rem 0' }}>
                  <div style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                </td>
                <td>{s.office}</td>
                <td>{s.positionTitle}</td>
                <td>
                  <select 
                    value={s.roleId || ''} 
                    onChange={(e) => handleRoleChange(s.id, e.target.value)}
                    className="form-control"
                    style={{ padding: '0.25rem', width: 'auto' }}
                  >
                    <option value="">No Role</option>
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.roleName}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No staff members found. Add an account to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
