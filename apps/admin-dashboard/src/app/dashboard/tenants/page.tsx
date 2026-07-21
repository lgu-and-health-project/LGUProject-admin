"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import { format } from "date-fns";
import { fetchApi } from "@/services/apiClient";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Activity,
  X,
  Loader2,
  ShieldCheck,
  Key,
  Copy,
  CheckCircle2,
  Pencil,
  Check,
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import toast from "react-hot-toast";

interface Tenant {
  id: string;
  code: string;
  name: string;
  level: string;
  status: string;
  registrationKey?: string;
  sysAdminEmail?: string;
  createdAt: string;
}

const psgcCache: Record<string, any[]> = {};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    idToSuspend: string | null;
    action: 'suspend' | 'activate' | 'delete' | null;
  }>({
    isOpen: false,
    idToSuspend: null,
    action: null,
  });
  const [newKeyModal, setNewKeyModal] = useState<{
    isOpen: boolean;
    orgName: string;
    regKey: string;
  }>({
    isOpen: false,
    orgName: "",
    regKey: "",
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    level: "municipality",
    sysAdminEmail: "",
  });

  const [psgcOptions, setPsgcOptions] = useState<any[]>([]);
  const [psgcLoading, setPsgcLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isEditingCode, setIsEditingCode] = useState(false);
  const [draftCode, setDraftCode] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    
    let isMounted = true;
    const fetchPsgc = async () => {
      setPsgcLoading(true);
      try {
        let endpoint = "";
        if (formData.level === "province") endpoint = "/provinces";
        else if (formData.level === "city" || formData.level === "municipality") endpoint = "/cities-municipalities";
        
        if (!endpoint) return;
        
        if (psgcCache[endpoint]) {
          if (isMounted) setPsgcOptions(psgcCache[endpoint]);
        } else {
          const res = await fetch(`https://psgc.cloud/api/v2${endpoint}`, {
            headers: { 'Accept': 'application/json' }
          });
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          
          const json = await res.json();
          const data = Array.isArray(json) ? json : (json.data || []);
          
          if (formData.level === "city") {
             // Optional: Filter for cities if we want to be strict, but keeping both is fine for search
             psgcCache[endpoint] = data;
          } else {
             psgcCache[endpoint] = data;
          }
          
          if (isMounted) setPsgcOptions(data);
        }
      } catch (err) {
        console.error("Failed to fetch PSGC data", err);
        if (isMounted) setPsgcOptions([]);
      } finally {
        if (isMounted) setPsgcLoading(false);
      }
    };
    
    fetchPsgc();
    
    return () => { isMounted = false; };
  }, [formData.level, isModalOpen]);

  const fuse = useMemo(
    () =>
      new Fuse(psgcOptions, {
        keys: ["name"],
        threshold: 0.3,
      }),
    [psgcOptions],
  );

  const searchResults = useMemo(() => {
    return formData.name
      ? fuse
          .search(formData.name)
          .map((res) => res.item)
          .slice(0, 50)
      : psgcOptions.slice(0, 50);
  }, [formData.name, fuse, psgcOptions]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Tenant[]>("/tenants");
      setTenants(data);
    } catch (e) {
      console.error("Failed to load tenants", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();

    const intervalId = setInterval(() => {
      fetchApi<Tenant[]>("/tenants")
        .then((data) => {
          setTenants((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data : prev,
          );
        })
        .catch(console.error);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const existing = tenants.find(t => t.code === formData.code);
    if (existing) {
      toast.error(`The organization with code ${formData.code} is already registered!`);
      return;
    }
    
    setFormLoading(true);
    try {
      const response = await fetchApi<Tenant>("/tenants", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({
        code: "",
        name: "",
        level: "municipality",
        sysAdminEmail: "",
      });

      // Show the generated registration key modal
      if (response.registrationKey) {
        setNewKeyModal({
          isOpen: true,
          orgName: response.name,
          regKey: response.registrationKey,
        });
      }

      toast.success("Tenant registered successfully!");
      loadTenants();
    } catch (e: any) {
      toast.error(e.message || "Failed to register tenant");
    } finally {
      setFormLoading(false);
    }
  };

  const handleActionClick = (id: string, action: 'suspend' | 'activate' | 'delete') => {
    setConfirmState({ isOpen: true, idToSuspend: id, action });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.idToSuspend || !confirmState.action) return;
    const { idToSuspend, action } = confirmState;
    try {
      if (action === 'suspend') {
        await fetchApi(`/tenants/${idToSuspend}/suspend`, { method: "PUT" });
        toast.success("Tenant suspended successfully!");
      } else if (action === 'activate') {
        await fetchApi(`/tenants/${idToSuspend}/activate`, { method: "PUT" });
        toast.success("Tenant reactivated successfully!");
      } else if (action === 'delete') {
        await fetchApi(`/tenants/${idToSuspend}`, { method: "DELETE" });
        toast.success("Tenant permanently deleted!");
      }
      setConfirmState({ isOpen: false, idToSuspend: null, action: null });
      loadTenants();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} tenant`);
      setConfirmState({ isOpen: false, idToSuspend: null, action: null });
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="p-8 h-full flex flex-col relative w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Tenant Organizations
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Register and manage LGUs and their system administrators.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              code: "",
              name: "",
              level: "municipality",
              sysAdminEmail: "",
            });
            setIsEditingCode(false);
            setDraftCode("");
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register LGU Tenant
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
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface border border-text-secondary/10 rounded-b-2xl shadow-sm flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading tenants...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No LGU tenants found.</p>
          </div>
        ) : (
          <table className="min-w-full h-full divide-y divide-text-secondary/10">
            <thead className="bg-background/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  SysAdmin
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-secondary/10">
              {paginatedTenants.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-background/50 transition-colors group"
                >
                  <td className="px-6 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3 font-bold uppercase">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {t.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          Code: {t.code}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                      {t.level}
                    </span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    {t.status === "active" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    ) : t.status === "pending_setup" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Pending Setup
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <span className="text-sm text-foreground flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5 text-text-secondary" />
                      {t.sysAdminEmail || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-text-secondary">
                    {format(new Date(t.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => setSelectedTenant(t)}
                      className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            
                
                {/* Empty rows to stretch table height evenly */}
                {Array.from({ length: Math.max(0, itemsPerPage - paginatedTenants.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="hover:bg-transparent">
                    <td colSpan={6} className="px-6 py-2 whitespace-nowrap text-transparent select-none border-0">
                      <div className="h-8 w-8"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
        
        {!loading && filteredTenants.length > 0 && (
          <div className="px-6 py-4 border-t border-text-secondary/10 flex items-center justify-between bg-background/30 mt-auto">
            <div className="text-sm text-text-secondary">
              Showing <span className="font-medium text-foreground">{Math.min(filteredTenants.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="font-medium text-foreground">{Math.min(filteredTenants.length, currentPage * itemsPerPage)}</span> of <span className="font-medium text-foreground">{filteredTenants.length}</span> results
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl border border-text-secondary/10 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-text-secondary/10 flex justify-between items-center bg-background/50">
              <h3 className="text-lg font-bold text-foreground flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Register LGU Tenant
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      level: e.target.value,
                      name: "",
                      code: "",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="province">Province</option>
                  <option value="city">City</option>
                  <option value="municipality">Municipality</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Organization Name (Place)
                </label>
                <div className="relative" ref={dropdownRef}>
                  <input
                    required
                    type="text"
                    placeholder={`Enter ${formData.level} name...`}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {psgcLoading && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                    </div>
                  )}
                  {isDropdownOpen && searchResults.length > 0 && formData.name.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-text-secondary/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((item) => (
                        <div
                          key={item.code}
                          className="px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm border-b border-text-secondary/10 last:border-0"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              name: item.name,
                              code: item.code,
                            });
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="font-semibold text-foreground">
                            {item.name}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {formData.level === "province" && item.region}
                            {(formData.level === "city" ||
                              formData.level === "municipality") &&
                              `${item.type || formData.level}, ${item.province || item.region}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Organization Code (or PSGC Code)
                </label>
                <div className="relative">
                  <input
                    required
                    readOnly={!isEditingCode}
                    type="text"
                    placeholder="Enter unique code"
                    value={isEditingCode ? draftCode : formData.code}
                    onChange={(e) => {
                      if (isEditingCode) setDraftCode(e.target.value);
                      else setFormData({ ...formData, code: e.target.value });
                    }}
                    className={`w-full px-3 py-2 pr-20 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      isEditingCode 
                        ? "bg-background border-primary text-foreground" 
                        : "bg-background/50 border-text-secondary/20 text-text-secondary"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {isEditingCode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, code: draftCode });
                            setIsEditingCode(false);
                          }}
                          className="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingCode(false)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftCode(formData.code);
                          setIsEditingCode(true);
                        }}
                        className="p-1 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit Code"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-text-secondary/10 space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-primary" />
                  Initial SysAdmin Account
                </label>
                <p className="text-xs text-text-secondary mb-2">
                  This user will be authorized to appoint staff and configure
                  the LGU system.
                </p>
                <input
                  required
                  type="email"
                  placeholder="sysadmin@sanjuan.gov.ph"
                  value={formData.sysAdminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sysAdminEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-background border border-text-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-background rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                  {formLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Register Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Key Modal */}
      {newKeyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-2xl border border-primary/20 w-full max-w-md overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Registration Key
              </h3>
              <p className="text-text-secondary text-sm mb-6">
                You have successfully registered{" "}
                <strong>{newKeyModal.orgName}</strong>. Please provide this
                Registration Key to their System Administrator for initial
                platform setup.
              </p>

              <div className="bg-background border border-text-secondary/20 rounded-xl p-4 flex flex-col space-y-4 mb-6">
                <div>
                  <div className="text-xs font-semibold text-text-secondary mb-1 text-left">Registration Key</div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-foreground font-semibold tracking-wide break-all text-left">
                      {newKeyModal.regKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newKeyModal.regKey)}
                      className="ml-4 p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors flex-shrink-0"
                      title="Copy Key"
                    >
                      {copiedKey === newKeyModal.regKey ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="border-t border-text-secondary/10 pt-4">
                  <div className="text-xs font-semibold text-text-secondary mb-1 text-left">Setup Link (for SysAdmin)</div>
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono text-text-secondary truncate block w-full text-left mr-2" title={`${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${newKeyModal.regKey}`}>
                      {`${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${newKeyModal.regKey}`}
                    </code>
                    <button
                      onClick={() => {
                        const link = `${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${newKeyModal.regKey}`;
                        copyToClipboard(link);
                      }}
                      className="ml-2 p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors flex-shrink-0"
                      title="Copy Setup Link"
                    >
                      {copiedKey === `${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${newKeyModal.regKey}` ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setNewKeyModal({ isOpen: false, orgName: "", regKey: "" })
                }
                className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onCancel={() => setConfirmState({ isOpen: false, idToSuspend: null, action: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmState.action === 'suspend' ? "Suspend Tenant" :
          confirmState.action === 'activate' ? "Restore Tenant" :
          "Delete Tenant"
        }
        message={
          confirmState.action === 'suspend' 
            ? "Are you sure you want to suspend this organization? All operations and access for their users will be temporarily halted."
            : confirmState.action === 'activate'
            ? "Are you sure you want to restore this organization? Their users will immediately regain access to the platform."
            : "Are you sure you want to permanently delete this organization? This action cannot be undone and will wipe all associated data."
        }
        confirmText={
          confirmState.action === 'suspend' ? "Yes, Suspend" :
          confirmState.action === 'activate' ? "Yes, Restore" :
          "Yes, Delete Permanently"
        }
        cancelText="Cancel"
        isDestructive={confirmState.action === 'suspend' || confirmState.action === 'delete'}
      />
      {/* Side Drawer Overlay */}
      {selectedTenant && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-background/50 backdrop-blur-sm transition-all"
          onClick={() => setSelectedTenant(null)}
        >
          <div 
            className="w-full max-w-md bg-surface border-l border-text-secondary/10 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-text-secondary/10 flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold text-foreground flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Tenant Details
              </h2>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-2 text-text-secondary hover:text-foreground rounded-full hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Org Details */}
              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Organization Profile</h3>
                <div className="bg-background rounded-xl p-4 border border-text-secondary/10 space-y-4 shadow-sm">
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Name</div>
                    <div className="font-semibold text-foreground">{selectedTenant.name}</div>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Code / PSGC</div>
                      <div className="font-medium text-foreground">{selectedTenant.code}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary mb-1">Level</div>
                      <div className="font-medium text-foreground capitalize">{selectedTenant.level}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Registered On</div>
                    <div className="font-medium text-foreground">{format(new Date(selectedTenant.createdAt), "MMMM d, yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Status</div>
                    <div className="mt-1">
                      {selectedTenant.status === "active" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>
                      ) : selectedTenant.status === "pending_setup" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Pending Setup</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Suspended</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* SysAdmin Details */}
              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">System Administrator</h3>
                <div className="bg-background rounded-xl p-4 border border-text-secondary/10 space-y-4 shadow-sm">
                  <div>
                    <div className="text-xs text-text-secondary mb-1">Appointed Email</div>
                    <div className="font-medium text-foreground flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                      {selectedTenant.sysAdminEmail || "Not specified"}
                    </div>
                  </div>

                  {selectedTenant.status === "pending_setup" && selectedTenant.registrationKey && (
                    <div className="border-t border-text-secondary/10 pt-4 mt-4">
                      <div className="text-xs text-amber-600 font-medium mb-3 flex items-center">
                        <Activity className="w-4 h-4 mr-1.5" />
                        Pending Initial Setup
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-text-secondary mb-1">Registration Key</div>
                          <div className="flex items-center justify-between bg-surface p-2 rounded border border-text-secondary/10">
                            <code className="text-xs font-mono text-foreground truncate w-48">{selectedTenant.registrationKey}</code>
                            <button
                              onClick={() => copyToClipboard(selectedTenant.registrationKey!)}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            >
                              {copiedKey === selectedTenant.registrationKey ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-text-secondary mb-1">Direct Setup Link</div>
                          <button
                            onClick={() => {
                              const link = `${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${selectedTenant.registrationKey}`;
                              copyToClipboard(link);
                            }}
                            className="w-full flex items-center justify-center px-3 py-2 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            {copiedKey === `${process.env.NEXT_PUBLIC_TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?registrationKey=${selectedTenant.registrationKey}` ? (
                              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Copied to Clipboard</>
                            ) : (
                              <><Copy className="w-4 h-4 mr-1.5" /> Copy Setup Link</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-text-secondary/10 bg-background/50 space-y-3">
              {selectedTenant.status === "active" || selectedTenant.status === "pending_setup" ? (
                <button
                  onClick={() => {
                    handleActionClick(selectedTenant.id, 'suspend');
                    setSelectedTenant(null);
                  }}
                  className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium rounded-xl transition-colors text-sm"
                >
                  Suspend Organization
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleActionClick(selectedTenant.id, 'activate');
                    setSelectedTenant(null);
                  }}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 font-medium rounded-xl transition-colors text-sm"
                >
                  Restore Organization
                </button>
              )}
              <button
                onClick={() => {
                  handleActionClick(selectedTenant.id, 'delete');
                  setSelectedTenant(null);
                }}
                className="w-full py-2.5 bg-transparent border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors text-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
