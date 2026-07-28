import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PsgcLocations } from '@prisma/client';

// Shape returned by the free PSGC API (psgc.cloud). Adjust field names here
// if you switch providers - this is the ONLY place that should need to change.
interface PsgcApiRecord {
  code: string;
  name: string;
  geographicLevel: string; // "Reg" | "Prov" | "City" | "Mun" | "Bgy" etc.
  cityClass?: string | null; // "HUC" | "ICC" | "CC" | null
  oldNames?: string[];
}

const PSGC_API_BASE = process.env.PSGC_API_BASE ?? 'https://psgc.cloud/api';

@Injectable()
export class PsgcService {
  private readonly logger = new Logger(PsgcService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Resolves a PSGC code to a local PsgcLocations row, using the local
   * cache first and only calling the external API on a miss. This is the
   * single entry point tenants.service.ts should use - it should never
   * call the external API or query PsgcLocations directly itself.
   */
  async resolveByCode(code: string): Promise<PsgcLocations> {
    const trimmed = code.trim();

    const cached = await this.prisma.psgcLocations.findUnique({
      where: { code: trimmed },
    });
    if (cached) return cached;

    return this.fetchAndCache(trimmed);
  }

  private async fetchAndCache(code: string): Promise<PsgcLocations> {
    const record = await this.fetchFromApi(code);

    if (!record) {
      throw new BadRequestException(`'${code}' is not a recognized PSGC code.`);
    }

    return this.upsertLocation(record);
  }

  /**
   * Inserts a location, resolving its parent first (recursively, via the
   * cache-or-fetch path above) so parentId always points at a real local
   * row rather than a raw PSA code.
   */
  private async upsertLocation(record: PsgcApiRecord): Promise<PsgcLocations> {
    const existing = await this.prisma.psgcLocations.findUnique({
      where: { code: record.code },
    });
    if (existing) return existing;

    let parentId: string | undefined;
    const parentCode = this.deriveParentCode(
      record.code,
      record.geographicLevel,
    );
    if (parentCode) {
      const parent = await this.resolveByCode(parentCode);
      parentId = parent.psgcLocationId;
    }

    return this.prisma.psgcLocations.create({
      data: {
        code: record.code,
        psgcVersion: process.env.PSGC_VERSION ?? 'unknown',
        areaName: record.name,
        level: this.normalizeLevel(record.geographicLevel),
        cityClassification: this.normalizeCityClass(record.cityClass),
        parentId,
      },
    });
  }

  /**
   * PSGC codes are hierarchical by digit position (region/province/city-mun/
   * barangay), so a parent's code can be derived from the child's code
   * without an extra API call in most cases. HUC/ICC codes (which have no
   * real province) will simply have no parent - that's correct, not a bug.
   */
  private deriveParentCode(code: string, level: string): string | null {
    const normalized = this.normalizeLevel(level);
    if (normalized === 'barangay') return code.slice(0, 6) + '000';
    if (normalized === 'city' || normalized === 'municipality') {
      const provinceCode = code.slice(0, 4) + '00000';
      return provinceCode;
    }
    if (normalized === 'province') return code.slice(0, 2) + '00000000';
    return null; // region has no parent
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

  private normalizeCityClass(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const map: Record<string, string> = {
      HUC: 'HUC',
      ICC: 'ICC',
      CC: 'COMPONENT_CITY',
    };
    return map[raw] ?? undefined;
  }

  private async fetchFromApi(code: string): Promise<PsgcApiRecord | null> {
    try {
      const res = await fetch(`${PSGC_API_BASE}/locations/${code}`);
      if (!res.ok) return null;
      return (await res.json()) as PsgcApiRecord;
    } catch (err) {
      this.logger.error(
        `PSGC API lookup failed for code ${code}: ${(err as Error).message}`,
      );
      throw new BadRequestException(
        'Could not verify the PSGC code right now. Please try again shortly.',
      );
    }
  }
}
