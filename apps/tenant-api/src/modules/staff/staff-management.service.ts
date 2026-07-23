import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
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

    const existingUser = await this.prisma.staffUser.findUnique({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    // In a real system, you would send an invite email.
    // Here we will just create the user with a default password or no password if they use SSO.
    // Let's set a default password of "Welcome123!" for now for testing purposes.
    const defaultPassword = "Welcome123!";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    return this.prisma.staffUser.create({
      data: {
        orgCode: user.orgCode,
        email: dto.email,
        name: dto.name,
        office: dto.office,
        baseRole: dto.baseRole,
        passwordHash,
        status: 'active', // Can be 'invited' if we build an invite flow later
      }
    });
  }
}
