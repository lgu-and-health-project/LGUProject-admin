import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PsgcLocations } from '@prisma/client';
import Fuse from 'fuse.js';

// Shape returned by the official PSA PSGC API (classification.psa.gov.ph).
interface PsaApiRecord {
  psgc_code: string;
  area_name: string;
  correspondence_code: string;
  geographic_level: string; // "Reg" | "Prov" | "City" | "Mun" | "SubMun" | "Bgy"
  city_class?: string;
  version?: string;
}

/**
 * These are intentionally NOT top-level `const`s reading process.env
 * directly. That was the actual bug: reading process.env at module-import
 * time happens WHILE Nest is still resolving the module graph - before
 * ConfigModule.forRoot() (in app.module.ts) has actually loaded .env into
 * process.env. PSGC_API_TOKEN was being frozen as an empty string on every
 * boot, permanently, no matter what .env actually contained - which is
 * exactly why PSA's error was "Token is required." Reading these lazily,
 * at the moment a request is made, means the app has fully booted and
 * .env is genuinely loaded by then.
 */
function getEnv(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

let hasCheckedEnv = false;
function detectHiddenWhitespace(name: string, raw: string | undefined): void {
  if (!raw) return;
  if (raw !== raw.trim()) {
    const codes = [...raw]
      .filter((c) => c.trim() === '' || c.charCodeAt(0) < 32)
      .map((c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
    // eslint-disable-next-line no-console
    console.warn(
      `[PsgcService] WARNING: env var ${name} has leading/trailing whitespace ` +
        `or control characters (${codes.join(', ')}). Now trimmed automatically, ` +
        `but fix the .env file itself (re-save as UTF-8/LF) to be safe.`,
    );
  }
}
/** Runs once, on the FIRST real request (not at import time), so it
 * actually reflects what .env loaded rather than a pre-boot snapshot. */
function checkEnvOnce(): void {
  if (hasCheckedEnv) return;
  hasCheckedEnv = true;
  detectHiddenWhitespace('PSGC_API_BASE', process.env.PSGC_API_BASE);
  detectHiddenWhitespace('PSGC_API_TOKEN', process.env.PSGC_API_TOKEN);
  detectHiddenWhitespace('PSGC_VERSION', process.env.PSGC_VERSION);
  if (!process.env.PSGC_API_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn(
      '[PsgcService] WARNING: PSGC_API_TOKEN is not set. Every PSA API request will fail with "Token is required."',
    );
  }
}

/** Page size per request. Kept conservative - large page sizes are more
 * likely to make a government server time out or 500 on a big level
 * like barangays (~42,000 records). */
const PAGE_SIZE = 500;

/** Delay between consecutive page requests, to stay well under any
 * undocumented rate limit on the PSA server. */
const REQUEST_DELAY_MS = 400;

/** Retry policy for a single page fetch. Exponential backoff:
 * 1s, 2s, 4s, 8s between attempts. */
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 1000;

/** Abort a single request if the server hasn't responded within this long -
 * without this, a stalled connection just hangs forever instead of
 * failing fast and retrying. */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Rough, published estimates of how many records exist per PSGC level.
 * The PSA API does not document a `count` field, so we can't ask it for
 * the true total up front. These are ONLY used to render an approximate
 * progress percentage in the UI - they never drive stopping/pagination
 * logic, which is based purely on "did this page come back empty".
 * Safe to nudge these if PSA's actual counts drift over time.
 */
const ESTIMATED_TOTALS: Record<string, number> = {
  regions: 18,
  provinces: 100, // includes HUC/ICC codes that occupy the province tier
  municipalities: 1650, // includes cities
  barangays: 42046,
};

const SYNC_ORDER = [
  'regions',
  'provinces',
  'municipalities',
  'barangays',
] as const;

@Injectable()
export class PsgcService {
  private readonly logger = new Logger(PsgcService.name);
  private listCache = new Map<string, PsaApiRecord[]>();
  private cancelFlags = new Set<string>();
  
  private fuseCache: Fuse<any> | null = null;
  private isBuildingFuseCache = false;

  constructor(private prisma: PrismaService) {}

  // ─── Public lookup API (unchanged surface) ────────────────────────────

  async resolveByCode(code: string): Promise<PsgcLocations> {
    const trimmed = code.trim();
    const cached = await this.prisma.psgcLocations.findUnique({
      where: { code: trimmed },
    });
    if (cached) return cached;
    return this.fetchAndCache(trimmed);
  }

  async findChildren(parentCode: string, strict: boolean = false): Promise<PsgcLocations[]> {
    const parent = await this.prisma.psgcLocations.findUnique({
      where: { code: parentCode.trim() },
    });
    if (!parent) return [];
    
    const parentField = strict ? 'parentId' : 'geographicParentId';
    return this.prisma.psgcLocations.findMany({
      where: { [parentField]: parent.psgcLocationId },
      orderBy: { areaName: 'asc' },
    });
  }

  async findByLevel(
    level: string,
    parentCode?: string,
    strict: boolean = false,
  ): Promise<PsgcLocations[]> {
    const where: Record<string, unknown> = { level };
    if (parentCode) {
      const parent = await this.prisma.psgcLocations.findUnique({
        where: { code: parentCode.trim() },
      });
      if (!parent) return [];
      
      if (strict) {
        where.parentId = parent.psgcLocationId;
      } else {
        where.geographicParentId = parent.psgcLocationId;
      }
    }
    return this.prisma.psgcLocations.findMany({
      where,
      orderBy: { areaName: 'asc' },
    });
  }

  private async buildFuzzyCache() {
    if (this.fuseCache || this.isBuildingFuseCache) return;
    this.isBuildingFuseCache = true;
    try {
      this.logger.log('Building PSGC fuzzy search cache in memory...');
      const records = await this.prisma.psgcLocations.findMany();
      const map = new Map<string, any>();
      for (const r of records) map.set(r.psgcLocationId, r);
      
      const docs = records.map(r => {
        let address = r.areaName;
        let curr = r;
        while (curr.parentId) {
          curr = map.get(curr.parentId);
          if (!curr) break;
          if (curr.level !== 'region') address += ', ' + curr.areaName;
        }
        return { ...r, fullAddress: address };
      });
      
      this.fuseCache = new Fuse(docs, { 
        keys: ['fullAddress'],
        threshold: 0.5,
        ignoreLocation: true,
        findAllMatches: true,
      });
      this.logger.log(`Fuzzy cache built with ${docs.length} locations.`);
    } catch (err) {
      this.logger.error('Failed to build fuzzy cache', err);
    } finally {
      this.isBuildingFuseCache = false;
    }
  }

  async searchByName(query: string): Promise<PsgcLocations[]> {
    if (!query || query.trim().length < 2) return [];
    
    if (!this.fuseCache) {
      // First search triggers the cache build, wait for it if not too long, 
      // or we can just await it since it takes < 1 second.
      await this.buildFuzzyCache();
    }
    
    // If cache still isn't available for some reason, fallback to original query
    if (!this.fuseCache) {
      return this.prisma.psgcLocations.findMany({
        where: { areaName: { contains: query.trim(), mode: 'insensitive' } },
        orderBy: { areaName: 'asc' },
        take: 50,
        include: { parent: { include: { parent: { include: { parent: true } } } } },
      });
    }

    const results = this.fuseCache.search(query.trim(), { limit: 50 });
    const ids = results.map(r => r.item.psgcLocationId);
    
    if (ids.length === 0) return [];

    const dbRecords = await this.prisma.psgcLocations.findMany({
      where: { psgcLocationId: { in: ids } },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    // Return in the exact order scored by Fuse.js
    return ids
      .map(id => dbRecords.find(r => r.psgcLocationId === id))
      .filter((r): r is typeof dbRecords[0] => r !== undefined);
  }

  // ─── Bulk sync ──────────────────────────────────────────────────────

  async startSync(actorId: string, force = false): Promise<string> {
    checkEnvOnce();
    const psgcVersion = getEnv('PSGC_VERSION', 'Q2_2024');

    const existing = await this.prisma.psgcSyncLogs.findFirst({
      where: { status: 'IN_PROGRESS' },
    });
    if (existing) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (existing.startedAt < thirtyMinutesAgo) {
        // Recover from a stuck sync
        await this.prisma.psgcSyncLogs.update({
          where: { syncId: existing.syncId },
          data: { status: 'FAILED', errorDetails: 'Timed out (stuck in progress)' },
        });
      } else {
        return existing.syncId;
      }
    }

    const log = await this.prisma.psgcSyncLogs.create({
      data: { psgcVersion, status: 'IN_PROGRESS' },
    });

    this.runSync(log.syncId, actorId, force).catch((err) => {
      this.logger.error(`Background sync failed: ${(err as Error).message}`);
    });

    return log.syncId;
  }

  async cancelSync(): Promise<{ message: string }> {
    const existingLogs = await this.prisma.psgcSyncLogs.findMany({
      where: { status: 'IN_PROGRESS' },
    });
    if (existingLogs.length === 0) return { message: 'No sync in progress.' };

    for (const log of existingLogs) {
      this.cancelFlags.add(log.syncId);
      await this.prisma.psgcSyncLogs.update({
        where: { syncId: log.syncId },
        data: {
          status: 'FAILED',
          errorDetails: 'Canceled by user',
          completedAt: new Date(),
        },
      });
    }
    return { message: 'Sync cancellation requested.' };
  }

  private async runSync(syncId: string, _actorId: string, force: boolean) {
    const psgcVersion = getEnv('PSGC_VERSION', 'Q2_2024');
    let total = 0;
    try {
      // Skip levels that are already fully populated locally for this
      // version - makes a RETRY after a failure cheap instead of
      // re-downloading everything from PSA again.
      for (const level of SYNC_ORDER) {
        if (this.cancelFlags.has(syncId)) throw new Error('Canceled by user');

        const alreadyHave = await this.prisma.psgcLocations.count({
          where: {
            level: this.singularLevel(level),
            psgcVersion,
          },
        });
        const estimate = ESTIMATED_TOTALS[level];

        if (!force && alreadyHave >= estimate * 0.98) {
          this.logger.log(
            `Skipping ${level} - already have ${alreadyHave}/${estimate} locally for ${psgcVersion}.`,
          );
          total += alreadyHave;
          await this.updateProgress(syncId, total);
          continue;
        }

        let levelCount = alreadyHave;
        await this.fetchLevelPaginated(level, syncId, async (records) => {
          for (const record of records) {
            if (this.cancelFlags.has(syncId))
              throw new Error('Canceled by user');
            await this.upsertFromPsa(record);
            levelCount++;
            total++;
          }
          await this.updateProgress(syncId, total);
        });

        this.logger.log(`Synced level ${level}: ${levelCount} records.`);
      }

      await this.linkOrphanedParents(psgcVersion);

      await this.prisma.psgcSyncLogs.update({
        where: { syncId },
        data: { status: 'COMPLETED', progress: total, completedAt: new Date() },
      });
      this.listCache.clear();
    } catch (error) {
      if ((error as Error).message !== 'Canceled by user') {
        await this.prisma.psgcSyncLogs.update({
          where: { syncId },
          data: {
            status: 'FAILED',
            errorDetails: (error as Error).message,
            completedAt: new Date(),
          },
        });
      }
      throw error;
    } finally {
      this.cancelFlags.delete(syncId);
    }
  }

  private async updateProgress(syncId: string, progress: number) {
    await this.prisma.psgcSyncLogs.update({
      where: { syncId },
      data: { progress },
    });
  }

  async getSyncStatus() {
    const log = await this.prisma.psgcSyncLogs.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    return log ? this.withEstimatedTotal(log) : null;
  }

  async getSyncHistory() {
    const logs = await this.prisma.psgcSyncLogs.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
    return logs.map((l) => this.withEstimatedTotal(l));
  }

  /** Grand total across all levels, for the progress bar percentage. */
  private get grandTotalEstimate(): number {
    return Object.values(ESTIMATED_TOTALS).reduce((a, b) => a + b, 0);
  }

  private withEstimatedTotal<T extends { progress: number }>(log: T) {
    return { ...log, estimatedTotal: this.grandTotalEstimate };
  }

  // ─── Single-code fallback (on-demand lookups) ─────────────────────────

  private async fetchAndCache(code: string): Promise<PsgcLocations> {
    checkEnvOnce();
    const endpoint = this.endpointForCode(code);
    const allRecords: PsaApiRecord[] = [];
    await this.fetchLevelPaginated(endpoint, undefined, async (records) => {
      allRecords.push(...records);
    });
    const record = allRecords.find((r) => r.psgc_code === code || (r as any).code === code);

    if (!record) {
      throw new BadRequestException(`'${code}' is not a recognized PSGC code.`);
    }
    return this.upsertFromPsa(record);
  }

  // ─── PSA record → local DB ────────────────────────────────────────────

  /**
   * Inserts a record WITHOUT resolving its parent over the network.
   * Parent linking happens in linkOrphanedParents() as a local-only pass
   * after the whole sync finishes - this is what fixes the freeze that
   * used to happen here: some codes (HUC/ICC cities occupying a
   * "province slot" in the numbering, e.g. Baguio-style codes) have a
   * fabricated parent code that doesn't correspond to any real PSA
   * record. Trying to resolve it via resolveByCode() mid-sync used to
   * trigger a full re-fetch of the entire parent level from PSA, over
   * and over, for every such code - silently, with no error and no log
   * line, which is exactly what looked like a stall.
   */
  private async upsertFromPsa(record: PsaApiRecord): Promise<PsgcLocations> {
    const fixedAreaName = this.fixEncoding(record.area_name);
    const normalizedLevel = this.normalizeLevel(record.geographic_level);
    const normalizedCityClass = this.normalizeCityClass(record.city_class) ?? undefined;
    
    // PSA API sometimes returns "code" instead of "psgc_code"
    const actualCode = record.psgc_code || (record as any).code;
    
    if (!actualCode) {
      this.logger.error(`Skipping record with no code: ${JSON.stringify(record)}`);
      throw new BadRequestException('PSA record is missing psgc_code or code');
    }

    return this.prisma.psgcLocations.upsert({
      where: { code: actualCode },
      update: {
        areaName: fixedAreaName,
        level: normalizedLevel,
        cityClassification: normalizedCityClass,
      },
      create: {
        code: actualCode,
        psgcVersion: record.version || getEnv('PSGC_VERSION', 'Q2_2024'),
        areaName: fixedAreaName,
        level: normalizedLevel,
        cityClassification: normalizedCityClass,
        parentId: undefined, // linked in linkOrphanedParents()
      },
    });
  }

  /**
   * Local-only pass: links every record's parentId by looking up its
   * naively-derived parent code in the DB (no network calls at all).
   * If that lookup fails - which happens for HUC/ICC cities whose code
   * sits in a "province slot" with no real province behind it - falls
   * back to linking directly to the region instead of leaving it
   * orphaned. Runs once, after all four levels have been fully
   * downloaded, so every real parent is guaranteed to already be local.
   */
  private async linkOrphanedParents(psgcVersion: string): Promise<void> {
    const unlinked = await this.prisma.psgcLocations.findMany({
      where: {
        psgcVersion,
        OR: [
          { parentId: null },
          { geographicParentId: null },
        ],
        level: { not: 'region' }, // regions have no parent by design
      },
    });

    this.logger.log(`Linking parents for ${unlinked.length} records...`);
    let linkedNormal = 0;
    let linkedFallback = 0;
    let stillOrphaned = 0;

    for (const loc of unlinked) {
      const naiveParentCode = this.deriveParentCode(loc.code, this.levelToPsaCode(loc.level));
      if (!naiveParentCode) continue;

      let strictParent = await this.prisma.psgcLocations.findUnique({
        where: { code: naiveParentCode },
      });

      // Circular reference protection for HUCs
      if (strictParent && strictParent.psgcLocationId === loc.psgcLocationId) {
        strictParent = null;
      }

      if (strictParent) {
        await this.prisma.psgcLocations.update({
          where: { psgcLocationId: loc.psgcLocationId },
          data: { 
            parentId: strictParent.psgcLocationId,
            geographicParentId: strictParent.psgcLocationId,
          },
        });
        linkedNormal++;
      } else {
        // Strict parent falls back to region (HUCs / ICCs / NCR)
        const regionCode = loc.code.slice(0, 2) + '00000000';
        const regionParent = await this.prisma.psgcLocations.findUnique({
          where: { code: regionCode },
        });

        if (regionParent) {
          // Geographic parent checks mapping first (e.g. Iloilo City -> Iloilo Province)
          const geographicProvinceCode = this.getGeographicProvinceForHuc(loc.code);
          let geographicParent: any = null;
          
          if (geographicProvinceCode) {
            geographicParent = await this.prisma.psgcLocations.findUnique({
              where: { code: geographicProvinceCode },
            });
          }

          await this.prisma.psgcLocations.update({
            where: { psgcLocationId: loc.psgcLocationId },
            data: { 
              parentId: regionParent.psgcLocationId,
              geographicParentId: geographicParent ? geographicParent.psgcLocationId : regionParent.psgcLocationId,
            },
          });
          linkedFallback++;
        } else {
          stillOrphaned++;
          this.logger.warn(
            `Could not link parent for ${loc.code} (${loc.areaName}) - no province or region match found.`,
          );
        }
      }
    }

    this.logger.log(
      `Parent linking done: ${linkedNormal} linked normally, ${linkedFallback} fell back (province map/region), ${stillOrphaned} still unresolved.`,
    );
  }

  /** Reverse of normalizeLevel() - needed because deriveParentCode()
   * expects the PSA-style level code, not our normalized lowercase one. */
  private levelToPsaCode(level: string): string {
    const map: Record<string, string> = {
      barangay: 'Bgy',
      city: 'Mun',
      municipality: 'Mun',
      province: 'Prov',
      region: 'Reg',
    };
    return map[level] ?? level;
  }

  // ─── Hierarchy helpers ────────────────────────────────────────────────

  private deriveParentCode(code: string, level: string): string | null {
    const normalized = this.normalizeLevel(level);
    if (normalized === 'barangay') return code.slice(0, 7) + '000';
    if (normalized === 'city' || normalized === 'municipality') {
      return code.slice(0, 5) + '00000';
    }
    if (normalized === 'province') return code.slice(0, 2) + '00000000';
    return null;
  }

  private getGeographicProvinceForHuc(cityCode: string): string | null {
    const mapping: Record<string, string> = {
      '0330100000': '0305400000', // Angeles -> Pampanga
      '1830200000': '1804500000', // Bacolod -> Negros Occ
      '1430300000': '1401100000', // Baguio -> Benguet
      '1630400000': '1600200000', // Butuan -> Agusan del Norte
      '1030500000': '1004300000', // Cagayan De Oro -> Misamis Or
      '0730600000': '0702200000', // Cebu City -> Cebu
      '1908703000': '1908700000', // Cotabato -> Maguindanao del Norte
      '0105518000': '0105500000', // Dagupan -> Pangasinan
      '1130700000': '1102400000', // Davao City -> Davao del Sur
      '1230800000': '1206300000', // GenSan -> South Cotabato
      '1030900000': '1003500000', // Iligan -> Lanao del Norte
      '0631000000': '0603000000', // Iloilo City -> Iloilo
      '0731100000': '0702200000', // Lapu-Lapu -> Cebu
      '0431200000': '0405600000', // Lucena -> Quezon
      '0731300000': '0702200000', // Mandaue -> Cebu
      '0501724000': '0501700000', // Naga -> Camarines Sur
      '0331400000': '0307100000', // Olongapo -> Zambales
      '1731500000': '1705300000', // Puerto Princesa -> Palawan
      '0203135000': '0203100000', // Santiago -> Isabela
      '0831600000': '0803700000', // Tacloban -> Leyte
      '0931700000': '0907300000', // Zamboanga City -> Zamboanga del Sur
      '0803738000': '0803700000', // Ormoc -> Leyte
    };
    return mapping[cityCode] || null;
  }

  private singularLevel(endpointLevel: string): string {
    const map: Record<string, string> = {
      regions: 'region',
      provinces: 'province',
      municipalities: 'municipality', // NOTE: matches most rows; cities are
      // stored as level='city' separately - see normalizeLevel(). The
      // count check in runSync intentionally undercounts slightly for
      // "municipalities" because of this, which only makes the skip
      // check MORE conservative (re-fetches rather than wrongly skips).
      barangays: 'barangay',
    };
    return map[endpointLevel] ?? endpointLevel;
  }

  private normalizeLevel(raw: string): string {
    const map: Record<string, string> = {
      Reg: 'region',
      Prov: 'province',
      City: 'city',
      Mun: 'municipality',
      SubMun: 'municipality',
      Bgy: 'barangay',
    };
    return map[raw] ?? raw.toLowerCase();
  }

  private fixEncoding(str: string): string {
    if (!str) return str;
    // Fix PSA API UTF-8 Mojibake issues (ISO-8859-1 corruption)
    return str
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã‘/g, 'Ñ');
  }

  private normalizeCityClass(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const map: Record<string, string> = {
      HUC: 'HUC',
      ICC: 'ICC',
      CC: 'COMPONENT_CITY',
    };
    return map[raw];
  }

  private endpointForCode(code: string): string {
    const padded = code.padEnd(10, '0');
    if (padded.slice(7) !== '000') return 'barangays';
    if (padded.slice(4, 7) !== '000') return 'municipalities';
    if (padded.slice(2, 4) !== '00') return 'provinces';
    return 'regions';
  }

  // ─── PSA API HTTP layer ───────────────────────────────────────────────

  /**
   * Fetches ALL pages of a level, explicitly driving pagination with our
   * own page/page_size params rather than trusting an undocumented `next`
   * field. Stops the moment a page comes back with fewer records than
   * page_size - the only stopping condition we actually rely on, so it
   * works regardless of whatever pagination metadata (or lack of it) PSA
   * actually returns.
   *
   * `onPage` is called incrementally per page so callers (runSync) can
   * persist progress without waiting for the entire level to download.
   */
  private async fetchLevelPaginated(
    endpoint: string,
    syncId: string | undefined,
    onPage: (records: PsaApiRecord[]) => Promise<void>,
  ): Promise<void> {
    checkEnvOnce();
    const cached = this.listCache.get(endpoint);
    if (cached) {
      await onPage(cached);
      return;
    }

    const apiBase = getEnv('PSGC_API_BASE', 'https://classification.psa.gov.ph/psgc');
    const apiToken = getEnv('PSGC_API_TOKEN');
    const psgcVersion = getEnv('PSGC_VERSION', 'Q2_2024');

    let page = 1;
    const collected: PsaApiRecord[] = [];

    while (true) {
      if (syncId && this.cancelFlags.has(syncId))
        throw new Error('Canceled by user');

      const url = `${apiBase}/${psgcVersion}/${endpoint}?token=${apiToken}&page=${page}&page_size=${PAGE_SIZE}`;
      const records = await this.fetchPageWithRetry(url, syncId);

      if (records.length === 0) break; // definitive end-of-data signal

      await onPage(records);
      collected.push(...records);

      if (records.length < PAGE_SIZE) break; // last page was partial - done

      page++;
      await this.delay(REQUEST_DELAY_MS);
    }

    this.listCache.set(endpoint, collected);
  }

  /**
   * Fetches one page with retry + exponential backoff, so a single
   * transient failure (timeout, 500, network blip) doesn't abort the
   * entire multi-thousand-record sync - only exhausting all retries does.
   * Client errors (4xx except 429) are deterministic and NOT retried -
   * they fail on the first attempt with PSA's actual error body surfaced.
   */
  private async fetchPageWithRetry(
    url: string,
    syncId?: string,
  ): Promise<PsaApiRecord[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `Retry ${attempt}/${MAX_RETRIES} for ${url.split('?')[0]} after ${backoff}ms...`,
        );
        await this.delay(backoff);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (syncId) {
          await this.prisma.psgcSyncLogs
            .update({
              where: { syncId },
              data: { trafficUsage: { increment: 1 } },
            })
            .catch(() => undefined);
        }

        if (res.status === 429) {
          lastError = new Error('Rate limited (429) by PSA API');
          await this.delay(BASE_BACKOFF_MS * 4);
          continue;
        }

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '');
          const message = `HTTP ${res.status} ${res.statusText}${bodyText ? ` - ${bodyText.slice(0, 500)}` : ''}`;

          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            this.logger.error(
              `Non-retryable ${res.status} from PSA API: ${message}`,
            );
            throw new BadRequestException(
              `PSA API rejected the request (${res.status}): ${bodyText || res.statusText}`,
            );
          }

          lastError = new Error(message);
          continue;
        }

        const json = await res.json();
        return this.extractRecords(json);
      } catch (err) {
        clearTimeout(timeout);

        if (err instanceof BadRequestException) {
          throw err;
        }

        lastError =
          err instanceof Error && err.name === 'AbortError'
            ? new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)
            : (err as Error);
      }
    }

    this.logger.error(
      `Giving up on ${url.split('?')[0]} after ${MAX_RETRIES} retries: ${lastError?.message}`,
    );
    throw new BadRequestException(
      `Could not fetch PSGC data from the PSA API after ${MAX_RETRIES} retries: ${lastError?.message}`,
    );
  }

  private extractRecords(json: unknown): PsaApiRecord[] {
    if (Array.isArray(json)) return json as PsaApiRecord[];
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results as PsaApiRecord[];
      const results = obj.results as Record<string, unknown> | undefined;
      if (results && Array.isArray(results.psgc_data)) {
        return results.psgc_data as PsaApiRecord[];
      }
      if (Array.isArray(obj.data)) return obj.data as PsaApiRecord[];
    }
    this.logger.warn(
      `Unrecognized PSA response shape: ${JSON.stringify(json).slice(0, 200)}`,
    );
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
