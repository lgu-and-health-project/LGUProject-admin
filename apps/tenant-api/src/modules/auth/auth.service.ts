import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
}
