"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRest } from "@/services/apiClient";
import { CheckCircle, XCircle, ShieldAlert, Users, Settings } from "lucide-react";
import RequireModuleAccess from "@/components/guards/RequireModuleAccess";

function MisoPageContent() {
  const [activeTab, setActiveTab] = useState<"verify" | "rbac">("verify");
  const queryClient = useQueryClient();

  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["misoStaff"],
    queryFn: () => fetchRest("miso/staff")
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["misoRoles"],
    queryFn: () => fetchRest("miso/roles")
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => fetchRest(`miso/staff/${id}/verify`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["misoStaff"] })
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => fetchRest(`miso/staff/${id}/suspend`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["misoStaff"] })
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string, roleId: string }) => 
      fetchRest(`miso/staff/${id}/role`, { method: "PUT", body: JSON.stringify({ roleId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["misoStaff"] })
  });

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h1 className="page-title">MISO Dashboard</h1>
        <p className="page-subtitle">Manage Account Verifications & RBAC Allocations</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab("verify")}
          style={{
            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600,
            color: activeTab === "verify" ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "verify" ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          Verify Accounts
        </button>
        <button
          onClick={() => setActiveTab("rbac")}
          style={{
            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600,
            color: activeTab === "rbac" ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "rbac" ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          RBAC Allocation
        </button>
      </div>

      <div className="card">
        {activeTab === "verify" && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              <ShieldAlert size={20} />
              <h2 className="card-title" style={{ margin: 0 }}>Account Verification</h2>
            </div>
            
            {loadingStaff ? <p>Loading...</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0' }}>Staff Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((staff: any) => (
                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 500 }}>{staff.name || 'N/A'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{staff.email}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                          backgroundColor: staff.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : staff.status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: staff.status === 'active' ? '#10b981' : staff.status === 'suspended' ? '#ef4444' : '#f59e0b'
                        }}>
                          {staff.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', gap: '4px', alignItems: 'center' }}
                            onClick={() => verifyMutation.mutate(staff.id)}
                            disabled={staff.status === 'active'}
                          >
                            <CheckCircle size={14} /> Verify
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', gap: '4px', alignItems: 'center' }}
                            onClick={() => suspendMutation.mutate(staff.id)}
                            disabled={staff.status === 'suspended'}
                          >
                            <XCircle size={14} /> Suspend
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "rbac" && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              <Settings size={20} />
              <h2 className="card-title" style={{ margin: 0 }}>Role Allocations</h2>
            </div>

            {loadingStaff || loadingRoles ? <p>Loading...</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0' }}>Staff Member</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Assign New Role</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.filter((s: any) => s.status === 'active').map((staff: any) => (
                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 500 }}>{staff.name || 'N/A'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{staff.email}</td>
                      <td>
                        <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
                          {staff.role ? staff.role.roleName.replace('_', ' ') : 'No Role'}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="form-input" 
                          style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          value={staff.roleId || ''}
                          onChange={(e) => updateRoleMutation.mutate({ id: staff.id, roleId: e.target.value })}
                        >
                          <option value="" disabled>Select Role...</option>
                          {roles.map((role: any) => (
                            <option key={role.id} value={role.id}>{role.roleName.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MisoPage() {
  // Requires 'roles' module permission since MISO deals with RBAC
  return (
    <RequireModuleAccess moduleId="roles" action="read">
      <MisoPageContent />
    </RequireModuleAccess>
  );
}
