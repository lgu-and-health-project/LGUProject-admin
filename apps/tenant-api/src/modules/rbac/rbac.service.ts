import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestUser {
  userId: string;
  orgCode: string;
  officeId: string | null;
}

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async listTabs() {
    return this.prisma.tab.findMany({ orderBy: { id: 'asc' } });
  }

  async resolvePermissions(user: RequestUser) {
    if (!user.officeId) {
      return {};
    }

    const allocations = await this.prisma.officeTabAllocation.findMany({
      where: {
        orgCode: user.orgCode,
        officeId: user.officeId,
        isActive: true,
      },
      include: { tab: true },
    });

    const staffUser = await this.prisma.staffUser.findUnique({
      where: { id: user.userId },
      select: { roleId: true },
    });

    const rolePermissions = staffUser?.roleId
      ? await this.prisma.roleTabPermission.findMany({
          where: { roleId: staffUser.roleId },
        })
      : [];

    const overrides = await this.prisma.staffPermissionOverride.findMany({
      where: { staffUserId: user.userId },
    });

    const permissions: Record<string, any> = {};

    for (const alloc of allocations) {
      const tabId = alloc.tabId;
      const rolePerm = rolePermissions.find((rp) => rp.tabId === tabId) || {
        canRead: false,
        canReadScoped: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
        canSign: false,
      };

      const override = overrides.find((o) => o.tabId === tabId);

      permissions[tabId] = {
        canRead: override?.canRead ?? rolePerm.canRead,
        canReadScoped: override?.canReadScoped ?? rolePerm.canReadScoped,
        canCreate: override?.canCreate ?? rolePerm.canCreate,
        canUpdate: override?.canUpdate ?? rolePerm.canUpdate,
        canDelete: override?.canDelete ?? rolePerm.canDelete,
        canApprove: override?.canApprove ?? rolePerm.canApprove,
        canExport: override?.canExport ?? rolePerm.canExport,
        canSign: override?.canSign ?? rolePerm.canSign,
      };
    }

    return permissions;
  }

  private async isSysadmin(user: RequestUser) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: user.userId },
      include: { role: true },
    });
    return staff?.role?.roleName === 'sysadmin';
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
      officeCategory: r.officeCategory,
      isSystemDefault: r.isSystemDefault,
      staffCount: r.staff.length,
      permissions: r.permissions,
    }));
  }

  async assignRole(user: RequestUser, staffUserId: string, roleId: string) {
    if (!(await this.isSysadmin(user))) {
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

    return this.prisma.staffUser.update({
      where: { id: staffUserId },
      data: { roleId: role.id },
      include: { role: true },
    });
  }

  async deleteRole(user: RequestUser, roleId: string) {
    if (!(await this.isSysadmin(user))) {
      throw new ForbiddenException('Only sysadmin can delete roles');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.orgCode !== user.orgCode) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemDefault) {
      throw new ForbiddenException('Cannot delete system-default roles');
    }

    await this.prisma.roleTabPermission.deleteMany({
      where: { roleId },
    });

    const deletedRole = await this.prisma.role.delete({
      where: { id: roleId },
      include: { permissions: true, staff: { select: { id: true } } },
    });

    return {
      id: deletedRole.id,
      roleName: deletedRole.roleName,
      officeCategory: deletedRole.officeCategory,
      isSystemDefault: deletedRole.isSystemDefault,
      staffCount: deletedRole.staff.length,
      permissions: deletedRole.permissions,
      orgCode: deletedRole.orgCode,
    };
  }

  async createRole(
    user: RequestUser,
    roleName: string,
    officeCategory: string,
    permissions: {
      tabId: string;
      canRead: boolean;
      canReadScoped: boolean;
      canCreate: boolean;
      canUpdate: boolean;
      canDelete: boolean;
      canApprove: boolean;
      canExport: boolean;
      canSign: boolean;
    }[],
  ) {
    if (!(await this.isSysadmin(user))) {
      throw new ForbiddenException('Only sysadmin can create roles');
    }

    const role = await this.prisma.role.create({
      data: {
        orgCode: user.orgCode,
        roleName: roleName,
        officeCategory: officeCategory,
        isSystemDefault: false,
        permissions: {
          create: permissions.map((p) => ({
            tabId: p.tabId,
            canRead: p.canRead,
            canReadScoped: p.canReadScoped,
            canCreate: p.canCreate,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
            canExport: p.canExport,
            canSign: p.canSign,
          })),
        },
      },
      include: { permissions: true, staff: { select: { id: true } } },
    });

    return {
      id: role.id,
      roleName: role.roleName,
      officeCategory: role.officeCategory,
      isSystemDefault: role.isSystemDefault,
      staffCount: role.staff.length,
      permissions: role.permissions,
      orgCode: role.orgCode,
    };
  }
}
