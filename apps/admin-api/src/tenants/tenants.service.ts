import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService
  ) {}

  async findAll() {
    return this.prisma.lguTenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTenant(data: { code: string; name: string; level: string; sysAdminEmail: string }, creator: any) {
    // Check if code exists
    const existing = await this.prisma.lguTenant.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new ConflictException(`Tenant with code ${data.code} already exists`);
    }

    const crypto = require('crypto');
    const registrationKey = crypto.randomUUID();

    // Create the tenant
    const tenant = await this.prisma.lguTenant.create({
      data: {
        code: data.code,
        name: data.name,
        level: data.level,
        status: 'active',
        registrationKey,
      }
    });

    // Also create onboarding request to track the sysadmin email
    await this.prisma.onboardingRequest.create({
      data: {
        orgCode: data.code,
        orgName: data.name,
        level: data.level,
        sysAdminEmail: data.sysAdminEmail,
        status: 'provisioning',
      }
    });

    if (creator && creator.sub) {
      await this.auditLogsService.logAction(
        creator.sub,
        'register_tenant',
        `Registered new tenant organization: ${data.name} (${data.level}). Appointed sysadmin: ${data.sysAdminEmail}`
      );
    }

    return tenant;
  }

  async suspendTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.update({
      where: { id },
      data: { status: 'suspended' }
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'suspend_tenant',
        `Suspended tenant organization: ${tenant.name}`
      );
    }

    return result;
  }

  async activateTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.update({
      where: { id },
      data: { status: 'active' }
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'activate_tenant',
        `Suspended tenant organization activated: ${tenant.name}`
      );
    }

    return result;
  }

  async deleteTenant(id: string, actor: any) {
    const tenant = await this.prisma.lguTenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const result = await this.prisma.lguTenant.delete({
      where: { id }
    });

    if (actor && actor.sub) {
      await this.auditLogsService.logAction(
        actor.sub,
        'delete_tenant',
        `Deleted tenant organization: ${tenant.name}`
      );
    }

    return result;
  }
}

