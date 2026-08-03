"use client";
import React, { useEffect, useState } from "react";
import { Shield, Users, Plus, X } from "lucide-react";
import { rolesService, RoleSummary, ModuleInfo } from "@/services/roles";
import RequireModuleAccess from "@/components/guards/RequireModuleAccess";

const PRESETS: Record<
  string,
  { name: string; getPerms: (modules: ModuleInfo[]) => Record<string, any> }
> = {
  custom: {
    name: "Custom",
    getPerms: (modules) => {
      const perms: Record<string, any> = {};
      modules.forEach(
        (m) =>
          (perms[m.id] = {
            canCreate: false,
            canRead: false,
            canUpdate: false,
            canDelete: false,
          }),
      );
      return perms;
    },
  },
  hr_admin: {
    name: "HR Admin",
    getPerms: (modules) => {
      const perms: Record<string, any> = {};
      modules.forEach((m) => {
        if (m.id === "staff" || m.id === "roles") {
          perms[m.id] = {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true,
          };
        } else {
          perms[m.id] = {
            canCreate: false,
            canRead: false,
            canUpdate: false,
            canDelete: false,
          };
        }
      });
      return perms;
    },
  },
  department_head: {
    name: "Department Head",
    getPerms: (modules) => {
      const perms: Record<string, any> = {};
      modules.forEach((m) => {
        if (m.id === "profile" || m.id === "roles") {
          perms[m.id] = {
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          };
        } else {
          perms[m.id] = {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: false,
          };
        }
      });
      return perms;
    },
  },
  staff_reader: {
    name: "General Staff (Read Only)",
    getPerms: (modules) => {
      const perms: Record<string, any> = {};
      modules.forEach((m) => {
        perms[m.id] = {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        };
      });
      return perms;
    },
  },
};

function RolesPageContent() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [preset, setPreset] = useState("custom");
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rolesService
      .listRoles()
      .then(setRoles)
      .catch((err) => setError(err.message || "Failed to load roles"))
      .finally(() => setLoading(false));

    rolesService.listModules().then(setModules).catch(console.error);
  }, []);

  const totalStaffWithRoles = roles.reduce((sum, r) => sum + r.staffCount, 0);
  const systemDefaults = roles.filter((r) => r.isSystemDefault).length;

  const handleOpenModal = () => {
    setNewRoleName("");
    setPreset("custom");
    setPermissions(PRESETS.custom.getPerms(modules));
    setIsModalOpen(true);
  };

  const handlePresetChange = (p: string) => {
    setPreset(p);
    setPermissions(PRESETS[p].getPerms(modules));
  };

  const handlePermissionChange = (
    moduleId: string,
    action: string,
    value: boolean,
  ) => {
    setPreset("custom");
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [action]: value,
      },
    }));
  };

  const handleSaveRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true);

    const permsArray = Object.keys(permissions).map((moduleId) => ({
      module: moduleId,
      canCreate: permissions[moduleId].canCreate,
      canRead: permissions[moduleId].canRead,
      canUpdate: permissions[moduleId].canUpdate,
      canDelete: permissions[moduleId].canDelete,
    }));

    try {
      const newRole = await rolesService.createRole(newRoleName, permsArray);
      setRoles((prev) =>
        [...prev, newRole].sort((a, b) => a.roleName.localeCompare(b.roleName)),
      );
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-fade-in">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <h1 className="page-title">Role Manager</h1>
          <p className="page-subtitle">
            Configure roles and their module permissions.
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="primary-button"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={18} />
          Create Role
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "#ef4444",
            padding: "1rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Roles</div>
          <div className="stat-value">{roles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Staff Assigned to a Role</div>
          <div className="stat-value">{totalStaffWithRoles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Defaults</div>
          <div className="stat-value">{systemDefaults}</div>
        </div>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="card-title" style={{ marginBottom: "1.5rem" }}>
          Available Roles
        </h2>
        {loading ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-tertiary)",
            }}
          >
            Loading roles...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {roles.map((role) => (
              <div
                key={role.id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  backgroundColor: "var(--bg-primary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Shield size={20} color="var(--accent-primary)" />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {role.roleName.replace("_", " ")}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: role.isSystemDefault
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(139, 92, 246, 0.1)",
                      color: role.isSystemDefault
                        ? "var(--accent-primary)"
                        : "#8b5cf6",
                      fontWeight: 600,
                    }}
                  >
                    {role.isSystemDefault ? "System Default" : "Custom"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <Users size={16} />
                  <span>Assigned to {role.staffCount} staff</span>
                </div>

                <div
                  style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}
                >
                  {role.permissions.length} module
                  {role.permissions.length === 1 ? "" : "s"} granted
                </div>
              </div>
            ))}
            {roles.length === 0 && (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                }}
              >
                No roles found for this organization.
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: "2rem",
              borderRadius: "12px",
              width: "700px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                Create New Role
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Role Name
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Health Officer"
                className="form-input"
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Permission Preset
              </label>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="form-input"
              >
                {Object.entries(PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <h3
              style={{
                marginTop: "1.5rem",
                marginBottom: "1rem",
                fontSize: "1rem",
              }}
            >
              Module Access Configuration
            </h3>
            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                }}
              >
                <thead style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                      Module
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Create
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Read
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Update
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td
                        style={{
                          padding: "0.75rem 1rem",
                          textTransform: "capitalize",
                        }}
                      >
                        {m.label}
                      </td>
                      {(
                        [
                          "canCreate",
                          "canRead",
                          "canUpdate",
                          "canDelete",
                        ] as const
                      ).map((action) => (
                        <td
                          key={action}
                          style={{ padding: "0.75rem", textAlign: "center" }}
                        >
                          <input
                            type="checkbox"
                            checked={permissions[m.id]?.[action] || false}
                            onChange={(e) =>
                              handlePermissionChange(
                                m.id,
                                action,
                                e.target.checked,
                              )
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              accentColor: "var(--accent-primary)",
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "0.6rem 1.2rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={saving || !newRoleName.trim()}
                className="primary-button"
              >
                {saving ? "Saving..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequireModuleAccess moduleId="roles" action="read">
      <RolesPageContent />
    </RequireModuleAccess>
  );
}
