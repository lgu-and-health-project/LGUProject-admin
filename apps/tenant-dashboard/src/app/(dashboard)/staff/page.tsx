"use client";
import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Shield, Trash2, Mail } from "lucide-react";
import { fetchGraphQL } from "@/services/apiClient";
import { authService, CurrentUser } from "@/services/auth";
import { rolesService, RoleSummary } from "@/services/roles";
import { LGU_OFFICES } from "@/lib/config/offices";
import RequireModuleAccess from "@/components/guards/RequireModuleAccess";

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  office: string | null;
  baseRole: string | null;
  roleId: string | null;
  status: string;
}

function StaffDirectoryContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [formData, setFormData] = useState({ name: "", email: "", office: "", roleId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchStaff = async () => {
    try {
      const data = await fetchGraphQL<{ staffMembers: StaffUser[] }>(`
        query {
          staffMembers {
            id
            name
            email
            office
            baseRole
            roleId
            status
          }
        }
      `);
      setStaffList(data.staffMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    authService.getUser().then(setUser);
    fetchStaff();
    rolesService.listRoles().then(setRoles).catch((err) => console.error(err));
  }, []);

  const roleName = (roleId: string | null) => roles.find((r) => r.id === roleId)?.roleName ?? "Unassigned";

  const handleAddStaff = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const data = await fetchGraphQL<{ addStaff: StaffUser }>(
        `
          mutation AddStaff($input: AddStaffInput!) {
            addStaff(input: $input) {
              id
              name
              email
              office
              baseRole
              roleId
              status
            }
          }
        `,
        { input: formData },
      );

      setSuccess("Staff account created successfully.");
      setStaffList((prev) => [data.addStaff, ...prev]);
      setShowAddModal(false);
      setFormData({ name: "", email: "", office: "", roleId: "" });
    } catch (err: any) {
      setError(err.message || "Failed to add staff");
    } finally {
      setSubmitting(false);
    }
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [editRoleId, setEditRoleId] = useState("");

  const handleEditRole = async () => {
    if (!selectedStaff || !editRoleId) return;
    setSubmitting(true);
    setError("");
    try {
      await rolesService.assignRole(selectedStaff.id, editRoleId);
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id ? { ...s, roleId: editRoleId, baseRole: roleName(editRoleId) } : s,
        ),
      );
      setShowEditModal(false);
      setSuccess("Role updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setEditRoleId(staff.roleId || "");
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
                  <tr key={staff.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background-color 0.2s" }}>
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
                        gap: "4px",
                        textTransform: "capitalize",
                      }}>
                        <Shield size={12} />
                        {(staff.baseRole || "unassigned").replace("_", " ")}
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
                      No staff members found matching &quot;{searchTerm}&quot;
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

            {error && <div style={{ color: "red", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}

            <div className="form-group">
              <label>Role Assignment</label>
              <select
                className="form-input"
                value={editRoleId}
                onChange={e => setEditRoleId(e.target.value)}
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} style={{ textTransform: "capitalize" }}>
                    {r.roleName.replace("_", " ")}
                  </option>
                ))}
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
                disabled={submitting || !editRoleId}
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
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Official Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. juan@mabini.gov.ph"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Assign to Office/Department</label>
              <select
                className="form-input"
                value={formData.office}
                onChange={e => setFormData({ ...formData, office: e.target.value })}
              >
                <option value="">Select an office...</option>
                {LGU_OFFICES.map((office) => (
                  <option key={office} value={office}>{office}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Initial Role Assignment</label>
              <select
                className="form-input"
                value={formData.roleId}
                onChange={e => setFormData({ ...formData, roleId: e.target.value })}
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} style={{ textTransform: "capitalize" }}>
                    {r.roleName.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "4px" }}>
                Roles and their module permissions are managed in Role Manager.
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
                disabled={submitting || !formData.email || !formData.roleId}
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

export default function StaffDirectoryPage() {
  return (
    <RequireModuleAccess moduleId="staff" action="read">
      <StaffDirectoryContent />
    </RequireModuleAccess>
  );
}
