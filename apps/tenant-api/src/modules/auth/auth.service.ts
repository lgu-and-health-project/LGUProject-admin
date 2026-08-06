import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminApiService } from '../admin-api/admin-api.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private adminApiService: AdminApiService,
  ) {}

  private async buildAuthPayload(
    user: {
      id: string;
      orgCode: string;
      officeId: string | null;
    },
    sessionId: string,
  ) {
    const payload = {
      sub: user.id,
      orgCode: user.orgCode,
      officeId: user.officeId,
      sessionId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        userId: user.id,
        orgCode: user.orgCode,
        officeId: user.officeId,
      },
    };
  }

  async login(
    orgCode: string,
    employeeCode: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
    relayLogId?: string,
  ) {
    const user = await this.prisma.staffUser.findUnique({
      where: { orgCode_employeeCode: { orgCode, employeeCode } },
      include: { credentials: true, org: true },
    });

    const cred = user?.credentials;
    const actorEmail = user?.email || employeeCode;

    if (!user || !cred) {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail,
          action: 'login',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'pending_provisioning') {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail,
          action: 'login',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new ForbiddenException({
        message:
          'Account pending provisioning. Please set your initial password.',
        code: 'PENDING_PROVISIONING',
      });
    }

    if (user.status !== 'active' || user.org?.status !== 'active') {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail,
          action: 'login',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new UnauthorizedException(
        'Organization account is suspended or pending setup',
      );
    }

    if (!cred.passwordHash || cred.passwordHash.length < 10) {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail,
          action: 'login',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, cred.passwordHash);
    if (!valid) {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail,
          action: 'login',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.auditLog.create({
      data: {
        orgCode: user.orgCode,
        actorId: user.id,
        actorEmail,
        action: 'login',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        relayLogId,
      },
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const session = await this.prisma.session.create({
      data: {
        staffUserId: user.id,
        refreshTokenHash,
        relayLogId,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const payload = await this.buildAuthPayload(user, session.id);
    return { ...payload, refreshToken: rawRefreshToken };
  }

  async setInitialPassword(
    orgCode: string,
    employeeCode: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
    relayLogId?: string,
  ) {
    const user = await this.prisma.staffUser.findUnique({
      where: { orgCode_employeeCode: { orgCode, employeeCode } },
      include: { credentials: true },
    });

    if (!user || !user.credentials) {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorEmail: employeeCode,
          action: 'set_initial_password',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new UnauthorizedException('Account not found');
    }

    const actorEmail = user.email || employeeCode;

    if (user.status !== 'pending_provisioning') {
      await this.prisma.auditLog.create({
        data: {
          orgCode,
          actorId: user.id,
          actorEmail,
          action: 'set_initial_password',
          status: 'FAILURE',
          ipAddress,
          userAgent,
          relayLogId,
        },
      });
      throw new ForbiddenException('Account is not pending provisioning');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.staffUserCredentials.update({
        where: { staffUserId: user.id },
        data: { passwordHash },
      });

      await tx.staffUser.update({
        where: { id: user.id },
        data: { status: 'active' },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        orgCode,
        actorId: user.id,
        actorEmail,
        action: 'set_initial_password',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        relayLogId,
      },
    });
  }

  async getServerStatus() {
    const registrationKey = await this.adminApiService.getRegistrationKey();
    if (!registrationKey) {
      return { status: 'NEEDS_PAIRING' };
    }

    const adminResponse: any =
      await this.adminApiService.verifyRegistrationKey(registrationKey);

    if (!adminResponse.valid) {
      if (adminResponse.reason === 'NOT_FOUND') {
        return { status: 'NEEDS_PAIRING' }; // Key revoked or deleted
      }
      if (adminResponse.reason === 'SUSPENDED') {
        return { status: 'SUSPENDED' };
      }
      return { status: 'NEEDS_PAIRING' };
    }

    const expectedEmail = adminResponse.expectedEmail;

    // In the new schema, we check for a MISO user via email. Since email is optional on StaffUser,
    // this check might be brittle, but we assume the sysadmin created during onboard has it.
    const sysadminUser = await this.prisma.staffUser.findFirst({
      where: { email: expectedEmail },
    });

    if (!sysadminUser) {
      return {
        status: 'NEEDS_ONBOARDING',
        expectedEmail,
        tenantName: adminResponse.tenant?.name,
      };
    }

    return { status: 'CONFIGURED' };
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

    let office = await this.prisma.office.findFirst({
      where: {
        orgCode: org.code,
        name: 'Management Information Systems Office',
      },
    });
    if (!office) {
      office = await this.prisma.office.create({
        data: {
          orgCode: org.code,
          name: 'Management Information Systems Office',
          category: 'MISO',
        },
      });
    }

    let sysadminRole = await this.prisma.role.findFirst({
      where: { orgCode: org.code, roleName: 'sysadmin' },
    });
    if (!sysadminRole) {
      sysadminRole = await this.prisma.role.create({
        data: {
          orgCode: org.code,
          roleName: 'sysadmin',
          officeCategory: 'MISO',
          isSystemDefault: true,
        },
      });
      // We no longer seed permissions during onboard. Tabs and permissions are seeded centrally
      // and managed via MISO's live configuration (OfficeTabAllocation, RoleTabPermission).
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const sysadminEmployeeCode = 'SYS-001';

    const user = await this.prisma.staffUser.create({
      data: {
        orgCode: org.code,
        employeeCode: sysadminEmployeeCode,
        email,
        roleId: sysadminRole.id,
        officeId: office.id,
        positionTitle: 'System Administrator',
        status: 'active',
        credentials: {
          create: {
            passwordHash,
          },
        },
      },
    });

    await this.adminApiService.completeSetup(activeKey);

    await this.prisma.auditLog.create({
      data: {
        orgCode: user.orgCode,
        actorId: user.id,
        actorEmail: user.email || user.employeeCode!,
        action: 'onboard_success',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const session = await this.prisma.session.create({
      data: {
        staffUserId: user.id,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const payload = await this.buildAuthPayload(user, session.id);
    return { ...payload, refreshToken: rawRefreshToken };
  }

  async refreshSession(refreshToken: string) {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { staffUser: true },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Return a fresh access token containing the same session ID
    return this.buildAuthPayload(session.staffUser, session.id);
  }
}
