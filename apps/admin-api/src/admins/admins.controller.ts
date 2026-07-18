import { Controller, Get, Post, Put, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAdmins() {
    return this.adminsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  async inviteAdmin(@Body() body: { email: string; fullName: string }, @Req() req: Request) {
    const user = req['user'] as any;
    return this.adminsService.inviteAdmin(body, user);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: { token: string; password: string }) {
    return this.adminsService.acceptInvite(body);
  }

  @Post('reject-invite')
  async rejectInvite(@Body() body: { token: string }) {
    return this.adminsService.rejectInvite(body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteAdmin(@Param('id') id: string, @Req() req: Request) {
    return this.adminsService.deleteAdmin(id, req['user']);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  async approveAdmin(@Param('id') id: string, @Req() req: Request) {
    return this.adminsService.approveAdmin(id, req['user']);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/resend')
  async resendInvite(@Param('id') id: string, @Req() req: Request) {
    return this.adminsService.resendInvite(id, req['user']);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  async rejectPendingAdmin(@Param('id') id: string, @Req() req: Request) {
    return this.adminsService.rejectPendingAdmin(id, req['user']);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateAdmin(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.adminsService.updateAdmin(id, body, req['user']);
  }
}
