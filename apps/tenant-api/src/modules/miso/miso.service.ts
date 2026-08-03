import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MisoService {
  constructor(private prisma: PrismaService) {}

  async getStaff(orgCode: string) {
    return this.prisma.staffUser.findMany({
      where: { orgCode },
      orderBy: { createdAt: 'desc' },
      include: {
        role: { select: { roleName: true } },
      },
    });
  }

  async verifyStaff(orgCode: string, staffId: string) {
    const user = await this.prisma.staffUser.findFirst({
      where: { id: staffId, orgCode },
    });
    if (!user) throw new NotFoundException('Staff not found');

    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: { status: 'active' }, // Set to active once verified
    });
  }

  async suspendStaff(orgCode: string, staffId: string) {
    const user = await this.prisma.staffUser.findFirst({
      where: { id: staffId, orgCode },
    });
    if (!user) throw new NotFoundException('Staff not found');

    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: { status: 'suspended' },
    });
  }

  async updateStaffRole(orgCode: string, staffId: string, roleId: string) {
    const user = await this.prisma.staffUser.findFirst({
      where: { id: staffId, orgCode },
    });
    if (!user) throw new NotFoundException('Staff not found');

    const role = await this.prisma.role.findFirst({
      where: { id: roleId, orgCode },
    });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        roleId: role.id,
        baseRole: role.roleName, // Kept in sync with role
      },
    });
  }

  async getRoles(orgCode: string) {
    return this.prisma.role.findMany({
      where: { orgCode },
      orderBy: { roleName: 'asc' },
    });
  }
}
