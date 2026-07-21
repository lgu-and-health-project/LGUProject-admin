"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "./RoleProvider";
import { APP_TABS, hasAccess } from "@/lib/permissions";
import AppLogo from "./AppLogo";

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useRole();

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'center' }}>
        <AppLogo iconSize={24} />
      </div>
      <nav className="sidebar-nav">
        {APP_TABS.map((tab) => {
          if (!hasAccess(role, tab.id, "read")) return null;

          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
