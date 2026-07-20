import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Post()
  createTenant(@Body() body: any, @Request() req: any) {
    return this.tenantsService.createTenant(body, req.user);
  }

  @Put(':id/suspend')
  suspendTenant(@Param('id') id: string, @Request() req: any) {
    return this.tenantsService.suspendTenant(id, req.user);
  }

  @Put(':id/activate')
  activateTenant(@Param('id') id: string, @Request() req: any) {
    return this.tenantsService.activateTenant(id, req.user);
  }

  @Delete(':id')
  deleteTenant(@Param('id') id: string, @Request() req: any) {
    return this.tenantsService.deleteTenant(id, req.user);
  }
}

