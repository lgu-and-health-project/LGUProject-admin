"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRest } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { Calendar, DollarSign, Plus, X, Clock, MapPin } from "lucide-react";

export default function MyHrPage() {
  const [activeTab, setActiveTab] = useState<"leave" | "payroll" | "attendance">("attendance");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: "Vacation", startDate: "", endDate: "", reason: "" });
  
  const queryClient = useQueryClient();

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["myAttendance"],
    queryFn: () => fetchRest("hris/attendance/me")
  });

  const { data: leaveRequests = [], isLoading: loadingLeave } = useQuery({
    queryKey: ["myLeaveRequests"],
    queryFn: () => fetchRest("hris/leave-requests/me")
  });

  const { data: payroll = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["myPayroll"],
    queryFn: () => fetchRest("hris/payroll/me")
  });

  const leaveMutation = useMutation({
    mutationFn: (data: typeof leaveForm) => {
      return fetchRest("hris/leave-requests", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeaveRequests"] });
      setIsLeaveModalOpen(false);
      setLeaveForm({ type: "Vacation", startDate: "", endDate: "", reason: "" });
    }
  });

  const checkInMutation = useMutation({
    mutationFn: () => {
      return fetchRest("hris/attendance", {
        method: "POST",
        body: JSON.stringify({ type: "check-in", latitude: 14.5995, longitude: 120.9842 })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myAttendance"] })
  });

  const checkOutMutation = useMutation({
    mutationFn: () => {
      return fetchRest("hris/attendance", {
        method: "POST",
        body: JSON.stringify({ type: "check-out", latitude: 14.5995, longitude: 120.9842 })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myAttendance"] })
  });

  return (
    <div className="page-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">My HR Records</h1>
          <p className="page-subtitle">Manage your attendance, leave requests, and view payslips.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            style={{ backgroundColor: '#10b981', color: 'white' }}
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? 'Processing...' : 'Time In'}
          </button>
          <button 
            className="btn" 
            style={{ backgroundColor: '#ef4444', color: 'white' }}
            onClick={() => checkOutMutation.mutate()}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending ? 'Processing...' : 'Time Out'}
          </button>
        </div>
      </div>

      {/* Tabs */}
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
          Attendance Log
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
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          style={{
            background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600,
            color: activeTab === "payroll" ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === "payroll" ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px'
          }}
        >
          My Payslips
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === "attendance" && (
          <div>
            <h2 className="card-title">Recent Attendance</h2>
            {loadingAttendance ? <p>Loading...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {attendance.length === 0 ? <p className="text-secondary">No records found.</p> : attendance.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: log.type === 'check-in' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: log.type === 'check-in' ? '#10b981' : '#ef4444' }}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.type.replace('-', ' ')}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    {log.latitude && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        <MapPin size={14} /> Location Logged
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "leave" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Leave History</h2>
              <button className="btn btn-primary" onClick={() => setIsLeaveModalOpen(true)}>
                <Plus size={18} style={{ marginRight: '8px' }} /> Request Leave
              </button>
            </div>
            {loadingLeave ? <p>Loading...</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0' }}>Type</th>
                    <th>Date Range</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>No leave requests found.</td></tr>
                  ) : leaveRequests.map((req: any) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 500 }}>{req.type}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                          backgroundColor: req.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b'
                        }}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "payroll" && (
          <div>
            <h2 className="card-title">Payslips</h2>
            {loadingPayroll ? <p>Loading...</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {payroll.length === 0 ? <p className="text-secondary">No payslips found.</p> : payroll.map((pay: any) => (
                  <div key={pay.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)' }}>
                        <Calendar size={16} /> 
                        {new Date(pay.periodStart).toLocaleDateString()} - {new Date(pay.periodEnd).toLocaleDateString()}
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        {pay.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      ₱{pay.netAmount.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <span>Gross: ₱{pay.grossAmount.toLocaleString()}</span>
                      <span>Deductions: ₱{pay.deductions.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isLeaveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{margin: 0, fontSize: '1.25rem'}}>Request Formal Leave</h2>
              <button onClick={() => setIsLeaveModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label>Leave Type</label>
              <select className="form-input" value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}>
                <option value="Vacation">Vacation Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="FieldWork">Field Work</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-input" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" className="form-input" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
              </div>
            </div>

            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Reason</label>
              <textarea className="form-input" rows={3} value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
              <button onClick={() => setIsLeaveModalOpen(false)} style={{padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'}}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => leaveMutation.mutate(leaveForm)} disabled={!leaveForm.startDate || !leaveForm.endDate || leaveMutation.isPending}>
                {leaveMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
