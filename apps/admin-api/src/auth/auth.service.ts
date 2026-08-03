import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatus, SuperAdmins } from '@prisma/client';
import type { JwtPayload } from './auth.types';

type SafeAdmin = SuperAdmins;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateAdmin(email: string, pass: string): Promise<SafeAdmin> {
    const cred = await this.prisma.superAdminCredentials.findUnique({
      where: { email },
      include: { superadmin: true }
    });

    if (!cred) {
      throw new UnauthorizedException("Account doesn't exist");
    }
    
    const admin = cred.superadmin;

    if (admin.status === AdminStatus.REVOKED) {
      throw new UnauthorizedException('Account has been restricted');
    }

    if (!cred.passwordHash) {
      throw new UnauthorizedException('Account not fully set up');
    }

    const isMatch = await bcrypt.compare(pass, cred.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    return admin;
  }

  async login(user: SafeAdmin, familyId?: string) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.superadminId,
      role: user.role,
    };
    const access_token = await this.jwtService.signAsync(payload);

    // Stateful refresh token - only the hash is ever persisted.
    const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');
    const newFamilyId = familyId || crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Cleanup expired tokens for this admin to prevent table bloat.
    await this.prisma.refreshTokens.deleteMany({
      where: {
        adminId: user.superadminId,
        expiresAt: { lt: new Date() },
      },
    });

    await this.prisma.refreshTokens.create({
      data: {
        tokenHash,
        familyId: newFamilyId,
        expiresAt,
        adminId: user.superadminId,
      },
    });

    await this.prisma.superAdmins.update({
      where: { superadminId: user.superadminId },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token,
      refresh_token: refreshTokenPlain,
      user,
    };
  }

  async refresh(refreshTokenPlain: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');

    const tokenRecord = await this.prisma.refreshTokens.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (tokenRecord.isRevoked) {
      // Reuse of an already-rotated token means the token was stolen -
      // revoke the entire family so every session tied to it is killed.
      await this.prisma.refreshTokens.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Token reuse detected. All sessions revoked.',
      );
    }

    const admin = tokenRecord.admin;
    if (!admin || admin.status === AdminStatus.REVOKED) {
      throw new UnauthorizedException('Account has been restricted');
    }

    await this.prisma.refreshTokens.update({
      where: { refreshTokenId: tokenRecord.refreshTokenId },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return this.login(admin, tokenRecord.familyId);
  }

  async logout(refreshTokenPlain: string) {
    if (!refreshTokenPlain) return;
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');

    try {
      await this.prisma.refreshTokens.update({
        where: { tokenHash },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    } catch {
      // Token already gone/invalid - logout should still succeed silently.
    }
  }
}
