"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  Building2,
  ShieldCheck
} from "lucide-react";
import { authService } from "@/services/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tenants (LGUs)", href: "/dashboard/tenants", icon: Building2 },
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Audit Logs", href: "/dashboard/audit", icon: ShieldCheck },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // Find the current page title based on the active path
  const currentNav = navItems.find(item => item.href === pathname) || { name: "Dashboard" };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`relative flex flex-col bg-surface border-r border-text-secondary/10 transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Sidebar Header (Logo + App Name) */}
        <div className="flex items-center h-16 px-4 border-b border-text-secondary/10 overflow-hidden whitespace-nowrap">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 mr-3">
            <span className="text-white font-bold text-sm tracking-tighter">LP</span>
          </div>
          <span 
            className={`font-bold text-foreground transition-opacity duration-300 ${
              collapsed ? "opacity-0 hidden" : "opacity-100 block"
            }`}
          >
            Admin Portal
          </span>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3 overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-xl p-2.5 group transition-colors relative ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Icon size={20} className={isActive ? "text-primary" : "text-text-secondary group-hover:text-foreground transition-colors"} />
                </div>
                
                <span 
                  className={`ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${
                    collapsed ? "opacity-0 hidden" : "opacity-100 block"
                  }`}
                >
                  {item.name}
                </span>

                {/* Tooltip for collapsed state (hover) */}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-surface border border-text-secondary/10 rounded-md shadow-lg text-sm font-medium text-foreground opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-text-secondary/10 overflow-x-hidden">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl p-2.5 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors group relative`}
            title={collapsed ? "Logout" : undefined}
          >
            <div className="flex-shrink-0 flex items-center justify-center">
              <LogOut size={20} className="group-hover:text-red-500 transition-colors" />
            </div>
            
            <span 
              className={`ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${
                collapsed ? "opacity-0 hidden" : "opacity-100 block"
              }`}
            >
              Logout
            </span>

            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-surface border border-text-secondary/10 rounded-md shadow-lg text-sm font-medium text-red-500 opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-surface border-b border-text-secondary/10 z-10">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 -ml-2 rounded-lg text-text-secondary hover:bg-background hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
            
            <h1 className="font-bold text-lg text-foreground tracking-tight border-l border-text-secondary/20 pl-4">
              {currentNav.name}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Future buttons can go here */}
          </div>
        </header>

        {/* Actual Page Content */}
        <main className="flex-1 overflow-auto bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}
