import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestUser {
  userId: string;
  orgCode: string;
  role: string | null;
}

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  // Modules are global reference data (seeded once), not per-org — every
  // tenant server shares the same module vocabulary as the frontend registry.
  listModules() {
    return this.prisma.module.findMany({ orderBy: { id: 'asc' } });
  }

  async listRoles(user: RequestUser) {
    const roles = await this.prisma.role.findMany({
      where: { orgCode: user.orgCode },
      include: { permissions: true, staff: { select: { id: true } } },
      orderBy: { roleName: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      isSystemDefault: r.isSystemDefault,
      staffCount: r.staff.length,
      permissions: r.permissions,
    }));
  }

  async assignRole(user: RequestUser, staffUserId: string, roleId: string) {
    if (user.role !== 'sysadmin') {
      throw new ForbiddenException('Only sysadmin can assign roles');
    }

    const [staff, role] = await Promise.all([
      this.prisma.staffUser.findUnique({ where: { id: staffUserId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!staff || staff.orgCode !== user.orgCode) {
      throw new NotFoundException('Staff member not found');
    }
    if (!role || role.orgCode !== user.orgCode) {
      throw new NotFoundException('Role not found');
    }

    // NOTE: this is where the future "requires a plantilla / HR appointment
    // document" check belongs — verify an approved AppointmentRequest exists
    // for (staffUserId, roleId) before allowing the update, once that table
    // exists. Left as a TODO rather than half-built here.

    return this.prisma.staffUser.update({
      where: { id: staffUserId },
      data: { roleId: role.id, baseRole: role.roleName },
      include: { role: true },
    });
  }

  async deleteRole(user: RequestUser, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.orgCode !== user.orgCode) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemDefault) {
      throw new ForbiddenException('Cannot delete system-default roles');
    }

    // Must delete related role permissions first due to foreign key constraints
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    const deletedRole = await this.prisma.role.delete({
      where: { id: roleId },
      include: { permissions: true, staff: { select: { id: true } } },
    });

    return {
      id: deletedRole.id,
      roleName: deletedRole.roleName,
      isSystemDefault: deletedRole.isSystemDefault,
      staffCount: deletedRole.staff.length,
      permissions: deletedRole.permissions,
      orgCode: deletedRole.orgCode,
    };
  }

  async createRole(user: RequestUser, roleName: string, permissions: any[]) {
    if (user.role !== 'sysadmin') {
      throw new ForbiddenException('Only sysadmin can create roles');
    }

    const role = await this.prisma.role.create({
      data: {
        orgCode: user.orgCode,
        roleName: roleName,
        isSystemDefault: false,
        permissions: {
          create: permissions.map(p => ({
            module: p.module,
            canCreate: p.canCreate,
            canRead: p.canRead,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
          })),
        },
      },
      include: { permissions: true, staff: { select: { id: true } } },
    });

    return {
      id: role.id,
      roleName: role.roleName,
      isSystemDefault: role.isSystemDefault,
      staffCount: role.staff.length,
      permissions: role.permissions,
      orgCode: role.orgCode,
    };
  }
}
