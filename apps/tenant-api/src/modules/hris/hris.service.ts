import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class HrisService {
  constructor(private prisma: PrismaService) {}

  async logAttendance(orgCode: string, staffId: string, dto: CreateAttendanceDto) {
    return this.prisma.attendanceLog.create({
      data: {
        staffUserId: staffId,
        status: dto.type, // Map check-in/out to status
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async getStaffAttendance(orgCode: string, staffId: string) {
    return this.prisma.attendanceLog.findMany({
      where: { staffUserId: staffId, staffUser: { orgCode } },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getAllAttendance(orgCode: string) {
    return this.prisma.attendanceLog.findMany({
      where: { staffUser: { orgCode } },
      orderBy: { timestamp: 'desc' },
      include: { staffUser: { select: { name: true, office: true } } }
    });
  }

  async getMyLeaveRequests(orgCode: string, staffId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { staffUserId: staffId, staffUser: { orgCode } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveRequest(orgCode: string, staffId: string, type: string, startDate: Date, endDate: Date, reason: string) {
    return this.prisma.leaveRequest.create({
      data: {
        staffUserId: staffId,
        type,
        startDate,
        endDate,
        reason,
        status: 'pending'
      }
    });
  }

  async getMyPayroll(orgCode: string, staffId: string) {
    return this.prisma.payroll.findMany({
      where: { staffUserId: staffId, staffUser: { orgCode } },
      orderBy: { periodStart: 'desc' },
    });
  }
}
