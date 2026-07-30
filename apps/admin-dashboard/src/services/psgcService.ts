import { fetchApi } from "./apiClient";

/**
 * A single PSGC location as returned by our admin-api REST endpoints.
 * The admin-api stores these in the PsgcLocations table after syncing
 * from the official PSA API.
 */
export interface PsgcLocation {
  code: string;
  name: string;
  level: string;
  cityClassification?: string | null;
}

/**
 * Formatted PSGC option for dropdown/search display in the tenant
 * creation modal. Matches the shape the tenants page already expects.
 */
export interface PsgcOption {
  code: string;
  name: string;
  level: string;
  subtext: string;
}

export interface SyncStatusData {
  syncId: string;
  psgcVersion: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  totalRecords: number;
  trafficUsage: number;
  startedAt: string;
  completedAt?: string | null;
  errorDetails?: string | null;
  /** Approximate expected grand total across all levels, computed
   * server-side from published PSA figures. Used only to render the
   * progress percentage - not an exact count, since the PSA API doesn't
   * document a way to ask for the true total up front. */
  estimatedTotal: number;
}

/** Map raw API response to the standard PsgcLocation shape. */
function mapLocation(raw: any): PsgcLocation {
  return {
    code: raw.code,
    name: raw.areaName,
    level: raw.level,
    cityClassification: raw.cityClassification ?? null,
  };
}

/**
 * PSGC service — talks to the admin-api REST `/psgc/*` endpoints.
 *
 * These endpoints are NOT tRPC — they're regular NestJS controllers
 * because the PSGC module was added separately from the tRPC migration.
 */
