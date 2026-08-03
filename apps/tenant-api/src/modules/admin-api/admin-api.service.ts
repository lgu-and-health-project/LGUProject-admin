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

  async completeSetup(registrationKey: string) {
    try {
      const url = `${this.adminApiUrl}/internal/tenants/complete-setup/${registrationKey}`;
      const response = await firstValueFrom(this.httpService.post(url));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to complete setup on admin-api: ${error.message}`);
      // Non-fatal, just log it, but we can throw if we want strict consistency
    }
  }

  public async getRegistrationKey(): Promise<string | null> {
    const envKey = this.configService.get<string>('DEVICE_REGISTRATION_KEY');
    if (envKey) return envKey;
    
    const org = await this.prisma.organization.findFirst({
      where: { registrationKey: { not: '' } }
    });
    return org?.registrationKey || null;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async pollTenantStatus() {
    this.logger.log('Polling tenant status from admin-api...');
    const registrationKey = await this.getRegistrationKey();
    
    if (!registrationKey) {
      this.logger.warn('No registration key found in env or db. Skipping poll.');
      return;
    }

    try {
      const result = await this.verifyRegistrationKey(registrationKey);
      
      if (result.valid) {
        // The endpoint verify is expected to return tenant info if valid
        const orgCode = result.tenant?.psgcCode;
        if (orgCode) {
          const org = await this.prisma.organization.findUnique({ where: { code: orgCode } });
          if (org && org.status !== 'active') {
            await this.prisma.organization.update({
              where: { code: orgCode },
              data: { status: 'active' },
            });
            this.logger.log(`Organization ${orgCode} status updated to active.`);
          }
        }
      } else if (result.reason === 'SUSPENDED') {
        const orgCode = result.tenant?.psgcCode;
        if (orgCode) {
          const org = await this.prisma.organization.findUnique({ where: { code: orgCode } });
          if (org && org.status !== 'suspended') {
            await this.prisma.organization.update({
              where: { code: orgCode },
              data: { status: 'suspended' },
            });
            this.logger.log(`Organization ${orgCode} status updated to suspended.`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error polling status: ${error.message}`);
    }
    
    this.logger.log('Polling tenant status complete.');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pingHeartbeat() {
    this.logger.log('Sending heartbeat to admin-api...');
    const registrationKey = await this.getRegistrationKey();
    
    if (!registrationKey) {
      this.logger.debug('No registration key available for heartbeat.');
      return;
    }
    
    try {
      const url = `${this.adminApiUrl}/internal/tenants/heartbeat/${registrationKey}`;
      await firstValueFrom(this.httpService.post(url));
      this.logger.log(`Heartbeat sent successfully.`);
    } catch (error) {
      this.logger.error(`Error sending heartbeat: ${error.message}`);
    }
  }

  async pairDeviceAndSave(pairingToken: string): Promise<void> {
    try {
      const url = `${this.adminApiUrl}/api/devices/pair`;
      const response = await firstValueFrom(this.httpService.post(url, { token: pairingToken }));
      const { licenseKey } = response.data;

      if (!licenseKey) {
        throw new Error('No license key returned');
      }

      // Write to .env
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env');
      
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent.includes('DEVICE_REGISTRATION_KEY=')) {
        envContent = envContent.replace(/DEVICE_REGISTRATION_KEY=.*/g, `DEVICE_REGISTRATION_KEY=${licenseKey}`);
      } else {
        envContent += `\nDEVICE_REGISTRATION_KEY=${licenseKey}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      this.logger.log('Credentials saved to .env. Restarting service to apply changes...');
      
      // Delay exit slightly to allow response to complete if possible, though TRPC will likely fail if exit is too fast.
      setTimeout(() => process.exit(0), 1000);
    } catch (error) {
      this.logger.error(`Failed to pair device: ${error.message}`);
      throw error;
    }
  }
}
