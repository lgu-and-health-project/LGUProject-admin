"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, CurrentUser } from "@/services/auth";
import { hasAccess } from "@/lib/permissions";
import { Users, UserCheck, CalendarOff, Briefcase, FileText } from "lucide-react";
import Link from "next/link";

export default function DashboardIndex() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const u = await authService.getUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  if (loading || !user) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-tertiary)" }}>Loading workspace...</p>
      </div>
    );
  }

  // Determine role-based capabilities
  const isMISO = hasAccess(user, "roles") && hasAccess(user, "staff");
  const isHRIS = hasAccess(user, "hr");

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user.email?.split("@")[0] || "Staff"}!</h1>
        <p className="page-subtitle">Here is your daily overview.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Your Next Payday</div>
          <div className="stat-value text-green">₱15,200</div>
          <div className="stat-trend neutral">Processed via HRIS</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Leave Requests</div>
          <div className="stat-value">0</div>
          <div className="stat-trend neutral">All caught up</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unread Announcements</div>
          <div className="stat-value" style={{color: "#38bdf8"}}>2</div>
          <div className="stat-trend neutral"><Link href="/announcements" style={{color: "var(--text-secondary)"}}>View inbox</Link></div>
        </div>
      </div>

      <div className="quick-actions-grid" style={{ marginBottom: "2.5rem" }}>
        <Link href="/announcements" style={{textDecoration: "none"}}>
          <div className="action-card">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FileText size={18}/> View Announcements</h3>
            <p>Check the latest updates from the Mayor's Office and HRIS.</p>
          </div>
        </Link>
        <div className="action-card">
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><CalendarOff size={18}/> Request Formal Leave</h3>
          <p>Submit a medical or vacation leave request to HRIS.</p>
        </div>
        <div className="action-card">
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Briefcase size={18}/> Request Field Work</h3>
          <p>Submit a field work authorization for approval.</p>
        </div>
      </div>

      {isHRIS && (
        <>
          <h2 className="card-title" style={{marginTop: "2rem"}}>HRIS Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Staff Online</div>
              <div className="stat-value text-green">142</div>
              <div className="stat-trend positive">94% attendance rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Staff Absent/Excused</div>
              <div className="stat-value" style={{color: "#ef4444"}}>8</div>
              <div className="stat-trend neutral">Review leave requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Payroll Approvals</div>
              <div className="stat-value" style={{color: "#f59e0b"}}>12</div>
              <div className="stat-trend neutral">Requires action</div>
            </div>
          </div>
        </>
      )}

      {isMISO && (
        <>
          <h2 className="card-title" style={{marginTop: "2rem"}}>MISO Administration</h2>
          <div className="quick-actions-grid">
            <Link href="/staff" style={{textDecoration: "none"}}>
              <div className="action-card">
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Users size={18}/> Verify Accounts</h3>
                <p>Manage unverified staff accounts and invitations.</p>
              </div>
            </Link>
            <Link href="/roles" style={{textDecoration: "none"}}>
              <div className="action-card">
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><UserCheck size={18}/> RBAC Allocation</h3>
                <p>Allocate permissions and roles to staff members.</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
