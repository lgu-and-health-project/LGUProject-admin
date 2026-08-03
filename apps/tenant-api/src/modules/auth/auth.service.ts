import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminApiService } from '../admin-api/admin-api.service';
import { ModulePermission } from './models/auth.model';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private adminApiService: AdminApiService,
  ) {}

  /**
   * Real permission resolution, replacing the old hardcoded
   * `if (role === 'sysadmin') ... else []` switch. Reads RolePermission rows
   * directly, so any role — not just sysadmin — gets working permissions,
   * and adding a role is a data change, not a deploy.
   */
  async getPermissionsForRole(
    roleId: string | null,
  ): Promise<ModulePermission[]> {
    if (!roleId) return [];

    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
    });

    // Collapse division-scoped rows into their parent module for the nav-level
    // permission check (module access = true if the role has ANY grant on it).
    // Fine-grained division scoping is enforced separately at the resolver/
    // service layer using divisionId, not in this coarse module list.
    const byModule = new Map<string, ModulePermission>();
    for (const row of rows) {
      const existing = byModule.get(row.module);
      if (!existing) {
        byModule.set(row.module, {
          module: row.module,
          create: row.canCreate,
          read: row.canRead,
          update: row.canUpdate,
          delete: row.canDelete,
        });
      } else {
        existing.create ||= row.canCreate;
        existing.read ||= row.canRead;
        existing.update ||= row.canUpdate;
        existing.delete ||= row.canDelete;
      }
    }
    return Array.from(byModule.values());
  }

  private async buildAuthPayload(user: {
    id: string;
    email: string;
    orgCode: string;
    departmentId: string | null;
    roleId: string | null;
    role: { roleName: string } | null;
    org?: { name: string; level: string } | null;
  }) {
    const permissions = await this.getPermissionsForRole(user.roleId);
    let orgData = user.org;
    if (!orgData) {
      orgData = await this.prisma.organization.findUnique({
        where: { code: user.orgCode },
        select: { name: true, level: true },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.roleName ?? null,
      roleId: user.roleId,
      orgCode: user.orgCode,
      departmentId: user.departmentId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role?.roleName ?? null,
        roleId: user.roleId,
        orgCode: user.orgCode,
        departmentId: user.departmentId,
        permissions,
        org: orgData,
      },
    };
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const cred = await this.prisma.staffUserCredentials.findUnique({
      where: { email },
      include: { staffUser: { include: { role: true, org: true } } },
    });

    const user = cred?.staffUser;

    // Strictly enforce that user exists, is active, has a valid password hash, and belongs to an active org.
    if (
      !cred ||
      !user ||
      user.status !== 'active' ||
      !cred.passwordHash ||
      cred.passwordHash.length < 10
    ) {
      await this.prisma.auditLog.create({
        data: {
          actorEmail: email,
          action: 'login_failed',
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException(
        'Invalid credentials or account pending setup',
      );
    }

    if (user.org && user.org.status !== 'active') {
      await this.prisma.auditLog.create({
        data: {
          actorEmail: email,
          action: 'login_failed_org_inactive',
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException(
        'Organization account is suspended or pending setup',
      );
    }

    const valid = await bcrypt.compare(password, cred.passwordHash);
    if (!valid) {
      await this.prisma.auditLog.create({
        data: {
          actorEmail: email,
          action: 'login_failed',
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.auditLog.create({
      data: {
        orgCode: user.orgCode,
        actorId: user.id,
        actorEmail: user.email,
        action: 'login_success',
        ipAddress,
        userAgent,
      },
    });

    return this.buildAuthPayload(user);
  }

  async pairDevice(pairingToken: string) {
    return this.adminApiService.pairDeviceAndSave(pairingToken);
  }

  async onboard(
    registrationKey: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const activeKey =
      (await this.adminApiService.getRegistrationKey()) || registrationKey;
    if (!activeKey) {
      throw new UnauthorizedException(
        'Registration key is required for initial setup.',
      );
    }

    const adminResponse: any =
      await this.adminApiService.verifyRegistrationKey(activeKey);

    if (!adminResponse.valid) {
      if (adminResponse.reason === 'NOT_FOUND') {
        throw new UnauthorizedException('Invalid registration key');
      }
      if (adminResponse.reason === 'SUSPENDED') {
        throw new UnauthorizedException('Tenant is suspended');
      }
      throw new UnauthorizedException('Failed to verify registration key');
    }

    if (
      adminResponse.expectedEmail &&
      email.toLowerCase() !== adminResponse.expectedEmail.toLowerCase()
    ) {
      throw new UnauthorizedException(
        'Email does not match the registered sysadmin email for this key',
      );
    }

    const tenantInfo = adminResponse.tenant;

    let org = await this.prisma.organization.findUnique({
      where: { code: tenantInfo.psgcCode },
    });
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          code: tenantInfo.psgcCode,
          name: tenantInfo.name,
          level: tenantInfo.level,
          registrationKey: activeKey,
          status: 'active',
        },
      });
    } else if (org.status !== 'active') {
      throw new UnauthorizedException('Organization account is suspended');
    }

    let dept = await this.prisma.department.findFirst({
      where: {
        orgCode: org.code,
        name: 'Management Information Systems Office',
      },
    });
    if (!dept) {
      dept = await this.prisma.department.create({
        data: {
          orgCode: org.code,
          name: 'Management Information Systems Office',
          category: 'custom',
        },
      });
    }

    // Every org needs its own sysadmin Role with real RolePermission rows —
    // without this, onboarding outside the seed script would produce a
    // sysadmin who logs in successfully but has zero permissions.
    let sysadminRole = await this.prisma.role.findFirst({
      where: { orgCode: org.code, roleName: 'sysadmin' },
    });
    if (!sysadminRole) {
      sysadminRole = await this.prisma.role.create({
        data: {
          orgCode: org.code,
          roleName: 'sysadmin',
          isSystemDefault: true,
        },
      });

      const permissions = [
        {
          module: 'profile',
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
        {
          module: 'staff',
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
        {
          module: 'roles',
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
      ];

      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: sysadminRole!.id,
          ...p,
        })),
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.staffUser.create({
      data: {
        orgCode: org.code,
        email,
        baseRole: 'sysadmin',
        roleId: sysadminRole.id,
        office: 'MISO',
        positionTitle: 'System Administrator',
        departmentId: dept.id,
        credentials: {
          create: {
            email,
            passwordHash,
          },
        },
      },
      include: { role: true },
    });

    await this.adminApiService.completeSetup(activeKey);

    await this.prisma.auditLog.create({
      data: {
        orgCode: user.orgCode,
        actorId: user.id,
        actorEmail: user.email,
        action: 'onboard_success',
        ipAddress,
        userAgent,
      },
    });

    return this.buildAuthPayload(user);
  }
}
