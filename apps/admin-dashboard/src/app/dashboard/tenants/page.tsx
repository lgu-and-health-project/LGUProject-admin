"use client";

import { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import Fuse from "fuse.js";
import { format } from "date-fns";
import { tenantService, Tenant } from "@/services/tenantService";
import { psgcService, PsgcOption } from "@/services/psgcService";
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
  ChevronDown,
  Server,
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { ProvisionDeviceModal } from "./ProvisionDeviceModal";
import { ReplaceHardwareModal } from "./ReplaceHardwareModal";
import { EditSerialModal } from "./EditSerialModal";



export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['province', 'city_huc', 'city_icc', 'city_component', 'municipality', 'barangay']);
  const [locationRegion, setLocationRegion] = useState("");
  const [locationProvince, setLocationProvince] = useState("");
  const [regionsData, setRegionsData] = useState<any[]>([]);
  const [provincesData, setProvincesData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    psgcService.getRegions().then(regions => setRegionsData(regions.map(r => ({ code: r.code, name: r.name, regionName: r.name })))).catch(()=>{});
    psgcService.getProvinces().then(provinces => setProvincesData(provinces.map(p => ({ code: p.code, name: p.name })))).catch(()=>{});
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isEditSerialModalOpen, setIsEditSerialModalOpen] = useState(false);
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
    psgcCode: "",
    name: "",
    level: "municipality",
    sysadminEmail: "",
  });

  const [psgcOptions, setPsgcOptions] = useState<PsgcOption[]>([]);
  const [psgcLoading, setPsgcLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(formData.name);
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.name]);

  useEffect(() => {
    let isMounted = true;

    const fetchSearch = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.trim().length < 2) {
        if (isMounted) setPsgcOptions([]);
        return;
      }

      setPsgcLoading(true);
      try {
        const results = await psgcService.search(debouncedSearchQuery);
        if (isMounted) setPsgcOptions(results);
      } catch (err) {
        console.error("Failed to fetch PSGC data", err);
        if (isMounted) setPsgcOptions([]);
      } finally {
        if (isMounted) setPsgcLoading(false);
      }
    };

    fetchSearch();

    return () => { isMounted = false; };
  }, [debouncedSearchQuery]);

  const searchResults = psgcOptions;

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await tenantService.getTenants();
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
      tenantService.getTenants()
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

    const existing = tenants.find(t => t.psgcCode === formData.psgcCode);
    if (existing) {
      toast.error(`The organization with code ${formData.psgcCode} is already registered!`);
      return;
    }

    setFormLoading(true);
    try {
      const response = await tenantService.createTenant({
        psgcCode: formData.psgcCode,
        sysadminEmail: formData.sysadminEmail,
      });
      setIsModalOpen(false);
      setFormData({
        psgcCode: "",
        name: "",
        level: "municipality",
        sysadminEmail: "",
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
        await tenantService.suspendTenant(idToSuspend);
        toast.success("Tenant suspended successfully!");
      } else if (action === 'activate') {
        await tenantService.activateTenant(idToSuspend);
        toast.success("Tenant reactivated successfully!");
      } else if (action === 'delete') {
        await tenantService.deleteTenant(idToSuspend);
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

  const fuse = useMemo(() => new Fuse(tenants, {
    keys: ["name", "psgcCode"],
    threshold: 0.5,
    ignoreLocation: true,
    findAllMatches: true,
  }), [tenants]);

  const filteredTenants = useMemo(() => {
    let result = tenants;
    if (searchQuery) {
      result = fuse.search(searchQuery).map(r => r.item);
    }
    return result.filter(t => {
      const matchesLevel = selectedLevels.includes(t.level);
      
      let matchesLocation = true;
      if (t.psgcCode) {
        if (locationProvince) {
          const provPrefix = locationProvince.replace(/0+$/, '');
          matchesLocation = t.psgcCode.startsWith(provPrefix);
        } else if (locationRegion) {
          const regPrefix = locationRegion.replace(/0+$/, '');
          matchesLocation = t.psgcCode.startsWith(regPrefix);
        }
      }

      return matchesLevel && matchesLocation;
    });
  }, [searchQuery, selectedLevels, locationRegion, locationProvince, tenants, fuse]);

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevels, locationRegion, locationProvince]);

  return (
    <div className="p-8 h-full flex flex-col relative w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Tenant Organizations
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Register and manage LGUs and their system administrators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                psgcCode: "",
                name: "",
                level: "municipality",
                sysadminEmail: "",
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
          <button
            onClick={() => setIsProvisionModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Server className="w-4 h-4 mr-2" />
            Provision & Bind Device
          </button>
        </div>
      </div>

      <div className="bg-surface p-4 rounded-t-2xl border border-b-0 border-text-secondary/10 flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full max-w-md">
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
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={locationRegion}
              onChange={(e) => { setLocationRegion(e.target.value); setLocationProvince(""); }}
              className="w-full sm:w-48 px-3 py-2 bg-background border border-text-secondary/20 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="">All Regions</option>
              {regionsData.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>

            {locationRegion && (
              <select
                value={locationProvince}
                onChange={(e) => setLocationProvince(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-background border border-text-secondary/20 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none cursor-pointer animate-in fade-in slide-in-from-right-4 duration-200"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                <option value="">All Provinces in Region</option>
                {provincesData.filter(p => p.regionCode === locationRegion).map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            )}

            {(locationRegion || locationProvince) && (
              <button
                onClick={() => { setLocationRegion(""); setLocationProvince(""); }}
                className="p-2 text-text-secondary hover:text-primary bg-background border border-text-secondary/20 rounded-lg transition-colors flex items-center justify-center shrink-0"
                title="Clear Location Filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-text-secondary/10">
          <span className="text-xs font-semibold text-text-secondary self-center mr-2 uppercase tracking-wider">LGU Levels:</span>
          {[
            { id: 'province', label: 'Province' },
            { id: 'city_huc', label: 'HUC' },
            { id: 'city_icc', label: 'ICC' },
            { id: 'city_component', label: 'Component City' },
            { id: 'municipality', label: 'Municipality' },
            { id: 'barangay', label: 'Barangay' },
          ].map(level => {
            const isSelected = selectedLevels.includes(level.id);
            return (
              <button
                key={level.id}
                onClick={() => {
                  if (isSelected) setSelectedLevels(selectedLevels.filter(l => l !== level.id));
                  else setSelectedLevels([...selectedLevels, level.id]);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  isSelected 
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                    : 'bg-background text-text-secondary border-text-secondary/20 hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {level.label}
              </button>
            )
          })}
          
          {selectedLevels.length < 7 && (
            <button
              onClick={() => setSelectedLevels(['province', 'city_huc', 'city_icc', 'city_component', 'municipality', 'barangay'])}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors border bg-background text-text-secondary border-text-secondary/20 hover:text-primary hover:border-primary/50 flex items-center ml-auto"
              title="Reset LGU Levels"
            >
              <X className="w-3 h-3 mr-1" />
              Reset Levels
            </button>
          )}
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
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="w-full min-w-[900px] divide-y divide-text-secondary/10 table-fixed">
              <thead className="bg-background/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[20%]">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">
                  System Administrator
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">
                  Bound Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">
                  Device Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">
                  Registered
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">
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
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3 font-semibold uppercase">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {t.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          Code: {t.psgcCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                      {
                        t.level === 'city_huc' ? 'HUC' :
                        t.level === 'city_icc' ? 'ICC' :
                        t.level === 'city_component' ? 'Component City' :
                        t.level
                      }
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
                      {t.sysadminEmail || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">
                      {t.device ? t.device.hardwareSerial : <span className="text-text-secondary italic">not yet bound</span>}
                    </span>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap">
                    {t.device ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        t.device.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        t.device.status === 'SUSPENDED' ? 'bg-red-100 text-red-800 border-red-200' :
                        t.device.status === 'DECOMMISSIONED' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {t.device.status.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
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

              </tbody>
            </table>
          </div>
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
                  Organization Name (Place)
                </label>
                <div className="relative" ref={dropdownRef}>
                  <input
                    required
                    type="text"
                    placeholder="Enter LGU name (e.g. City of Manila)..."
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
                              psgcCode: item.code,
                              level: item.level,
                            });
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="font-semibold text-foreground">
                            {item.name}
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {item.subtext}
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
                    value={isEditingCode ? draftCode : formData.psgcCode}
                    onChange={(e) => {
                      if (isEditingCode) setDraftCode(e.target.value);
                      else setFormData({ ...formData, psgcCode: e.target.value });
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
                            const found = psgcOptions.find(o => o.code === draftCode);
                            if (found) {
                               setFormData({ ...formData, psgcCode: draftCode, name: found.name, level: found.level });
                               toast.success(`Found: ${found.name}`);
                            } else {
                               toast.error("PSGC Code does not exist in the database.");
                            }
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
                          setDraftCode(formData.psgcCode);
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
                  Initial System Administrator Account
                </label>
                <p className="text-xs text-text-secondary mb-2">
                  This user will be authorized to appoint staff and configure
                  the LGU system.
                </p>
                <input
                  required
                  type="email"
                  placeholder="sysadmin@sanjuan.gov.ph"
                  value={formData.sysadminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, sysadminEmail: e.target.value })
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
                  <div className="text-xs font-semibold text-text-secondary mb-1 text-left">Setup Link (for System Administration)</div>
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
      <ProvisionDeviceModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        tenants={tenants.filter(t => !t.device)}
        onSuccess={loadTenants}
      />
      {selectedTenant?.device && (
        <>
          <ReplaceHardwareModal
            isOpen={isReplaceModalOpen}
            onClose={() => setIsReplaceModalOpen(false)}
            oldDeviceId={selectedTenant.device.id}
            onSuccess={() => { loadTenants(); setSelectedTenant(null); }}
          />
          <EditSerialModal
            isOpen={isEditSerialModalOpen}
            onClose={() => setIsEditSerialModalOpen(false)}
            deviceId={selectedTenant.device.id}
            initialSerial={selectedTenant.device.hardwareSerial || ""}
            onSuccess={() => { loadTenants(); setSelectedTenant(null); }}
          />
        </>
      )}
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
                      <div className="font-medium text-foreground">{selectedTenant.psgcCode}</div>
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
                      {selectedTenant.sysadminEmail || "Not specified"}
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

              {/* Device Details */}
              <section>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Bound Device Details</h3>
                {selectedTenant.device ? (
                  <div className="bg-background rounded-xl p-4 border border-text-secondary/10 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Hardware Serial</div>
                        <div className="font-medium text-foreground flex items-center">
                          <Server className="w-4 h-4 mr-2 text-primary" />
                          {selectedTenant.device.hardwareSerial || "Unknown"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">Status</div>
                        <div className="font-medium text-foreground capitalize">
                          {selectedTenant.device.status.toLowerCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-start pt-3 border-t border-text-secondary/10">
                      <div>
                        <div className="text-xs text-text-secondary mb-1">Agent Reachable</div>
                        <div className="font-medium text-foreground flex items-center">
                          {selectedTenant.device.agentReachable ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> : <X className="w-4 h-4 mr-2 text-red-500" />}
                          {selectedTenant.device.agentReachable ? "Yes" : "No"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">Backend Healthy</div>
                        <div className="font-medium text-foreground flex items-center justify-end">
                          {selectedTenant.device.backendHealthy ? "Yes" : "No"}
                          {selectedTenant.device.backendHealthy ? <CheckCircle2 className="w-4 h-4 ml-2 text-emerald-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-text-secondary/10">
                      <div className="text-xs text-text-secondary mb-1">Last Heartbeat</div>
                      <div className="font-medium text-foreground">
                        {selectedTenant.device.lastHeartbeatAt ? format(new Date(selectedTenant.device.lastHeartbeatAt), "MMM d, yyyy h:mm a") : "Never"}
                      </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                      {(selectedTenant.device.status === "PROVISIONED" || selectedTenant.device.status === "ASSIGNED") && (
                        <button
                          onClick={() => setIsEditSerialModalOpen(true)}
                          className="flex-1 py-2 bg-background border border-text-secondary/20 hover:bg-surface text-foreground font-medium rounded-lg text-sm transition-colors flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Serial
                        </button>
                      )}
                      {(selectedTenant.device.status === "ACTIVE" || selectedTenant.device.status === "SUSPENDED") && (
                        <button
                          onClick={() => setIsReplaceModalOpen(true)}
                          className="flex-1 py-2 bg-background border border-text-secondary/20 hover:bg-surface text-foreground font-medium rounded-lg text-sm transition-colors flex items-center justify-center"
                        >
                          <Server className="w-4 h-4 mr-2" />
                          Replace Hardware
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-background rounded-xl p-6 border border-text-secondary/10 flex flex-col items-center justify-center text-center shadow-sm">
                    <Server className="w-8 h-8 text-text-secondary/40 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">No Device Bound</p>
                    <p className="text-xs text-text-secondary mb-4">Provision a device to connect this organization's node.</p>
                    <button
                      onClick={() => { setSelectedTenant(null); setIsProvisionModalOpen(true); }}
                      className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      Provision & Bind
                    </button>
                  </div>
                )}
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
