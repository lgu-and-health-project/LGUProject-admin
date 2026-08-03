import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddStaffInput } from './dto/add-staff.input';
import * as bcrypt from 'bcrypt';

interface RequestUser {
  userId: string;
  orgCode: string;
  departmentId: string | null;
  role?: string | null;
}

@Injectable()
export class StaffManagementService {
  constructor(private prisma: PrismaService) {}

  async listStaff(user: RequestUser) {
    if (user.role !== 'sysadmin') {
      throw new ForbiddenException('Only sysadmin can view all staff');
    }

    return this.prisma.staffUser.findMany({
      where: { orgCode: user.orgCode },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addStaff(user: RequestUser, dto: AddStaffInput) {
    if (user.role !== 'sysadmin') {
      throw new ForbiddenException('Only sysadmin can add staff');
    }

    const existingUser = await this.prisma.staffUserCredentials.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role || role.orgCode !== user.orgCode) {
      throw new NotFoundException('Role not found for this organization');
    }

    // In a real system, send an invite email instead of a default password.
    const defaultPassword = 'Welcome123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    return this.prisma.staffUser.create({
      data: {
        orgCode: user.orgCode,
        email: dto.email,
        name: dto.name,
        office: dto.office,
        roleId: role.id,
        baseRole: role.roleName, // kept in sync for display; roleId is the source of truth
        status: 'pending', // MISO verifies this later
        credentials: {
          create: {
            email: dto.email,
            passwordHash,
          },
        },
      },
    });
  }
}
