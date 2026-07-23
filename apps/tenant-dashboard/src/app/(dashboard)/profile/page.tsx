"use client";
import React, { useEffect, useState } from "react";
import { authService, CurrentUser } from "@/services/auth";

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    authService.getUser().then(setUser);
  }, []);

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h1 className="page-title">Organization Profile</h1>
        <p className="page-subtitle">View and manage your Local Government Unit details.</p>
      </div>

      <div className="card">
        <h2 className="card-title">Basic Information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className="form-group">
            <label>Organization Name</label>
            <input type="text" className="form-input" value="LGU Platform Services" disabled />
          </div>
          <div className="form-group">
            <label>Organization Code</label>
            <input type="text" className="form-input" value={user?.orgCode || ""} disabled />
          </div>
          <div className="form-group">
            <label>Email Domain</label>
            <input type="text" className="form-input" value="@lgu.gov.ph" disabled />
          </div>
          <div className="form-group">
            <label>Status</label>
            <input type="text" className="form-input" value="Active" disabled />
          </div>
        </div>
      </div>
    </div>
  );
}
