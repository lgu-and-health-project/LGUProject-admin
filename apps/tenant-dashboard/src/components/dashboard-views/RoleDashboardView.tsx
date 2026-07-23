import React, { useState } from "react";
import { CurrentUser, ModulePermission } from "@/services/auth";
import { CheckCircle2, XCircle } from "lucide-react";

interface RoleDashboardViewProps {
  user: CurrentUser;
}

export default function RoleDashboardView({ user }: RoleDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"admin" | "lgu">("admin");

  // Separate permissions based on known module categories
  const adminModuleIds = ["profile", "staff", "roles"];
  const adminPermissions = user.permissions.filter((p) => adminModuleIds.includes(p.module));
  const lguPermissions = user.permissions.filter((p) => !adminModuleIds.includes(p.module));

  const renderPermissionsTable = (permissions: ModulePermission[]) => {
    if (permissions.length === 0) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
          You do not have access to any modules in this category.
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Module</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>Read</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>Create</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>Update</th>
              <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.module} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "1rem", fontWeight: 500, textTransform: "capitalize" }}>{p.module.replace("-", " ")}</td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  {p.read ? <CheckCircle2 size={18} color="#10b981" style={{ margin: "0 auto" }} /> : <XCircle size={18} color="#ef4444" style={{ margin: "0 auto" }} />}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  {p.create ? <CheckCircle2 size={18} color="#10b981" style={{ margin: "0 auto" }} /> : <XCircle size={18} color="#ef4444" style={{ margin: "0 auto" }} />}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  {p.update ? <CheckCircle2 size={18} color="#10b981" style={{ margin: "0 auto" }} /> : <XCircle size={18} color="#ef4444" style={{ margin: "0 auto" }} />}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  {p.delete ? <CheckCircle2 size={18} color="#10b981" style={{ margin: "0 auto" }} /> : <XCircle size={18} color="#ef4444" style={{ margin: "0 auto" }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const hasAdmin = adminPermissions.length > 0;
  const hasLgu = lguPermissions.length > 0;

  // Auto-switch tab if they don't have access to the current one
  React.useEffect(() => {
    if (activeTab === "admin" && !hasAdmin && hasLgu) setActiveTab("lgu");
    if (activeTab === "lgu" && !hasLgu && hasAdmin) setActiveTab("admin");
  }, [activeTab, hasAdmin, hasLgu]);

  return (
    <div className="page-fade-in">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Access Overview</h1>
        <p className="page-subtitle">View your assigned modules and CRUD permissions across the platform.</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Tabs Header */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
          {hasAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              style={{
                flex: 1,
                padding: "1rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: activeTab === "admin" ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: activeTab === "admin" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                transition: "all 0.2s ease"
              }}
            >
              Administration Modules
            </button>
          )}
          {hasLgu && (
            <button
              onClick={() => setActiveTab("lgu")}
              style={{
                flex: 1,
                padding: "1rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: activeTab === "lgu" ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: activeTab === "lgu" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                transition: "all 0.2s ease"
              }}
            >
              LGU Modules
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "admin" && hasAdmin ? renderPermissionsTable(adminPermissions) : null}
          {activeTab === "lgu" && hasLgu ? renderPermissionsTable(lguPermissions) : null}
        </div>
      </div>
    </div>
  );
}
