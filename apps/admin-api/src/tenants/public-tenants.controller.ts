import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantStatus } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api/tenants')
export class PublicTenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @SkipThrottle()
  @Get('discovery/:psgcCode')
  async discover(@Param('psgcCode') psgcCode: string) {
    const tenant = await this.prisma.lguTenants.findFirst({
      where: {
        psgcLocation: { code: psgcCode },
        status: { in: [TenantStatus.active, TenantStatus.suspended] },
      },
      select: {
        apiUrl: true,
        status: true,
      }
    });

    if (!tenant) {
      throw new NotFoundException('LGU not found or not registered yet');
    }
    
    if (!tenant.apiUrl) {
      throw new NotFoundException('LGU is registered but has not broadcasted its API URL yet');
    }

    return {
      apiUrl: tenant.apiUrl,
      status: tenant.status,
    };
  }
}
