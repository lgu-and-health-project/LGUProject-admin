import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PsgcService } from '../psgc/psgc.service';
import { ConfigService } from '@nestjs/config';
import { getSysadminEmailTemplate } from '../templates/mails/sysadmin.template';
import { sendPlatformEmail } from '../utils/gmail';
import {
  TenantStatus,
  LicenseStatus,
  AuditAction,
  AuditTargetType,
  DeviceStatus,
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
    private configService: ConfigService,
  ) {}

  async findAll() {
    const tenants = await this.prisma.lguTenants.findMany({
      where: { status: { not: TenantStatus.deleted } },
      orderBy: { createdAt: 'desc' },
      include: { licenses: true, psgcLocation: true, devices: true },
    });

    return tenants.map((t) => ({
      ...t,
      registrationKey: t.licenses?.[0]?.registrationKey,
      device: t.devices?.[0] || null,
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



    const tenant = await this.prisma.lguTenants.create({
      data: {
        psgcLocationId: psgcLocation.psgcLocationId,
        status: TenantStatus.pending_setup,
        sysadminEmail: data.sysadminEmail,
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



    return tenant;
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
      metadata: { 
        tenant_name: tenant.psgcLocation.areaName,
        psgc_code: tenant.psgcLocation.code
      },
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
      metadata: { 
        tenant_name: tenant.psgcLocation.areaName,
        psgc_code: tenant.psgcLocation.code
      },
    });

    return result;
  }

  async deleteTenant(id: string, actor: JwtPayload) {
    const tenant = await this.getActiveTenantOrThrow(id);

    const result = await this.prisma.$transaction([
      this.prisma.licenses.deleteMany({
        where: { tenantId: id },
      }),
      this.prisma.lguTenants.delete({
        where: { tenantId: id },
      }),
    ]);

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.delete_tenant,
      targetType: AuditTargetType.tenant,
      targetId: tenant.tenantId,
      metadata: { 
        tenant_name: tenant.psgcLocation.areaName,
        psgc_code: tenant.psgcLocation.code
      },
    });

    return result[1];
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

  async completeSetup(tenantId: string) {
    return this.prisma.lguTenants.update({
      where: { tenantId },
      data: {
        status: TenantStatus.active,
        sysadminVerifiedAt: new Date(),
      },
    });
  }

  async recordHeartbeat(license: any, device: any, apiUrl?: string) {
    const updates: any = { 
      lastHeartbeatAt: new Date(),
      agentReachable: true,
      backendHealthy: true,
    };
    
    if (device.status === DeviceStatus.ASSIGNED) {
      updates.status = DeviceStatus.ACTIVE;
      updates.activatedAt = new Date();
    }
    
    await this.prisma.devices.update({
      where: { deviceId: license.deviceId },
      data: updates
    });

    if (apiUrl) {
      await this.prisma.lguTenants.update({
        where: { tenantId: license.tenantId },
        data: { apiUrl }
      });
    }

    if (updates.status === DeviceStatus.ACTIVE) {
      await this.auditLogsService.logAction({
        action: AuditAction.activate_device,
        targetType: AuditTargetType.device,
        targetId: license.deviceId,
        metadata: { hardwareSerial: device.hardwareSerial, activatedVia: 'heartbeat' },
      });
    }

    return { success: true };
  }
}
