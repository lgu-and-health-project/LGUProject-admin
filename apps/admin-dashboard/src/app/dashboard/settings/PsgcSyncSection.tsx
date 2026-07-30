"use client";

import { useState, useEffect } from "react";
import { psgcService, SyncStatusData } from "@/services/psgcService";
import {
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ServerCrash,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PsgcSyncSection() {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchData = async () => {
    try {
      const [status, history] = await Promise.all([
        psgcService.getSyncStatus(),
        psgcService.getSyncHistory(),
      ]);
      setSyncStatus(status);
      setSyncHistory(history);

      if (status?.status === "IN_PROGRESS") {
        setSyncing(true);
      } else {
        setSyncing(false);
      }
    } catch (e) {
      console.error("Failed to load PSGC sync data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncing) {
      interval = setInterval(() => {
        fetchData();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [syncing]);

  const handleStartSync = async () => {
    try {
      setSyncing(true);
      await psgcService.sync();
      toast.success("PSGC Sync started in the background");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to start PSGC Sync");
      setSyncing(false);
    }
  };

  const handleCancelSync = async () => {
    try {
      await psgcService.cancelSync();
      toast.success("Sync cancellation requested");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel PSGC Sync");
    }
  };

  const getStatusIcon = (log: SyncStatusData) => {
    if (log.status === "IN_PROGRESS")
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    if (log.status === "COMPLETED")
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (log.status === "FAILED" && log.errorDetails === "Canceled by user")
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <ServerCrash className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (log: SyncStatusData) => {
    if (log.status === "FAILED" && log.errorDetails === "Canceled by user") {
      return "Cancelled";
    }
    return log.status.toLowerCase().replace("_", " ");
  };

  const filteredHistory = syncHistory.filter(
    (log) =>
      !(
        log.status === "COMPLETED" &&
        log.totalRecords === 0 &&
        log.progress === 0
      ),
  );

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading) return null;

  return (
    <div className="bg-surface rounded-2xl border border-text-secondary/10 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-text-secondary/10 bg-background/50 flex items-center justify-between">
        <div className="flex items-center">
          <Database className="w-5 h-5 mr-2 text-primary" />
          <h3 className="text-lg font-bold text-foreground">PSGC Data Sync</h3>
        </div>
        {syncing ? (
          <button
            onClick={handleCancelSync}
            className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded-lg transition-colors flex items-center"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Cancel Sync
          </button>
        ) : (
          <button
            onClick={handleStartSync}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start PSGC Sync
          </button>
        )}
      </div>

      <div className="p-6">
        <p className="text-sm text-text-secondary mb-6">
          Synchronize the local database with the official PSA Philippine
          Standard Geographic Code (PSGC) API.
        </p>

        {syncStatus && syncStatus.status === "IN_PROGRESS" && (
          <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-5">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                  Syncing PSGC version {syncStatus.psgcVersion}
                </h4>
                <p className="text-xs text-blue-700/80 mt-1">
                  Fetching regions, provinces, municipalities, and barangays...
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-700">
                  {syncStatus.progress.toLocaleString()}
                </span>
                <span className="text-xs text-blue-600 ml-1">
                  records imported
                </span>
              </div>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min((syncStatus.progress / syncStatus.estimatedTotal) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-blue-600/80 mb-1">
              <span>
                ~
                {Math.round(
                  (syncStatus.progress / syncStatus.estimatedTotal) * 100,
                )}
                % of estimated total
              </span>
            </div>
            <div className="flex justify-between text-xs text-blue-600/80">
              <span>Traffic Usage: {syncStatus.trafficUsage} requests</span>
              <span>
                Started{" "}
                {syncStatus.startedAt
                  ? formatDistanceToNow(new Date(syncStatus.startedAt), {
                      addSuffix: true,
                    })
                  : ""}
              </span>
            </div>
          </div>
        )}

        {syncStatus &&
          syncStatus.status === "FAILED" &&
          syncStatus.errorDetails !== "Canceled by user" && (
            <div className="mb-6 bg-red-50/50 border border-red-100 rounded-xl p-5 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">
                  Last sync failed
                </h4>
                <p className="text-sm text-red-700/80 mt-1">
                  {syncStatus.errorDetails ||
                    "Unknown error occurred during sync."}
                </p>
              </div>
            </div>
          )}

        {syncStatus &&
          syncStatus.status === "FAILED" &&
          syncStatus.errorDetails === "Canceled by user" && (
            <div className="mb-6 bg-amber-50/50 border border-amber-100 rounded-xl p-5 flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">
                  Sync Cancelled
                </h4>
                <p className="text-sm text-amber-700/80 mt-1">
                  The sync process was cancelled by a user.
                </p>
              </div>
            </div>
          )}

        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center mt-8">
          <Calendar className="w-4 h-4 mr-2 text-text-secondary" />
          Sync History
        </h4>

        {filteredHistory.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            No sync history found.
          </p>
        ) : (
          <div className="border border-text-secondary/10 rounded-xl overflow-hidden bg-background/30">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-background border-b border-text-secondary/10 text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium w-[20%]">Status</th>
                  <th className="px-4 py-3 font-medium w-[15%]">Version</th>
                  <th className="px-4 py-3 font-medium w-[20%]">Records</th>
                  <th className="px-4 py-3 font-medium w-[20%]">
                    API Requests
                  </th>
                  <th className="px-4 py-3 font-medium w-[25%]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-secondary/10">
                {paginatedHistory.map((log) => (
                  <tr
                    key={log.syncId}
                    className="hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {getStatusIcon(log)}
                        <span className="ml-2 font-medium text-foreground text-xs capitalize">
                          {getStatusText(log)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {log.psgcVersion}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-medium">
                      {(log.totalRecords || log.progress).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {log.trafficUsage}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {log.startedAt
                        ? format(new Date(log.startedAt), "MMM d, yyyy h:mm a")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-text-secondary/10 flex items-center justify-between bg-background/50">
                <span className="text-xs text-text-secondary">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredHistory.length)}{" "}
                  of {filteredHistory.length} logs
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md text-text-secondary hover:bg-background disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded-md text-text-secondary hover:bg-background disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
