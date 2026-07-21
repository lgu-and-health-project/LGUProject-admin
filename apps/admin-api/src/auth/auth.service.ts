import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

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

  async login(user: any, familyId?: string) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);
    
    // Generate stateful refresh token
    const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenPlain).digest('hex');
    const newFamilyId = familyId || crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Cleanup expired tokens for this user to prevent database bloat
    await this.prisma.refreshToken.deleteMany({
      where: {
        adminId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        familyId: newFamilyId,
        expiresAt,
        adminId: user.id,
      },
    });

    return {
      access_token,
      refresh_token: refreshTokenPlain,
      user,
    };
  }

  async refresh(refreshTokenPlain: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshTokenPlain).digest('hex');

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { admin: true }
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (tokenRecord.isRevoked) {
      // THE TRAP: Token reuse detected! Revoke the entire family
      await this.prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
    }

    // Check if user is still valid
    const admin = tokenRecord.admin;
    if (!admin || admin.status === 'REJECTED' || admin.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account has been restricted');
    }

    // Mark current token as revoked
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const { passwordHash, ...user } = admin;
    // Issue a new token pair in the same family
    return this.login(user, tokenRecord.familyId);
  }

  async logout(refreshTokenPlain: string) {
    if (!refreshTokenPlain) return;
    const tokenHash = crypto.createHash('sha256').update(refreshTokenPlain).digest('hex');
    
    // Attempt to revoke the token, ignore if not found
    try {
      await this.prisma.refreshToken.update({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    } catch (e) {
      // Ignore if not found
    }
  }
}
