import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { PsgcService } from './psgc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, AuditStatus, AuditTargetType } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('psgc')
export class PsgcController {
  private readonly logger = new Logger(PsgcController.name);

  constructor(
    private readonly psgcService: PsgcService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Bulk sync (ROOT_SUPERADMIN only) ─────────────────────────────────

  /**
   * POST /psgc/sync
   *
   * Triggers a full bulk import of all PSGC geographic data from the
   * official PSA API. Restricted to ROOT_SUPERADMIN. Logged to audit trail.
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ROOT_SUPERADMIN)
  async sync(@Req() req: AuthenticatedRequest, @Query('force') force?: string) {
    this.logger.log(`PSGC bulk sync triggered by ${req.user.email}`);

    try {
      const syncId = await this.psgcService.startSync(req.user.sub, force === 'true');

      await this.auditLogsService.logAction({
        actorId: req.user.sub,
        action: AuditAction.sync_psgc,
        status: AuditStatus.SUCCESS,
        targetType: AuditTargetType.psgc,
        metadata: { syncId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return { message: 'PSGC sync started in background.', syncId };
    } catch (error) {
      await this.auditLogsService.logAction({
        actorId: req.user.sub,
        action: AuditAction.sync_psgc,
        status: AuditStatus.FAILURE,
        targetType: AuditTargetType.psgc,
        metadata: { error: (error as Error).message },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw error;
    }
  }

  @Post('sync/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ROOT_SUPERADMIN)
  async cancelSync() {
    return this.psgcService.cancelSync();
  }

  @Get('sync/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ROOT_SUPERADMIN)
  @SkipThrottle({ default: true, auth: true })
  async getSyncStatus() {
    return this.psgcService.getSyncStatus();
  }

  @Get('sync/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ROOT_SUPERADMIN)
  @SkipThrottle({ default: true, auth: true })
  async getSyncHistory() {
    return this.psgcService.getSyncHistory();
  }

  // ─── Local lookup endpoints (any authenticated admin) ─────────────────

  /**
   * GET /psgc/regions
   * Returns all locally-cached regions.
   */
  @Get('regions')
  async getRegions() {
    return this.psgcService.findByLevel('region');
  }

  /**
   * GET /psgc/provinces?regionCode=0100000000
   * Returns all provinces, optionally filtered by parent region code.
   */
  @Get('provinces')
  async getProvinces(
    @Query('regionCode') regionCode?: string,
    @Query('strict') strict?: string,
  ) {
    return this.psgcService.findByLevel('province', regionCode, strict === 'true');
  }

  @Get('municipalities')
  async getMunicipalities(
    @Query('provinceCode') provinceCode?: string,
    @Query('strict') strict?: string,
  ) {
    return this.psgcService.findByLevel('municipality', provinceCode, strict === 'true');
  }

  @Get('cities')
  async getCities(
    @Query('provinceCode') provinceCode?: string,
    @Query('strict') strict?: string,
  ) {
    return this.psgcService.findByLevel('city', provinceCode, strict === 'true');
  }

  @Get('barangays')
  async getBarangays(
    @Query('municipalityCode') municipalityCode?: string,
    @Query('strict') strict?: string,
  ) {
    return this.psgcService.findByLevel('barangay', municipalityCode, strict === 'true');
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.psgcService.searchByName(query);
  }

  @Get('children/:code')
  async getChildren(
    @Param('code') code: string,
    @Query('strict') strict?: string,
  ) {
    return this.psgcService.findChildren(code, strict === 'true');
  }

  @Get('lookup/:code')
  async lookup(@Param('code') code: string) {
    return this.psgcService.resolveByCode(code);
  }
}