export const psgcService = {
  /** Fetch all locally-cached regions. */
  getRegions: async (): Promise<PsgcLocation[]> => {
    const data = await fetchApi<any[]>("/psgc/regions");
    return data.map(mapLocation);
  },

  /** Fetch all provinces, optionally filtered by parent region code. */
  getProvinces: async (regionCode?: string): Promise<PsgcLocation[]> => {
    const query = regionCode ? `?regionCode=${regionCode}` : "";
    const data = await fetchApi<any[]>(`/psgc/provinces${query}`);
    return data.map(mapLocation);
  },

  /** Fetch all municipalities, optionally filtered by parent province code. */
  getMunicipalities: async (
    provinceCode?: string
  ): Promise<PsgcLocation[]> => {
    const query = provinceCode ? `?provinceCode=${provinceCode}` : "";
    const data = await fetchApi<any[]>(`/psgc/municipalities${query}`);
    return data.map(mapLocation);
  },

  /** Fetch all cities, optionally filtered by parent province code. */
  getCities: async (provinceCode?: string): Promise<PsgcLocation[]> => {
    const query = provinceCode ? `?provinceCode=${provinceCode}` : "";
    const data = await fetchApi<any[]>(`/psgc/cities${query}`);
    return data.map(mapLocation);
  },

  /** Fetch all barangays, optionally filtered by parent municipality code. */
  getBarangays: async (
    municipalityCode?: string
  ): Promise<PsgcLocation[]> => {
    const query = municipalityCode
      ? `?municipalityCode=${municipalityCode}`
      : "";
    const data = await fetchApi<any[]>(`/psgc/barangays${query}`);
    return data.map(mapLocation);
  },

  /**
   * Server-side search across all locally-cached locations by name.
   * Returns up to 50 results. Minimum query length is 2 characters.
   */
  search: async (query: string): Promise<PsgcOption[]> => {
    if (!query || query.trim().length < 2) return [];
    const data = await fetchApi<any[]>(
      `/psgc/search?q=${encodeURIComponent(query.trim())}`
    );
    return data.map((raw) => {
      const baseSubtext = formatSubtext(raw.level, raw.cityClassification);
      const address = buildAddress(raw);
      return {
        code: raw.code,
        name: raw.areaName,
        level: raw.level,
        subtext: address ? `${baseSubtext}, ${address}` : baseSubtext,
      };
    });
  },

  /** Look up a single PSGC code. Returns cached data or fetches from PSA on miss. */
  lookup: async (code: string): Promise<PsgcLocation | null> => {
    try {
      const data = await fetchApi<any>(`/psgc/lookup/${code}`);
      return mapLocation(data);
    } catch {
      return null;
    }
  },

  /** Trigger a full PSGC sync from the PSA API (ROOT_SUPERADMIN only). */
  sync: async (): Promise<{ message: string; syncId: string }> => {
    return fetchApi("/psgc/sync", { method: "POST" });
  },

  /** Cancel an ongoing PSGC sync (ROOT_SUPERADMIN only). */
  cancelSync: async (): Promise<{ message: string }> => {
    return fetchApi("/psgc/sync/cancel", { method: "POST" });
  },

  /** Get the most recent sync status (ROOT_SUPERADMIN only). */
  getSyncStatus: async (): Promise<SyncStatusData | null> => {
    return fetchApi("/psgc/sync/status", { cache: "no-store" });
  },

  /** Get the history of past syncs (ROOT_SUPERADMIN only). */
  getSyncHistory: async (): Promise<SyncStatusData[]> => {
    return fetchApi("/psgc/sync/history", { cache: "no-store" });
  },

  /**
   * Fetch all locations across all levels and format them for the
   * tenant creation search dropdown. Uses our own backend endpoints
   * instead of external PSGC APIs.
   */
  getAllLocations: async (): Promise<PsgcOption[]> => {
    const [regions, provinces, municipalities, cities, barangays] =
      await Promise.all([
        psgcService.getRegions(),
        psgcService.getProvinces(),
        psgcService.getMunicipalities(),
        psgcService.getCities(),
        psgcService.getBarangays(),
      ]);

    const options: PsgcOption[] = [];

    for (const r of regions) {
      options.push({
        code: r.code,
        name: r.name,
        level: "region",
        subtext: "Region",
      });
    }

    for (const p of provinces) {
      options.push({
        code: p.code,
        name: p.name,
        level: "province",
        subtext: "Province",
      });
    }

    for (const m of municipalities) {
      options.push({
        code: m.code,
        name: m.name,
        level: "municipality",
        subtext: "Municipality",
      });
    }

    for (const c of cities) {
      const cityType = classifyCity(c.cityClassification);
      options.push({
        code: c.code,
        name: c.name,
        level: cityType,
        subtext: `City (${cityType.replace("city_", "").toUpperCase()})`,
      });
    }

    for (const b of barangays) {
      options.push({
        code: b.code,
        name: b.name,
        level: "barangay",
        subtext: "Barangay",
      });
    }

    return options;
  },
};

/** Map city classification to the level key the tenants page uses for filtering. */
function classifyCity(classification?: string | null): string {
  switch (classification) {
    case "HUC":
      return "city_huc";
    case "ICC":
      return "city_icc";
    case "COMPONENT_CITY":
      return "city_component";
    default:
      return "city_component";
  }
}

/** Format a human-readable subtext string for display in dropdowns. */
function formatSubtext(level: string, cityClassification?: string | null): string {
  switch (level) {
    case "region":
      return "Region";
    case "province":
      return "Province";
    case "city":
      return cityClassification
        ? `City (${cityClassification})`
        : "City";
    case "municipality":
      return "Municipality";
    case "barangay":
      return "Barangay";
    default:
      return level;
  }
}

/** Construct a full address string from nested parent hierarchy (e.g., Province, Region) */
function buildAddress(raw: any): string {
  const parts: string[] = [];
  let current = raw.parent;
  while (current) {
    // Stop at region, and prevent any duplicate names in the hierarchy
    if (current.level !== "region" && !parts.includes(current.areaName)) {
      parts.push(current.areaName);
    }
    current = current.parent;
  }
  return parts.length > 0 ? parts.join(", ") : "";
}
