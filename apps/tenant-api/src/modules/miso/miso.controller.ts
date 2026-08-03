import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MisoService } from './miso.service';

@Controller('miso')
@UseGuards(AuthGuard('jwt'))
export class MisoController {
  constructor(private readonly misoService: MisoService) {}

  @Get('staff')
  getStaff(@Req() req) {
    return this.misoService.getStaff(req.user.orgCode);
  }

  @Post('staff/:id/verify')
  verifyStaff(@Req() req, @Param('id') staffId: string) {
    return this.misoService.verifyStaff(req.user.orgCode, staffId);
  }

  @Post('staff/:id/suspend')
  suspendStaff(@Req() req, @Param('id') staffId: string) {
    return this.misoService.suspendStaff(req.user.orgCode, staffId);
  }

  @Get('roles')
  getRoles(@Req() req) {
    return this.misoService.getRoles(req.user.orgCode);
  }

  @Put('staff/:id/role')
  updateStaffRole(
    @Req() req, 
    @Param('id') staffId: string, 
    @Body() dto: { roleId: string }
  ) {
    return this.misoService.updateStaffRole(req.user.orgCode, staffId, dto.roleId);
  }
}
