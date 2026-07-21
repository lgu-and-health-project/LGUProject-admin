import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    return this.prisma.lguTenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(
    data: { code: string; name: string; level: string; sysAdminEmail: string },
    creator: any,
  ) {
    // Check if code exists
    const existing = await this.prisma.lguTenant.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(
        `Tenant organization with code '${data.code}' already exists.`
      );
    }

    const crypto = require('crypto');
    const registrationKey = crypto.randomUUID();

    const tenant = await this.prisma.lguTenant.create({
      data: {
        code: data.code,
        name: data.name,
        level: data.level,
        status: 'pending_setup',
        registrationKey,
        sysAdminEmail: data.sysAdminEmail,
      },
    });

    if (creator && creator.sub) {
      await this.auditLogsService.logAction(
        creator.sub,
        'register_tenant',
        `Registered new tenant organization: ${data.name} (${data.level}). Appointed sysadmin: ${data.sysAdminEmail}`,
      );
    }

    const setupLink = `${process.env.TENANT_DASHBOARD_URL || 'http://localhost:3001'}/setup?key=${registrationKey}`;
    this.logger.log(
      `[No Email Service yet, manually copy and paste setup link for sysadmin (${data.sysAdminEmail})]: ${setupLink}`,
    );

    return tenant;
  }

  async suspendTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.update({
      where: { id },
      data: { status: 'suspended' },
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'suspend_tenant',
        `Suspended an organization: ${tenant.name}`,
      );
    }

    return result;
  }

  async activateTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.update({
      where: { id },
      data: { status: 'active' },
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'Reactivated Tenant',
        `Reactivated a suspended organization: ${tenant.name}`,
      );
    }

    return result;
  }

  async deleteTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.delete({
      where: { id },
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'Removed Tenant',
        `Deleted an organization: ${tenant.name}`,
      );
    }

    return result;
  }

  async verifyRegistrationKey(registrationKey: string) {
    const tenant = await this.prisma.lguTenant.findUnique({
      where: { registrationKey },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        status: true,
        sysAdminEmail: true,
      },
    });

    if (!tenant) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (tenant.status !== 'active' && tenant.status !== 'pending_setup') {
      return { valid: false, reason: 'SUSPENDED', tenant };
    }

    return {
      valid: true,
      tenant,
      expectedEmail: tenant.sysAdminEmail,
    };
  }

  async completeSetup(registrationKey: string) {
    const tenant = await this.prisma.lguTenant.findUnique({
      where: { registrationKey },
    });

    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.update({
      where: { id: tenant.id },
      data: { status: 'active' },
    });

    return result;
  }
}
