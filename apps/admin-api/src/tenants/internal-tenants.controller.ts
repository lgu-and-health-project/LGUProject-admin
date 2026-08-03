import {
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';
import { DeviceAuthGuard } from '../auth/guards/device-auth.guard';
import { DeviceAuth } from '../auth/decorators/device-auth.decorator';
import type { DeviceAuthPayload } from '../auth/decorators/device-auth.decorator';

// Cross-service only - called by the tenant/staff server, never a browser.
@UseGuards(InternalServiceGuard)
@Controller('internal/tenants')
export class InternalTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('verify/:registrationKey')
  @UseGuards(DeviceAuthGuard)
  async verify(@DeviceAuth() auth: DeviceAuthPayload) {
    // The guard handles all verification checks. If we reach here, it's valid.
    return {
      valid: true as const,
      tenant: auth.tenant,
      expectedEmail: auth.tenant.sysadminEmail,
    };
  }

  @Post('complete-setup/:registrationKey')
  @UseGuards(DeviceAuthGuard)
  async completeSetup(@DeviceAuth() auth: DeviceAuthPayload) {
    return this.tenantsService.completeSetup(auth.license.tenantId);
  }

  @Post('heartbeat/:registrationKey')
  @UseGuards(DeviceAuthGuard)
  async heartbeat(@DeviceAuth() auth: DeviceAuthPayload) {
    return this.tenantsService.recordHeartbeat(auth.license, auth.device);
  }
}
