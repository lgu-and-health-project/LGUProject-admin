"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRest } from "@/services/apiClient";
import { Users, Clock, CalendarCheck, MapPin } from "lucide-react";

export default function HrAdminPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");

  const { data: allAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["allAttendance"],
    queryFn: () => fetchRest("hris/attendance")
  });

  // Note: Needs GET /hris/leave-requests in API, using dummy for now since we haven't built the all leave requests endpoint
  const loadingLeave = false;
  const leaveRequests = [
    { id: 1, staff: { name: "Juan Dela Cruz", office: "Mayor's Office" }, type: "Vacation", startDate: "2026-08-10", endDate: "2026-08-15", status: "pending" }
  ];

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h1 className="page-title">HR Administration</h1>
        <p className="page-subtitle">Manage organization-wide attendance and personnel requests.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Staff</div>
          <div className="stat-value text-green">150</div>
          <div className="stat-trend neutral">Active employees</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Present Today</div>
          <div className="stat-value text-green">142</div>
          <div className="stat-trend positive">94% attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Leave Requests</div>
          <div className="stat-value" style={{color: "#f59e0b"}}>3</div>
          <div className="stat-trend neutral">Requires review</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600,
            color: activeTab === "attendance" ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "attendance" ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          Daily Attendance Logs
        </button>
        <button
          onClick={() => setActiveTab("leave")}
          style={{
            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600,
            color: activeTab === "leave" ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "leave" ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          Manage Leave Requests
        </button>
      </div>

      <div className="card">
        {activeTab === "attendance" && (
          <div>
            <h2 className="card-title">Recent Check-ins/Check-outs</h2>
            {loadingAttendance ? <p>Loading...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allAttendance.length === 0 ? <p className="text-secondary">No records found.</p> : allAttendance.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: log.type === 'check-in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: log.type === 'check-in' ? '#10b981' : '#ef4444' }}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{log.staff.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{log.staff.office}</div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.type.replace('-', ' ')}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "leave" && (
          <div>
            <h2 className="card-title">Pending Leave Requests</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0' }}>Staff Member</th>
                  <th>Type</th>
                  <th>Date Range</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ fontWeight: 600 }}>{req.staff.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{req.staff.office}</div>
                    </td>
                    <td>{req.type}</td>
                    <td>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Approve</button>
                        <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
