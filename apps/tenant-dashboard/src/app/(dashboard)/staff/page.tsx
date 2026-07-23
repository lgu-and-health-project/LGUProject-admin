"use client";
import React, { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Edit2, Shield, Trash2, Mail } from "lucide-react";
import { authService, CurrentUser } from "@/services/auth";

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  office: string | null;
  baseRole: string | null;
  status: string;
}

export default function StaffDirectoryPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    office: "",
    baseRole: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchStaff = async () => {
    try {
      const response = await fetch("http://localhost:4001/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authService.getAuthHeaders() },
        body: JSON.stringify({
          query: `
            query {
              staffMembers {
                id
                name
                email
                office
                baseRole
                status
              }
            }
          `
        })
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);
      setStaffList(result.data.staffMembers);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    authService.getUser().then(setUser);
    fetchStaff();
  }, []);

  const handleAddStaff = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:4001/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authService.getAuthHeaders() },
        body: JSON.stringify({
          query: `
            mutation AddStaff($input: AddStaffInput!) {
              addStaff(input: $input) {
                id
                name
                email
                office
                baseRole
                status
              }
            }
          `,
          variables: { input: formData }
        })
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);
      
      setSuccess("Staff account created successfully.");
      setStaffList(prev => [result.data.addStaff, ...prev]);
      setShowAddModal(false);
      setFormData({ name: "", email: "", office: "", baseRole: "" });
    } catch (err: any) {
      setError(err.message || "Failed to add staff");
    } finally {
      setSubmitting(false);
    }
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({
    baseRole: "",
  });

  const handleEditRole = async () => {
    if (!selectedStaff) return;
    setSubmitting(true);
    // In a real implementation, you would call a GraphQL mutation to update the user's role.
    // For now we'll just update local state to reflect the UI change immediately.
    setTimeout(() => {
      setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, baseRole: editRoleForm.baseRole } : s));
      setSubmitting(false);
      setShowEditModal(false);
      setSuccess("Role updated successfully.");
    }, 500);
  };

  const openEditModal = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setEditRoleForm({ baseRole: staff.baseRole || "" });
    setShowEditModal(true);
  };

  const filteredStaff = staffList.filter(s => 
    (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.office?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="page-fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">Staff Directory</h1>
          <p className="page-subtitle">Manage LGU personnel, accounts, and role assignments.</p>
        </div>
        {user?.role === 'sysadmin' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} style={{ marginRight: "8px" }} />
            Add Staff Account
          </button>
        )}
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", alignItems: "center" }}>
          <div className="topbar-search">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by name, email, or office..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "350px", backgroundColor: "var(--bg-tertiary)" }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <span>Total Staff: <strong>{staffList.length}</strong></span>
          </div>
        </div>
        
        {success && <div style={{ color: "#16a34a", padding: "1rem", backgroundColor: "rgba(34, 197, 94, 0.1)", borderRadius: "8px", marginBottom: "1rem" }}>{success}</div>}

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>Loading staff...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Name & Email</th>
                  <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Office</th>
                  <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Assigned Role</th>
                  <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background-color 0.2s" }} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{staff.name || "Unnamed Staff"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>{staff.email}</div>
                    </td>
                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{staff.office || "-"}</td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        backgroundColor: "rgba(29, 78, 216, 0.1)", 
                        color: "var(--accent-primary)",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <Shield size={12} />
                        {staff.baseRole || "Viewer"}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "12px", 
                        backgroundColor: staff.status === "active" ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                        color: staff.status === "active" ? "#16a34a" : "#d97706",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textTransform: "capitalize"
                      }}>
                        {staff.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <button className="icon-button" title="Edit Role" onClick={() => openEditModal(staff)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-button" title="Resend Invite">
                        <Mail size={16} />
                      </button>
                      <button className="icon-button" style={{ color: "#ef4444" }} title="Remove Staff">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
                      No staff members found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {showEditModal && selectedStaff && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", margin: "1rem", animation: "fadeIn 0.2s" }}>
            <h2 className="card-title">Appoint Role</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Update role assignment for <strong>{selectedStaff.email}</strong>
            </p>
            
            <div className="form-group">
              <label>Role Assignment</label>
              <select 
                className="form-input"
                value={editRoleForm.baseRole}
                onChange={e => setEditRoleForm({...editRoleForm, baseRole: e.target.value})}
              >
                <option value="">Select a role...</option>
                <option value="sysadmin">System Administrator</option>
                <option value="office_head">Office Head</option>
                <option value="encoder">Encoder</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
              <button 
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
                style={{ padding: "0.5rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleEditRole}
                disabled={submitting || !editRoleForm.baseRole}
                className="btn btn-primary"
              >
                {submitting ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem", animation: "fadeIn 0.2s" }}>
            <h2 className="card-title">Add New Staff Account</h2>
            
            {error && <div style={{ color: "red", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}
            
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Juan Dela Cruz" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Official Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="e.g. juan@mabini.gov.ph" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Assign to Office/Department</label>
              <select 
                className="form-input"
                value={formData.office}
                onChange={e => setFormData({...formData, office: e.target.value})}
              >
                <option value="">Select an office...</option>
                <option value="MISO">MISO (IT/Sysadmin)</option>
                <option value="HRMO">HRMO (Human Resources)</option>
                <option value="MTO">MTO (Treasury)</option>
                <option value="MBO">MBO (Budgeting)</option>
                <option value="Mayor">Mayor's Office</option>
              </select>
            </div>

            <div className="form-group">
              <label>Initial Role Assignment</label>
              <select 
                className="form-input"
                value={formData.baseRole}
                onChange={e => setFormData({...formData, baseRole: e.target.value})}
              >
                <option value="">Select a role...</option>
                <option value="sysadmin">System Administrator</option>
                <option value="office_head">Office Head</option>
                <option value="encoder">Encoder</option>
                <option value="viewer">Viewer</option>
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                You can change specific module permissions later.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
              <button 
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                style={{ padding: "0.5rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddStaff}
                disabled={submitting || !formData.email || !formData.baseRole}
                className="btn btn-primary"
              >
                {submitting ? "Adding..." : "Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
