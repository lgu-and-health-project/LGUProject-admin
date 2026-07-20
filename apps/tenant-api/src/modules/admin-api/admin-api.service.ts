import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiService {
  private readonly logger = new Logger(AdminApiService.name);
  private adminApiUrl: string;

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.adminApiUrl = this.configService.get<string>('ADMIN_API_URL') || 'http://localhost:4000';
  }

  async verifyRegistrationKey(registrationKey: string) {
    try {
      const url = `${this.adminApiUrl}/internal/tenants/verify/${registrationKey}`;
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to verify registration key: ${error.message}`);
      if (error.response?.status === 404) {
        return { valid: false, reason: 'NOT_FOUND' };
      }
      if (error.response?.status === 403) {
        return { valid: false, reason: 'SUSPENDED' };
      }
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async pollTenantStatus() {
    this.logger.log('Polling tenant status from admin-api...');
    const organizations = await this.prisma.organization.findMany();
    
    for (const org of organizations) {
      if (!org.registrationKey) {
        this.logger.warn(`Organization ${org.code} has no registrationKey, skipping poll.`);
        continue;
      }
      
      try {
        const result = await this.verifyRegistrationKey(org.registrationKey);
        
        if (result.valid) {
          if (org.status !== 'active') {
            await this.prisma.organization.update({
              where: { code: org.code },
              data: { status: 'active' },
            });
            this.logger.log(`Organization ${org.code} status updated to active.`);
          }
        } else if (result.reason === 'SUSPENDED') {
          if (org.status !== 'suspended') {
            await this.prisma.organization.update({
              where: { code: org.code },
              data: { status: 'suspended' },
            });
            this.logger.log(`Organization ${org.code} status updated to suspended.`);
          }
        }
      } catch (error) {
        this.logger.error(`Error polling status for organization ${org.code}: ${error.message}`);
      }
    }
    this.logger.log('Polling tenant status complete.');
  }
}
