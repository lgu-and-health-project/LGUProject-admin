import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HrisService } from './hris.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

import { Request } from 'express';
import { JwtPayload } from '../../trpc/trpc.service';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('hris')
@UseGuards(AuthGuard('jwt'))
export class HrisController {
  constructor(private readonly hrisService: HrisService) {}

  @Post('attendance')
  logAttendance(@Req() req: RequestWithUser, @Body() dto: CreateAttendanceDto) {
    return this.hrisService.logAttendance(
      req.user.orgCode,
      req.user.userId,
      dto,
    );
  }

  @Get('attendance/me')
  getMyAttendance(@Req() req: RequestWithUser) {
    return this.hrisService.getStaffAttendance(
      req.user.orgCode,
      req.user.userId,
    );
  }

  @Get('attendance')
  getAllAttendance(@Req() req: RequestWithUser) {
    // Should check if user has HR access
    return this.hrisService.getAllAttendance(req.user.orgCode);
  }

  @Get('leave-requests/me')
  getMyLeaveRequests(@Req() req: RequestWithUser) {
    return this.hrisService.getMyLeaveRequests(
      req.user.orgCode,
      req.user.userId,
    );
  }

  @Post('leave-requests')
  createLeaveRequest(
    @Req() req: RequestWithUser,
    @Body()
    dto: { type: string; startDate: string; endDate: string; reason: string },
  ) {
    return this.hrisService.createLeaveRequest(
      req.user.orgCode,
      req.user.userId,
      dto.type,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.reason,
    );
  }

  @Get('payroll/me')
  getMyPayroll(@Req() req: RequestWithUser) {
    return this.hrisService.getMyPayroll(req.user.orgCode, req.user.userId);
  }
}
