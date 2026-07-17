"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-text-secondary/10 sticky top-0 z-40 backdrop-blur-md bg-surface/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-bold text-sm tracking-tighter">LP</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">SuperAdmin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-text-secondary font-medium hidden sm:block">
                Welcome back, Admin
              </div>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500/90 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-surface rounded-2xl p-6 border border-text-secondary/10 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-text-secondary text-sm font-medium">Total Tenants</h3>
            <p className="text-3xl font-bold text-foreground mt-2">12</p>
            <div className="mt-2 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full inline-block">+2 this month</div>
          </div>
          
          <div className="bg-surface rounded-2xl p-6 border border-text-secondary/10 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-text-secondary text-sm font-medium">Active Users</h3>
            <p className="text-3xl font-bold text-foreground mt-2">1,248</p>
            <div className="mt-2 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full inline-block">+14% vs last week</div>
          </div>
          
          <div className="bg-surface rounded-2xl p-6 border border-text-secondary/10 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-text-secondary text-sm font-medium">System Health</h3>
            <p className="text-3xl font-bold text-foreground mt-2">99.9%</p>
            <div className="mt-2 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full inline-block">All systems operational</div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-text-secondary/10 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-text-secondary/10">
            <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
          </div>
          <div className="p-6 text-center text-text-secondary">
            No recent activity to display.
          </div>
        </div>
      </main>
    </div>
  );
}
