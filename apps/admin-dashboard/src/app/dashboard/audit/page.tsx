"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fetchApi } from "@/services/apiClient";
import {
  Search,
  Activity,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  Building2,
  Ban,
  Filter,
  RefreshCw,
  Loader2
} from "lucide-react";

interface AuditLog {
  id: string;
  actor: {
    fullName: string;
    email: string;
    role: string;
  };
  action: string;
  details: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<AuditLog[]>("/audit-logs");
      setLogs(data);
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionDetails = (action: string) => {
    switch (action) {
      case "invite_admin": return { label: "Invited Admin", icon: UserPlus, color: "text-blue-600 bg-blue-100 border-blue-200" };
      case "accept_invite": return { label: "Account Setup", icon: Activity, color: "text-emerald-600 bg-emerald-100 border-emerald-200" };
      case "approve_admin": return { label: "Approved Admin", icon: UserCheck, color: "text-emerald-600 bg-emerald-100 border-emerald-200" };
      case "reject_admin": return { label: "Rejected Request", icon: UserX, color: "text-red-600 bg-red-100 border-red-200" };
      case "delete_admin": return { label: "Deleted Admin", icon: UserMinus, color: "text-red-600 bg-red-100 border-red-200" };
      case "register_tenant": return { label: "Registered Tenant", icon: Building2, color: "text-purple-600 bg-purple-100 border-purple-200" };
      case "suspend_tenant": return { label: "Suspended Tenant", icon: Ban, color: "text-orange-600 bg-orange-100 border-orange-200" };
      default: return { label: action, icon: Activity, color: "text-gray-600 bg-gray-100 border-gray-200" };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterAction === "ALL" || log.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAction]);

  return (
    <div className="p-8 h-full flex flex-col relative w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            System Audit Logs
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Track administrative actions, tenant onboarding, and platform changes.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center px-4 py-2 bg-surface border border-text-secondary/20 text-foreground text-sm font-medium rounded-lg hover:bg-background transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh Data
        </button>
      </div>

      <div className="bg-surface p-4 rounded-t-2xl border border-b-0 border-text-secondary/10 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-secondary" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-text-secondary/20 rounded-lg bg-background text-foreground placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            placeholder="Search by actor or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 text-sm border border-text-secondary/20 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="ALL">All Actions</option>
              <option value="invite_admin">Invited Admin</option>
              <option value="approve_admin">Approved Admin</option>
              <option value="delete_admin">Deleted Admin</option>
              <option value="register_tenant">Registered Tenant</option>
              <option value="suspend_tenant">Suspended Tenant</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-text-secondary/10 rounded-b-2xl shadow-sm flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No audit logs found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="min-w-full h-full divide-y divide-text-secondary/10">
              <thead className="bg-background/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-secondary/10">
                {paginatedLogs.map((log) => {
                  const { label, icon: ActionIcon, color } = getActionDetails(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-background/50 transition-colors group">
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                        {format(new Date(log.createdAt), "MMM d, yyyy")}
                        <div className="text-xs opacity-70">{format(new Date(log.createdAt), "h:mm:ss a")}</div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{log.actor.fullName}</div>
                        <div className="text-xs text-text-secondary">{log.actor.email}</div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
                          <ActionIcon className="w-3 h-3 mr-1.5" />
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-sm text-foreground max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              
                
                {/* Empty rows to stretch table height evenly */}
                {Array.from({ length: Math.max(0, itemsPerPage - paginatedLogs.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="hover:bg-transparent">
                    <td colSpan={4} className="px-6 py-2 whitespace-nowrap text-transparent select-none border-0">
                      <div className="h-8 w-8"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredLogs.length > 0 && (
          <div className="px-6 py-4 border-t border-text-secondary/10 flex items-center justify-between bg-background/30 mt-auto">
            <div className="text-sm text-text-secondary">
              Showing <span className="font-medium text-foreground">{Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="font-medium text-foreground">{Math.min(filteredLogs.length, currentPage * itemsPerPage)}</span> of <span className="font-medium text-foreground">{filteredLogs.length}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium bg-surface border border-text-secondary/20 hover:bg-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 text-sm font-medium bg-surface border border-text-secondary/20 hover:bg-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
