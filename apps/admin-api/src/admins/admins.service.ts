import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';


@Injectable()
export class AdminsService {
  // In-memory store to prevent spamming resend invites (adminId -> timestamp)
  private inviteCooldowns = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService
  ) {}

  async findAll() {
    const admins = await this.prisma.superAdmin.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        appointedById: true,
        createdAt: true,
        appointedBy: {
          select: {
            fullName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return admins.map(admin => ({
      ...admin,
      appointedByName: admin.appointedBy?.fullName || null,
    }));
  }

  async inviteAdmin(data: { email: string; fullName: string }, inviter: any) {
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

    // If inviter is ROOT_SUPERADMIN, status is INVITED, otherwise PENDING_APPROVAL
    const status = inviter && inviter.role === 'ROOT_SUPERADMIN' ? 'INVITED' : 'PENDING_APPROVAL';

    const newAdmin = await this.prisma.superAdmin.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: 'ADMIN',
        status,
        inviteToken,
        inviteExpiresAt,
        appointedById: inviter?.sub,
      },
      include: {
        appointedBy: {
          select: { fullName: true }
        }
      }
    });

    if (inviter && inviter.sub) {
      await this.auditLogsService.logAction(
        inviter.sub,
        'invite_admin',
        `Invited new administrator: ${data.email} (${data.fullName})`
      );
    }

    // Log the invite link since we disabled the mail service
    if (status === 'INVITED') {
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${inviteToken}`;
      console.log(`[No Email Service yet, manually copy and paste invite token for now]: ${inviteLink}`);
    }

    return {
      ...newAdmin,
      appointedByName: newAdmin.appointedBy?.fullName || null
    };
  }

  async acceptInvite(data: { token: string; password: string }) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { inviteToken: data.token }
    });

    if (!admin) {
      throw new Error('Invalid or expired invite token');
    }

    if (admin.inviteExpiresAt && admin.inviteExpiresAt < new Date()) {
      throw new Error('Invite token has expired');
    }

    if (admin.status === 'PENDING_APPROVAL') {
      throw new Error('Invite is still pending approval');
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteToken: null,
        inviteExpiresAt: null,
      }
    });

    await this.auditLogsService.logAction(
      admin.id,
      'accept_invite',
      `Administrator accepted invitation and completed setup`
    );

    return result;
  }

  async rejectInvite(data: { token: string }) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { inviteToken: data.token }
    });

    if (!admin) {
      throw new Error('Invalid or expired invite token');
    }

    const result = await this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: {
        status: 'REJECTED',
        inviteToken: null,
        inviteExpiresAt: null,
      }
    });

    await this.auditLogsService.logAction(
      admin.id,
      'reject_invite',
      `Administrator rejected invitation`
    );

    return result;
  }

  async approveAdmin(id: string, approver: any) {
    if (approver?.role !== 'ROOT_SUPERADMIN') {
      throw new Error('Only ROOT_SUPERADMIN can approve invites');
    }

    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');

    if (admin.status !== 'PENDING_APPROVAL') {
      throw new Error('Admin is not pending approval');
    }

    const updatedAdmin = await this.prisma.superAdmin.update({
      where: { id },
      data: {
        status: 'INVITED',
        // Optional: you could update appointedById to the approver's ID or keep the original inviter
      },
      include: {
        appointedBy: { select: { fullName: true } }
      }
    });

    await this.auditLogsService.logAction(
      approver.sub,
      'approve_admin',
      `Approved administrator: ${admin.email}`
    );

    // Log the invite link since we disabled the mail service
    if (admin.inviteToken) {
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${admin.inviteToken}`;
      console.log(`[No Email Service yet, manually copy and paste invite token for now]: ${inviteLink}`);
    }

    return {
      ...updatedAdmin,
      appointedByName: updatedAdmin.appointedBy?.fullName || null
    };
  }

  async rejectPendingAdmin(id: string, approver: any) {
    if (approver?.role !== 'ROOT_SUPERADMIN') {
      throw new Error('Only ROOT_SUPERADMIN can reject invites');
    }

    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');

    if (admin.status !== 'PENDING_APPROVAL') {
      throw new Error('Admin is not pending approval');
    }

    const updatedAdmin = await this.prisma.superAdmin.update({
      where: { id },
      data: {
        status: 'REJECTED',
        inviteToken: null,
        inviteExpiresAt: null,
      },
      include: {
        appointedBy: { select: { fullName: true } }
      }
    });

    await this.auditLogsService.logAction(
      approver.sub,
      'reject_admin',
      `Rejected administrator request: ${admin.email}`
    );

    return {
      ...updatedAdmin,
      appointedByName: updatedAdmin.appointedBy?.fullName || null
    };
  }

  async deleteAdmin(id: string, user: any) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');
    
    // Prevent deleting the root admin
    if (admin.role === 'ROOT_SUPERADMIN') {
      throw new Error('Cannot delete the root superadmin');
    }

    // Clean up foreign key relations first in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Delete all audit logs associated with this admin
      await tx.superAdminAuditLog.deleteMany({
        where: { actorId: id }
      });

      // 2. Set appointedById to null for any admins this person appointed
      await tx.superAdmin.updateMany({
        where: { appointedById: id },
        data: { appointedById: null }
      });

      // 3. Delete the admin safely
      return tx.superAdmin.delete({
        where: { id }
      });
    });

    if (user && user.sub) {
      await this.auditLogsService.logAction(
        user.sub,
        'delete_admin',
        `Deleted administrator: ${admin.email} (${admin.fullName})`
      );
    }

    return result;
  }

  async updateAdmin(id: string, data: { fullName?: string, password?: string }, user: any) {
    if (user.sub !== id && user.role !== 'ROOT_SUPERADMIN') {
      throw new Error('You do not have permission to edit this profile');
    }

    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');

    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    
    if (data.password) {
      const bcrypt = require('bcryptjs');
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const result = await this.prisma.superAdmin.update({
      where: { id },
      data: updateData,
    });

    if (user && user.sub) {
      await this.auditLogsService.logAction(
        user.sub,
        'update_admin',
        `Updated administrator profile: ${admin.email}`
      );
    }

    return {
      id: result.id,
      fullName: result.fullName,
      email: result.email,
    };
  }

  async resendInvite(id: string, user: any) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');
    
    if (admin.status !== 'INVITED') {
      throw new Error('Can only resend invitations to administrators with INVITED status');
    }

    // Guardrail: Enforce a 60-second cooldown per administrator to prevent spam
    const now = Date.now();
    const lastSent = this.inviteCooldowns.get(id);
    if (lastSent && now - lastSent < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
      throw new BadRequestException(`Please wait ${remainingSeconds} seconds before resending.`);
    }
    this.inviteCooldowns.set(id, now);

    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

    await this.prisma.superAdmin.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt }
    });

    if (user && user.sub) {
      await this.auditLogsService.logAction(
        user.sub,
        'resend_invite',
        `Resent invitation email to: ${admin.email}`
      );
    }

    // Log the invite link since we disabled the mail service
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${inviteToken}`;
    console.log(`[No Email Service yet, manually copy and paste invite token for now]: ${inviteLink}`);

    return { success: true, message: 'Invitation resent successfully' };
  }
}
