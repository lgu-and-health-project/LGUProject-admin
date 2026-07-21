import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminApiService } from '../admin-api/admin-api.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private adminApiService: AdminApiService,
  ) {}

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.staffUser.findUnique({ where: { email } });

    if (!user || user.status !== 'active' || !user.passwordHash) {
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

    const valid = await bcrypt.compare(password, user.passwordHash);
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

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.baseRole,
      orgCode: user.orgCode,
      departmentId: user.departmentId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.baseRole,
        orgCode: user.orgCode,
      },
    };
  }

  async onboard(
    registrationKey: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const adminResponse =
      await this.adminApiService.verifyRegistrationKey(registrationKey);

    if (!adminResponse.valid) {
      if (adminResponse.reason === 'NOT_FOUND') {
        throw new UnauthorizedException('Invalid registration key');
      }
      if (adminResponse.reason === 'SUSPENDED') {
        throw new UnauthorizedException('Tenant is suspended');
      }
      throw new UnauthorizedException('Failed to verify registration key');
    }

    if (adminResponse.expectedEmail && email.toLowerCase() !== adminResponse.expectedEmail.toLowerCase()) {
      throw new UnauthorizedException('Email does not match the registered sysadmin email for this key');
    }

    const tenantInfo = adminResponse.tenant;

    let org = await this.prisma.organization.findUnique({
      where: { code: tenantInfo.code },
    });
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          code: tenantInfo.code,
          name: tenantInfo.name,
          level: tenantInfo.level,
          registrationKey,
          status: 'active',
        },
      });
    } else {
      if (org.status !== 'active') {
        throw new UnauthorizedException('Organization account is suspended');
      }
    }

    let dept = await this.prisma.department.findFirst({
      where: { orgCode: org.code, category: 'mandatory' },
    });

    if (!dept) {
      dept = await this.prisma.department.create({
        data: {
          orgCode: org.code,
          name: 'Main Office',
          category: 'mandatory',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.staffUser.create({
      data: {
        orgCode: org.code,
        email,
        passwordHash,
        baseRole: 'sysadmin',
        departmentId: dept.id,
      },
    });

    // Notify admin-api that setup is complete so status changes from pending_setup to active
    await this.adminApiService.completeSetup(registrationKey);

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

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.baseRole,
      orgCode: user.orgCode,
      departmentId: user.departmentId,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.baseRole,
        orgCode: user.orgCode,
      },
    };
  }
}
