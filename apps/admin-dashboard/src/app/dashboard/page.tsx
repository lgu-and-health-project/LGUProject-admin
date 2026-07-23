"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/services/apiClient";
import { Building2, Activity, Clock, BarChart2 } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tenants = await fetchApi<any[]>("/tenants");
        setStats({
          total: tenants.length,
          active: tenants.filter(t => t.status === "active").length,
          pending: tenants.filter(t => t.status === "pending_setup").length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 w-full h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-8 flex-shrink-0">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Overview</h1>
        <p className="text-text-secondary mt-1">Welcome back. Here is a summary of platform operations.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 flex-shrink-0">
        <div className="bg-surface border border-text-secondary/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Total Onboarded LGUs</p>
              {loading ? (
                <div className="h-8 w-16 bg-background animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-bold text-foreground mt-1">{stats.total}</h3>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-surface border border-text-secondary/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Active Organizations</p>
              {loading ? (
                <div className="h-8 w-16 bg-background animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-bold text-foreground mt-1">{stats.active}</h3>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-text-secondary/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Pending Setup</p>
              {loading ? (
                <div className="h-8 w-16 bg-background animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-3xl font-bold text-foreground mt-1">{stats.pending}</h3>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder State for Detailed Analytics */}
      <div className="flex flex-col items-center justify-center flex-1 bg-surface border border-text-secondary/10 rounded-2xl shadow-sm text-center min-h-[300px]">
        <div className="w-16 h-16 bg-background text-text-secondary flex items-center justify-center rounded-2xl mb-6 shadow-inner border border-text-secondary/10">
          <BarChart2 className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">Detailed Analytics Coming Soon</h3>
        <p className="text-text-secondary max-w-md mx-auto">
          We are currently collecting metrics. As your platform gains more traction, this area will unlock advanced growth charts, deep organizational insights, and engagement tracking.
        </p>
      </div>
    </div>
  );
}
