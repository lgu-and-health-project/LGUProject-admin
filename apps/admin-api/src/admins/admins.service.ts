import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

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

  async inviteAdmin(data: { email: string; fullName: string }) {
    // Temp: Find a root admin to be the appointer
    const rootAdmin = await this.prisma.superAdmin.findFirst({
      where: { role: 'ROOT_SUPERADMIN' }
    });

    // Generate random string for invite token (Node.js crypto)
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Expires in 7 days
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

    const newAdmin = await this.prisma.superAdmin.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: 'ADMIN',
        status: 'INVITED',
        inviteToken,
        inviteExpiresAt,
        appointedById: rootAdmin?.id,
      },
      include: {
        appointedBy: {
          select: { fullName: true }
        }
      }
    });

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

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteToken: null,
        inviteExpiresAt: null,
      }
    });
  }

  async rejectInvite(data: { token: string }) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { inviteToken: data.token }
    });

    if (!admin) {
      throw new Error('Invalid or expired invite token');
    }

    return this.prisma.superAdmin.update({
      where: { id: admin.id },
      data: {
        status: 'REJECTED',
        inviteToken: null,
        inviteExpiresAt: null,
      }
    });
  }

  async deleteAdmin(id: string) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id } });
    if (!admin) throw new Error('Administrator not found');
    
    // Prevent deleting the root admin
    if (admin.role === 'ROOT_SUPERADMIN') {
      throw new Error('Cannot delete the root superadmin');
    }

    return this.prisma.superAdmin.delete({
      where: { id }
    });
  }
}
