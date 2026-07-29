"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, Settings, Bell } from "lucide-react";
import { authService, CurrentUser } from "@/services/auth";
import { ADMIN_MODULES, LGU_MODULES, ALL_MODULES } from "@/lib/config/modules";
import { getModuleIcon } from "@/lib/config/icons";
import { getAccessibleModules } from "@/lib/permissions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const u = await authService.getUser();
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  // Both filtered off the same lib/config/modules.ts registry that seeded
  // Module rows on the backend come from — no more hand-typed duplicate list.
  const adminItems = getAccessibleModules(user, "admin");
  const lguModules = getAccessibleModules(user, "lgu");

  const currentNav = ALL_MODULES.find((item) => item.path === pathname) || { name: "Dashboard" };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-tertiary)" }}>Loading workspace...</p>
      </div>
    );
  }

  const renderNavSection = (items: typeof ADMIN_MODULES) =>
    items.map((item) => {
      const Icon = getModuleIcon(item.id);
      const isActive = pathname === item.path;

      return (
        <Link
          key={item.id}
          href={item.path}
          className="nav-link-item group"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            textDecoration: "none",
            position: "relative",
            backgroundColor: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
            color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
            transition: "all 0.2s ease",
          }}
          title={collapsed ? item.name : undefined}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={20} style={{ color: isActive ? "var(--accent-primary)" : "inherit" }} />
          </div>

          <span style={{
            marginLeft: "12px",
            fontSize: "0.875rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            transition: "opacity 300ms",
            opacity: collapsed ? 0 : 1,
            display: collapsed ? "none" : "block",
          }}>
            {item.name}
          </span>

          {isActive && (
            <div style={{
              position: "absolute",
              left: "-1rem",
              top: "50%",
              transform: "translateY(-50%)",
              height: "20px",
              width: "4px",
              backgroundColor: "var(--accent-primary)",
              borderRadius: "0 4px 4px 0",
            }} />
          )}
        </Link>
      );
    });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <aside
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          transition: "width 300ms ease-in-out",
          overflow: "hidden",
          width: collapsed ? "72px" : "280px",
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          height: "70px",
          padding: "0 1.5rem",
          borderBottom: "1px solid var(--border-color)",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-primary), #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginRight: "12px",
            boxShadow: "0 0 15px var(--accent-glow)",
          }}>
            <div style={{ width: "16px", height: "16px", background: "white", borderRadius: "4px" }}></div>
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "var(--text-primary)",
            transition: "opacity 300ms",
            opacity: collapsed ? 0 : 1,
            display: collapsed ? "none" : "block",
          }}>
            GovPlatform
          </span>
        </div>

        {/* Sidebar Navigation */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem", overflowX: "hidden" }}>
          {!collapsed && adminItems.length > 0 && (
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "0.5rem", paddingLeft: "0.5rem", marginTop: "0.5rem" }}>
              Administration
            </div>
          )}
          {renderNavSection(adminItems)}

          {!collapsed && lguModules.length > 0 && (
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "0.5rem", paddingLeft: "0.5rem", marginTop: "1rem" }}>
              LGU Modules
            </div>
          )}
          {renderNavSection(lguModules)}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: "1.5rem 1rem", borderTop: "1px solid var(--border-color)", overflowX: "hidden", display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link
            href="/settings"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              border: "none",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title={collapsed ? "Settings" : undefined}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings size={20} />
            </div>

            <span style={{
              marginLeft: "12px",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "opacity 300ms",
              opacity: collapsed ? 0 : 1,
              display: collapsed ? "none" : "block",
            }}>
              Settings
            </span>
          </Link>
          
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title={collapsed ? "Logout" : undefined}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={20} />
            </div>

            <span style={{
              marginLeft: "12px",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "opacity 300ms",
              opacity: collapsed ? 0 : 1,
              display: collapsed ? "none" : "block",
            }}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Header */}
        <header style={{
          height: "70px",
          backgroundColor: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 2rem",
          zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = "var(--text-primary)" }}
              onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-secondary)" }}
            >
              <Menu size={20} />
            </button>

            <h1 style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
              paddingLeft: "1rem",
              margin: 0,
            }}>
              {currentNav.name}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              title="Notifications"
            >
              <Bell size={20} />
              <span style={{
                position: "absolute",
                top: "6px",
                right: "8px",
                width: "8px",
                height: "8px",
                backgroundColor: "#ef4444",
                borderRadius: "50%",
                border: "2px solid var(--bg-secondary)",
              }}></span>
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "6px 12px 6px 6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "30px",
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                backgroundColor: "var(--accent-primary)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "white",
              }}>
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.2, color: "var(--text-primary)" }}>{user?.role ?? "Staff"}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Actual Page Content */}
        <main style={{
          flex: 1,
          overflowY: "auto",
          padding: "2rem",
          backgroundColor: "var(--bg-primary)",
        }}>
          <div style={{ width: "100%" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
