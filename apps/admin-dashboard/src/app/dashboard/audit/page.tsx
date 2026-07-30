"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import { format } from "date-fns";
import { auditService, AuditLog } from "@/services/auditService";
import { formatAuditDetails } from "@/lib/formatAuditDetails";
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
      const data = await auditService.getAuditLogs();
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
      case "accept_invite": return { label: "Account Setup", icon: UserCheck, color: "text-emerald-600 bg-emerald-100 border-emerald-200" };
      case "login": return { label: "User Login", icon: Activity, color: "text-indigo-600 bg-indigo-100 border-indigo-200" };
      case "delete_admin": return { label: "Deleted Admin", icon: UserMinus, color: "text-red-600 bg-red-100 border-red-200" };
      case "revoke_admin": return { label: "Revoked Admin", icon: UserX, color: "text-red-600 bg-red-100 border-red-200" };
      case "register_tenant": return { label: "Registered Tenant", icon: Building2, color: "text-purple-600 bg-purple-100 border-purple-200" };
      case "suspend_tenant": return { label: "Suspended Tenant", icon: Ban, color: "text-orange-600 bg-orange-100 border-orange-200" };
      case "activate_tenant": return { label: "Activated Tenant", icon: Activity, color: "text-emerald-600 bg-emerald-100 border-emerald-200" };
      case "delete_tenant": return { label: "Deleted Tenant", icon: Ban, color: "text-red-600 bg-red-100 border-red-200" };
      case "reissue_license": return { label: "Reissued License", icon: Activity, color: "text-blue-600 bg-blue-100 border-blue-200" };
      case "revoke_license": return { label: "Revoked License", icon: Ban, color: "text-red-600 bg-red-100 border-red-200" };
      default: return { label: action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), icon: Activity, color: "text-gray-600 bg-gray-100 border-gray-200" };
    }
  };

  const fuse = useMemo(() => new Fuse(logs.filter(log => log.action !== "sync_psgc"), {
    keys: [
      "actor.fullName",
      "actor.email",
      "metadata.attempted_email",
      "metadata.email",
      {
        name: "detailsText",
        getFn: (log) => formatAuditDetails(log.action, log.metadata, (log as any).status)
      }
    ],
    threshold: 0.5,
    ignoreLocation: true,
    findAllMatches: true,
  }), [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs.filter(log => log.action !== "sync_psgc");
    if (searchQuery) {
      result = fuse.search(searchQuery).map(r => r.item);
    }
    if (filterAction !== "ALL") {
      result = result.filter(log => log.action === filterAction);
    }
    return result;
  }, [searchQuery, filterAction, logs, fuse]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAction]);

  return (
    <div className="p-8 h-full flex flex-col relative w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            System Audit Logs
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Track administrative actions, tenant onboarding, and platform changes.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          suppressHydrationWarning
          className="inline-flex items-center justify-center px-4 py-2 bg-surface border border-text-secondary/20 text-foreground text-sm font-medium rounded-lg hover:bg-background transition-colors"
        >
          <RefreshCw suppressHydrationWarning className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`.trim()} />
          Refresh Data
        </button>
      </div>

      <div className="bg-surface p-4 rounded-t-2xl border border-b-0 border-text-secondary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md">
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
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
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
            <table className="w-full min-w-[900px] divide-y divide-text-secondary/10 table-fixed">
              <thead className="bg-background/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[20%]">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[40%]">
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
                        <div className="text-sm font-medium text-foreground">{log.actor?.fullName || (log.action === 'login' && (log as any).status === 'FAILURE' ? 'Unknown User' : 'System')}</div>
                        <div className="text-xs text-text-secondary">{log.actor?.email || log.metadata?.attempted_email || "system"}</div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
                          <ActionIcon className="w-3 h-3 mr-1.5" />
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-sm text-foreground max-w-md truncate" title={formatAuditDetails(log.action, log.metadata, (log as any).status)}>
                        {formatAuditDetails(log.action, log.metadata, (log as any).status)}
                      </td>
                    </tr>
                  );
                })}

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
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium bg-surface border border-text-secondary/20 hover:bg-background rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
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
