import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AdminStatus,
  AdminRole,
  AuditAction,
  AuditTargetType,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RejectInviteDto } from './dto/reject-invite.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const INVITE_TTL_DAYS = 7;
const RESEND_COOLDOWN_MS = 60_000;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);
  private inviteCooldowns = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll() {
    const admins = await this.prisma.superAdmins.findMany({
      where: { status: { not: AdminStatus.REVOKED } },
      select: {
        superadminId: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        appointedById: true,
        createdAt: true,
        appointedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // inviteTokenHash is intentionally never selected/returned - it's a
    // secret, not display data. The invite link is only ever shown once,
    // at creation/resend time.
    return admins.map((admin) => ({
      ...admin,
      appointedByName: admin.appointedBy?.fullName ?? null,
    }));
  }

  async inviteAdmin(data: InviteAdminDto, inviter: JwtPayload) {
    const existing = await this.prisma.superAdmins.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      if (existing.status === AdminStatus.REVOKED) {
        // Tombstone the old revoked account's email so it can be reused.
        await this.prisma.superAdmins.update({
          where: { superadminId: existing.superadminId },
          data: { email: `deleted_${Date.now()}_${existing.email}` },
        });
      } else {
        throw new ConflictException(
          'An administrator with this email already exists.',
        );
      }
    }

    const inviteTokenPlain = crypto.randomBytes(32).toString('hex');
    const inviteTokenHash = crypto
      .createHash('sha256')
      .update(inviteTokenPlain)
      .digest('hex');

    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + INVITE_TTL_DAYS);

    // Placeholder hash - never usable to log in, overwritten on accept-invite.
    const placeholderHash = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      BCRYPT_ROUNDS,
    );

    const newAdmin = await this.prisma.superAdmins.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: data.role ?? AdminRole.ADMIN,
        status: AdminStatus.INVITED,
        passwordHash: placeholderHash,
        inviteTokenHash,
        inviteExpiresAt,
        appointedById: inviter.sub,
      },
      include: { appointedBy: { select: { fullName: true } } },
    });

    await this.auditLogsService.logAction({
      actorId: inviter.sub,
      action: AuditAction.invite_admin,
      targetType: AuditTargetType.superadmin,
      targetId: newAdmin.superadminId,
      metadata: {
        email: data.email,
        full_name: data.fullName,
        role: data.role ?? AdminRole.ADMIN,
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/invite?token=${inviteTokenPlain}`;
    // TODO: replace with nodemailer send once the email service is wired up.
    this.logger.log(`[No email service yet] Invite link: ${inviteLink}`);

    return {
      superadminId: newAdmin.superadminId,
      email: newAdmin.email,
      fullName: newAdmin.fullName,
      role: newAdmin.role,
      status: newAdmin.status,
      appointedByName: newAdmin.appointedBy?.fullName ?? null,
      // Plaintext token returned ONLY here, at creation time, so the caller
      // can relay/display it once. It is never retrievable again afterward.
      inviteToken: inviteTokenPlain,
    };
  }

  async acceptInvite(data: AcceptInviteDto) {
    const inviteTokenHash = crypto
      .createHash('sha256')
      .update(data.token.trim())
      .digest('hex');

    const admin = await this.prisma.superAdmins.findFirst({
      where: { inviteTokenHash },
    });

    if (!admin) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    if (admin.inviteExpiresAt && admin.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const result = await this.prisma.superAdmins.update({
      where: { superadminId: admin.superadminId },
      data: {
        passwordHash,
        status: AdminStatus.ACTIVE,
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    await this.auditLogsService.logAction({
      actorId: admin.superadminId,
      action: AuditAction.accept_invite,
      targetType: AuditTargetType.superadmin,
      targetId: admin.superadminId,
    });

    const { passwordHash: _pw, inviteTokenHash: _hash, ...safe } = result;
    return safe;
  }

  async rejectInvite(data: RejectInviteDto) {
    const inviteTokenHash = crypto
      .createHash('sha256')
      .update(data.token.trim())
      .digest('hex');

    const admin = await this.prisma.superAdmins.findFirst({
      where: { inviteTokenHash },
    });

    if (!admin) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    const result = await this.prisma.superAdmins.update({
      where: { superadminId: admin.superadminId },
      data: {
        status: AdminStatus.REVOKED,
        revokedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    await this.auditLogsService.logAction({
      actorId: admin.superadminId,
      action: AuditAction.revoke_admin,
      targetType: AuditTargetType.superadmin,
      targetId: admin.superadminId,
      metadata: { note: 'Admin rejected invitation' },
    });

    const { passwordHash: _pw, ...safe } = result;
    return safe;
  }

  async deleteAdmin(id: string, actor: JwtPayload) {
    const admin = await this.prisma.superAdmins.findUnique({
      where: { superadminId: id },
    });
    if (!admin) throw new NotFoundException('Administrator not found');

    if (admin.role === AdminRole.ROOT_SUPERADMIN) {
      throw new BadRequestException('Cannot delete the root superadmin');
    }

    const result = await this.prisma.superAdmins.update({
      where: { superadminId: id },
      data: {
        email: `deleted_${Date.now()}_${admin.email}`,
        status: AdminStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: actor.sub,
      },
    });

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.delete_admin,
      targetType: AuditTargetType.superadmin,
      targetId: admin.superadminId,
      metadata: { email: admin.email, full_name: admin.fullName },
    });

    const { passwordHash: _pw, ...safe } = result;
    return safe;
  }

  async updateAdmin(id: string, data: UpdateAdminDto, actor: JwtPayload) {
    if (actor.sub !== id && actor.role !== AdminRole.ROOT_SUPERADMIN) {
      throw new ForbiddenException(
        'You do not have permission to edit this profile',
      );
    }

    const admin = await this.prisma.superAdmins.findUnique({
      where: { superadminId: id },
    });
    if (!admin) throw new NotFoundException('Administrator not found');

    const updateData: { fullName?: string; passwordHash?: string } = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const result = await this.prisma.superAdmins.update({
      where: { superadminId: id },
      data: updateData,
    });

    return {
      superadminId: result.superadminId,
      fullName: result.fullName,
      email: result.email,
    };
  }

  async resendInvite(id: string, actor: JwtPayload) {
    const admin = await this.prisma.superAdmins.findUnique({
      where: { superadminId: id },
    });
    if (!admin) throw new NotFoundException('Administrator not found');

    if (admin.status !== AdminStatus.INVITED) {
      throw new BadRequestException(
        'Can only resend invitations to administrators with invited status',
      );
    }

    const now = Date.now();
    const lastSent = this.inviteCooldowns.get(id);
    if (lastSent && now - lastSent < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - lastSent)) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${remainingSeconds} seconds before resending.`,
      );
    }
    this.inviteCooldowns.set(id, now);

    const inviteTokenPlain = crypto.randomBytes(32).toString('hex');
    const inviteTokenHash = crypto
      .createHash('sha256')
      .update(inviteTokenPlain)
      .digest('hex');

    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + INVITE_TTL_DAYS);

    await this.prisma.superAdmins.update({
      where: { superadminId: id },
      data: { inviteTokenHash, inviteExpiresAt },
    });

    await this.auditLogsService.logAction({
      actorId: actor.sub,
      action: AuditAction.invite_admin,
      targetType: AuditTargetType.superadmin,
      targetId: admin.superadminId,
      metadata: {
        email: admin.email,
        role: admin.role,
        note: 'Resent invitation',
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/invite?token=${inviteTokenPlain}`;
    this.logger.log(`[No email service yet] Invite link: ${inviteLink}`);

    return { success: true, message: 'Invitation resent successfully' };
  }
}
