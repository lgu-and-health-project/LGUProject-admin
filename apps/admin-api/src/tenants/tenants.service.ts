import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PsgcService } from '../psgc/psgc.service';
import {
  TenantStatus,
  LicenseStatus,
  AuditAction,
  AuditTargetType,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
    private psgcService: PsgcService,
  ) {}

  async findAll() {
    const tenants = await this.prisma.lguTenants.findMany({
      where: { status: { not: TenantStatus.deleted } },
      orderBy: { createdAt: 'desc' },
      include: { licenses: true, psgcLocation: true },
    });

    return tenants.map((t) => ({
      ...t,
      registrationKey: t.licenses?.[0]?.registrationKey,
    }));
  }

  async createTenant(data: CreateTenantDto, creator: JwtPayload) {
    // Resolves (or fetches + caches) the PSGC location. This is also what
    // validates the code is real - an unrecognized code throws here.
    const psgcLocation = await this.psgcService.resolveByCode(data.psgcCode);

    const existing = await this.prisma.lguTenants.findFirst({
      where: {
        psgcLocationId: psgcLocation.psgcLocationId,
        status: { not: TenantStatus.deleted },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A tenant for '${psgcLocation.areaName}' (${data.psgcCode}) already exists.`,
      );
    }

    const existingSysadmin = await this.prisma.lguTenants.findFirst({
      where: {
        sysadminEmail: data.sysadminEmail,
        status: { not: TenantStatus.deleted },
      },
    });
    if (existingSysadmin) {
      throw new ConflictException(
        `The email '${data.sysadminEmail}' is already registered as a SysAdmin for another organization.`,
      );
    }

    const registrationKey = crypto.randomUUID();

    const tenant = await this.prisma.lguTenants.create({
      data: {
        psgcLocationId: psgcLocation.psgcLocationId,
        status: TenantStatus.pending_setup,
        sysadminEmail: data.sysadminEmail,
        licenses: {
          create: {
            registrationKey,
            issuedAt: new Date(),
            status: LicenseStatus.active,
          },
        },
      },
      include: { psgcLocation: true },
    });

    await this.auditLogsService.logAction({
      actorId: creator.sub,
      action: AuditAction.register_tenant,
      targetType: AuditTargetType.tenant,
      targetId: tenant.tenantId,
      metadata: {
        tenant_name: psgcLocation.areaName,
        psgc_code: data.psgcCode,
        sysadmin_email: data.sysadminEmail,
      },
    });

    const setupLink = `${process.env.TENANT_DASHBOARD_URL ?? 'http://localhost:3001'}/setup?key=${registrationKey}`;
    // TODO: replace with nodemailer send once the email service is wired up.
    this.logger.log(
      `[No email service yet] Setup link for sysadmin (${data.sysadminEmail}): ${setupLink}`,
    );

    return { ...tenant, registrationKey };
  }

  async suspendTenant(id: string, actor: JwtPayload) {
    const tenant = await this.getActiveTenantOrThrow(id);

    const result = await this.prisma.lguTenants.update({
      where: { tenantId: id },
      data: { status: TenantStatus.suspended },
      include: { psgcLocation: true },
    });

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.suspend_tenant,
      targetType: AuditTargetType.tenant,
      targetId: tenant.tenantId,
      metadata: { tenant_name: tenant.psgcLocation.areaName },
    });

    return result;
  }

  async activateTenant(id: string, actor: JwtPayload) {
    const tenant = await this.getActiveTenantOrThrow(id);

    const result = await this.prisma.lguTenants.update({
      where: { tenantId: id },
      data: { status: TenantStatus.active },
      include: { psgcLocation: true },
    });

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.activate_tenant,
      targetType: AuditTargetType.tenant,
      targetId: tenant.tenantId,
      metadata: { tenant_name: tenant.psgcLocation.areaName },
    });

    return result;
  }

  async deleteTenant(id: string, actor: JwtPayload) {
    const tenant = await this.getActiveTenantOrThrow(id);

    const result = await this.prisma.lguTenants.update({
      where: { tenantId: id },
      data: { status: TenantStatus.deleted, deletedAt: new Date() },
    });

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.delete_tenant,
      targetType: AuditTargetType.tenant,
      targetId: tenant.tenantId,
      metadata: { tenant_name: tenant.psgcLocation.areaName },
    });

    return result;
  }

  private async getActiveTenantOrThrow(id: string) {
    const tenant = await this.prisma.lguTenants.findUnique({
      where: { tenantId: id },
      include: { psgcLocation: true },
    });
    if (!tenant || tenant.status === TenantStatus.deleted) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  /**
   * Called by the tenant/staff server (cross-service, internal auth only -
   * see InternalTenantsController) to check whether a registration key is
   * still valid before letting first-time setup proceed.
   */
  async verifyRegistrationKey(registrationKey: string) {
    const license = await this.prisma.licenses.findUnique({
      where: { registrationKey },
      include: {
        tenant: { include: { psgcLocation: true } },
      },
    });

    if (!license || license.status !== LicenseStatus.active) {
      return { valid: false as const, reason: 'NOT_FOUND' as const };
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return { valid: false as const, reason: 'NOT_FOUND' as const };
    }

    const tenant = license.tenant;

    if (
      tenant.status !== TenantStatus.active &&
      tenant.status !== TenantStatus.pending_setup
    ) {
      return { valid: false as const, reason: 'SUSPENDED' as const, tenant };
    }

    return {
      valid: true as const,
      tenant,
      expectedEmail: tenant.sysadminEmail,
    };
  }

  async completeSetup(registrationKey: string) {
    const license = await this.prisma.licenses.findUnique({
      where: { registrationKey },
    });
    if (!license) throw new NotFoundException('License not found');

    if (license.status !== LicenseStatus.active) {
      throw new NotFoundException('License is no longer active');
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      throw new NotFoundException('License has expired');
    }

    return this.prisma.lguTenants.update({
      where: { tenantId: license.tenantId },
      data: {
        status: TenantStatus.active,
        sysadminVerifiedAt: new Date(),
      },
    });
  }
}
