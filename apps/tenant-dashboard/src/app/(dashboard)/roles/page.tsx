"use client";
import React, { useState } from "react";
import { Plus, Shield, CheckCircle2, Users } from "lucide-react";

export default function RolesPage() {
  const [roles] = useState([
    { id: "sysadmin", name: "System Administrator", users: 1, type: "System Default" },
    { id: "mayor", name: "Mayor", users: 1, type: "System Default" },
    { id: "office_head", name: "Office Head", users: 8, type: "Custom" },
    { id: "encoder", name: "Encoder", users: 15, type: "Custom" },
    { id: "viewer", name: "Viewer", users: 4, type: "Custom" },
  ]);

  return (
    <div className="page-fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">Role Manager</h1>
          <p className="page-subtitle">Configure roles and map them to module permissions.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} style={{ marginRight: "8px" }} />
          Create Custom Role
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Roles</div>
          <div className="stat-value">{roles.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users with Roles</div>
          <div className="stat-value">29</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Defaults</div>
          <div className="stat-value">2</div>
        </div>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 className="card-title" style={{ marginBottom: "1.5rem" }}>Available Roles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {roles.map(role => (
            <div key={role.id} style={{ 
              border: "1px solid var(--border-color)", 
              borderRadius: "12px", 
              padding: "1.5rem",
              backgroundColor: "var(--bg-primary)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={20} color="var(--accent-primary)" />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{role.name}</h3>
                </div>
                <span style={{ 
                  fontSize: "0.75rem", 
                  padding: "2px 8px", 
                  borderRadius: "12px",
                  backgroundColor: role.type === "System Default" ? "rgba(59, 130, 246, 0.1)" : "rgba(139, 92, 246, 0.1)",
                  color: role.type === "System Default" ? "var(--accent-primary)" : "#8b5cf6",
                  fontWeight: 600
                }}>
                  {role.type}
                </span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                <Users size={16} />
                <span>Assigned to {role.users} staff</span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" style={{ flex: 1, border: "1px solid var(--border-color)", backgroundColor: "transparent" }}>
                  View Permissions
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
