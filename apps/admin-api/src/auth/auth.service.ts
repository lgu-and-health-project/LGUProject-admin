import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateAdmin(email: string, pass: string): Promise<any> {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException("Account doesn't exist");
    }

    if (!admin.passwordHash) {
      throw new UnauthorizedException('Account not fully set up');
    }

    const isMatch = await bcrypt.compare(pass, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }
    const { passwordHash, ...result } = admin;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: '7d' },
    );
    return {
      access_token,
      refresh_token,
      user,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Re-validate the user to ensure they are still active
      const admin = await this.prisma.superAdmin.findUnique({
        where: { id: payload.sub },
      });

      if (!admin || admin.status === 'REJECTED' || admin.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account has been restricted');
      }

      const { passwordHash, ...user } = admin;
      return this.login(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
