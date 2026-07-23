"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Shield,
  ShieldAlert,
  Check,
  X,
  Mail,
  Loader2,
  Copy,
  CheckCircle2,
  Trash2,
  Edit,
  Flag,
} from "lucide-react";
import {
  adminService,
  AdminUser,
  AdminStatus,
  AdminRole,
} from "@/services/adminService";
import { ConfirmModal } from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function AdministratorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "ADMIN",
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccessLink, setInviteSuccessLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    idToDelete: string | null;
  }>({ isOpen: false, idToDelete: null });

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("access_token");
        if (token) return JSON.parse(atob(token.split('.')[1])).email;
      } catch (e) {}
    }
    return null;
  });

  const [currentUserRole, setCurrentUserRole] = useState<AdminRole | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("access_token");
        if (token) return JSON.parse(atob(token.split('.')[1])).role;
      } catch (e) {}
    }
    return null;
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();

    const intervalId = setInterval(() => {
      adminService
        .getAdmins()
        .then((data) => {
          setAdmins((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data : prev,
          );
        })
        .catch(console.error);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  async function fetchAdmins() {
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load administrators",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const newAdmin: any = await adminService.inviteAdmin(inviteForm);
      setAdmins((prev) => {
        if (prev.some(a => a.id === newAdmin.id)) {
          return prev.map(a => a.id === newAdmin.id ? newAdmin : a);
        }
        return [...prev, newAdmin];
      });
      
      setInviteSuccessLink(
        `${window.location.origin}/invite?token=${newAdmin.inviteToken}`,
      );
      
      setIsCopied(false);
      toast.success("Invite created and sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to invite administrator");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      toast.loading("Resending invite...", { id: "resend-invite" });
      const res = await adminService.resendInvite(id);
      toast.success("Invitation resent successfully!", { id: "resend-invite" });
      if (res.inviteToken) {
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, inviteToken: res.inviteToken } : a));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invite", { id: "resend-invite" });
    }
  };

  const executeDeleteAdmin = async () => {
    const id = confirmState.idToDelete;
    if (!id) return;

    try {
      await adminService.deleteAdmin(id);
      setAdmins((prev) => prev.filter((admin) => admin.id !== id));
      toast.success("Administrator deleted successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete administrator",
      );
    } finally {
      setConfirmState({ isOpen: false, idToDelete: null });
    }
  };

  const handleDeleteAdminClick = (id: string) => {
    setConfirmState({ isOpen: true, idToDelete: id });
  };

  const getStatusBadge = (status: AdminStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Active
          </span>
        );
      case "invited":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Invited
          </span>
        );
      case "revoked":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleIcon = (role: AdminRole) => {
    if (role === "ROOT_SUPERADMIN") {
      return <ShieldAlert className="w-4 h-4 text-primary mr-1.5" />;
    }
    return <Shield className="w-4 h-4 text-text-secondary mr-1.5" />;
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="p-8 h-full flex flex-col relative w-full">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Administrator Management
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage platform co-admins, roles, and review pending invites.
          </p>
        </div>

        <button
          onClick={() => {
            setInviteForm({ fullName: "", email: "", role: "ADMIN" });
            setInviteSuccessLink("");
            setIsInviteModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite Administrator
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface p-4 rounded-t-2xl border border-b-0 border-text-secondary/10 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-text-secondary" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-text-secondary/20 rounded-lg leading-5 bg-background text-foreground placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm transition-colors"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <select className="block w-full pl-3 pr-10 py-2 text-sm border border-text-secondary/20 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option>All Statuses</option>
            <option>Pending Approval</option>
            <option>Active</option>
            <option>Invited</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface border border-text-secondary/10 rounded-b-2xl shadow-sm flex-1 flex flex-col min-h-0">
        <table className="min-w-full h-full divide-y divide-text-secondary/10">
          <thead className="bg-background/50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Administrator
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Appointed By
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                Joined
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-text-secondary/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-text-secondary mt-2">
                    Loading administrators...
                  </p>
                </td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-text-secondary"
                >
                  No administrators found.
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((admin) => {
                  const normalizedUserRole = currentUserRole?.toUpperCase() || "";
                  const normalizedTargetRole = admin.role?.toUpperCase() || "";

                  const canEdit = normalizedUserRole === "ROOT_SUPERADMIN" && normalizedTargetRole === "ADMIN";
                  const canRemove = normalizedUserRole === "ROOT_SUPERADMIN" && normalizedTargetRole === "ADMIN";
                  const canReport = normalizedUserRole === "ADMIN" && normalizedTargetRole === "ADMIN";
                  const hasAnyAction = canEdit || canRemove || canReport;

                  return (
                  <tr
                    key={admin.id}
                    className="hover:bg-background/50 transition-colors group relative"
                  >
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {admin.fullName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {admin.fullName}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {admin.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(admin.role)}
                        <span
                          className={`text-sm font-medium ${admin.role === "ROOT_SUPERADMIN" ? "text-primary" : "text-foreground"}`}
                        >
                          {admin.role === "ROOT_SUPERADMIN"
                            ? "Root Admin"
                            : "Co-Admin"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      {getStatusBadge(admin.status)}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                      {admin.appointedByName || (
                        <span className="text-text-secondary/50">
                          — System —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                      {admin.status === "active"
                        ? new Date(admin.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                      {admin.status === "invited" ? (
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {admin.inviteToken && (
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/invite?token=${admin.inviteToken}`;
                                navigator.clipboard.writeText(link);
                                toast.success("Invite link copied to clipboard!");
                              }}
                              className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copy Link
                            </button>
                          )}
                          <button
                            onClick={() => handleResendInvite(admin.id)}
                            className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded"
                          >
                            <Mail className="w-3 h-3 mr-1" /> Resend
                          </button>
                          <button
                            onClick={() => handleDeleteAdminClick(admin.id)}
                            className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                            title="Cancel Invite"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : admin.status === "revoked" ? (
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteAdminClick(admin.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="Remove Administrator"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : admin.email !== currentUserEmail ? (
                        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setOpenMenuId(openMenuId === admin.id ? null : admin.id);
                            }}
                            className="text-text-secondary hover:text-foreground p-1 rounded-full hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === admin.id && (
                            <div className="absolute right-8 top-0 mt-0 w-48 bg-surface border border-text-secondary/10 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    toast('Edit profile functionality coming soon', { icon: '🚧' });
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-foreground transition-colors flex items-center"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Profile
                                </button>
                              )}
                              {canReport && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    toast('Report functionality coming soon', { icon: '🚧' });
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors flex items-center"
                                >
                                  <Flag className="w-4 h-4 mr-2" />
                                  Report Administrator
                                </button>
                              )}
                              {canRemove && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeleteAdminClick(admin.id);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Administrator
                                </button>
                              )}
                              {!hasAnyAction && (
                                <div className="px-4 py-3 text-sm text-text-secondary italic text-center border-t border-text-secondary/10 mt-1">
                                  No actions available
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}


                {/* Empty rows to stretch table height evenly */}
                {Array.from({ length: Math.max(0, itemsPerPage - paginatedAdmins.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="hover:bg-transparent">
                    <td colSpan={6} className="px-6 py-2 whitespace-nowrap text-transparent select-none border-0">
                      <div className="h-8 w-8"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
        </table>

        {/* Pagination */}
        {!loading && filteredAdmins.length > 0 && (
          <div className="px-6 py-4 border-t border-text-secondary/10 flex items-center justify-between bg-background/30 mt-auto">
            <div className="text-sm text-text-secondary">
              Showing <span className="font-medium text-foreground">{Math.min(filteredAdmins.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="font-medium text-foreground">{Math.min(filteredAdmins.length, currentPage * itemsPerPage)}</span> of <span className="font-medium text-foreground">{filteredAdmins.length}</span> results
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

      {/* Invite Modal Overlay */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-text-secondary/10 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-text-secondary/10">
              <h2 className="text-lg font-bold text-foreground">
                Invite Administrator
              </h2>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-text-secondary hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {inviteSuccessLink ? (
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {inviteSuccessLink === "PENDING" ? "Invite Pending Approval!" : "Invitation Sent!"}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    {inviteSuccessLink === "PENDING"
                      ? "The invitation has been sent for superadmin approval. Once approved, the email will be sent automatically."
                      : "An email has been automatically sent to the administrator with instructions to set their password. If they didn't receive it, you can share this backup link:"}
                  </p>
                  {inviteSuccessLink !== "PENDING" && (
                    <div className="bg-background border border-text-secondary/20 p-3 rounded-lg flex items-center justify-between mb-6">
                      <code className="text-xs text-primary truncate max-w-[250px]">{inviteSuccessLink}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteSuccessLink);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 transition-all font-medium"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="w-full mt-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Full Name
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 border border-text-secondary/20 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                      value={inviteForm.fullName}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          fullName: e.target.value,
                        })
                      }
                      placeholder="e.g. Juan Dela Cruz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-3 py-2 border border-text-secondary/20 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                      placeholder="juan@lgu.gov"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full px-3 py-2 border border-text-secondary/20 rounded-lg bg-surface text-text-secondary outline-none cursor-not-allowed"
                      value="Co-Admin (Standard)"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-background rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {inviteLoading && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Create Invite
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title="Remove Administrator"
        message="Are you sure you want to permanently remove this administrator? This action cannot be undone."
        confirmText="Remove"
        isDestructive={true}
        onConfirm={executeDeleteAdmin}
        onCancel={() => setConfirmState({ isOpen: false, idToDelete: null })}
      />
    </div>
  );
}
