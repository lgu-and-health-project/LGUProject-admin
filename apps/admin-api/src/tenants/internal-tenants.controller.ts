import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';

// Cross-service only - called by the tenant/staff server, never a browser.
@UseGuards(InternalServiceGuard)
@Controller('internal/tenants')
export class InternalTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('verify/:registrationKey')
  async verify(@Param('registrationKey') registrationKey: string) {
    const result =
      await this.tenantsService.verifyRegistrationKey(registrationKey);

    if (!result.valid) {
      if (result.reason === 'NOT_FOUND') {
        throw new NotFoundException('Invalid registration key');
      }
      if (result.reason === 'SUSPENDED') {
        throw new ForbiddenException({
          message: 'Tenant is suspended',
          tenant: result.tenant,
        });
      }
    }

    return result;
  }

  @Post('complete-setup/:registrationKey')
  async completeSetup(@Param('registrationKey') registrationKey: string) {
    return this.tenantsService.completeSetup(registrationKey);
  }

  @Post('heartbeat/:registrationKey')
  async heartbeat(@Param('registrationKey') registrationKey: string) {
    return this.tenantsService.recordHeartbeat(registrationKey);
  }
}
