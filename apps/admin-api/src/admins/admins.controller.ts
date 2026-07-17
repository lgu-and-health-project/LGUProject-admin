import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  async getAdmins() {
    return this.adminsService.findAll();
  }

  @Post('invite')
  async inviteAdmin(@Body() body: { email: string; fullName: string }) {
    return this.adminsService.inviteAdmin(body);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: { token: string; password: string }) {
    return this.adminsService.acceptInvite(body);
  }

  @Post('reject-invite')
  async rejectInvite(@Body() body: { token: string }) {
    return this.adminsService.rejectInvite(body);
  }

  @Delete(':id')
  async deleteAdmin(@Param('id') id: string) {
    return this.adminsService.deleteAdmin(id);
  }
}
