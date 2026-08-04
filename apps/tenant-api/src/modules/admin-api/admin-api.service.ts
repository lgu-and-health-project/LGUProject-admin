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
  private internalServiceSecret: string | undefined;
  /** In-memory cache so cron jobs pick up the key immediately after pairing. */
  private cachedRegistrationKey: string | null = null;

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.adminApiUrl =
      this.configService.get<string>('ADMIN_API_URL') ||
      'http://localhost:4000';
    this.internalServiceSecret = this.configService.get<string>(
      'INTERNAL_SERVICE_SECRET',
    );
  }

  /**
   * Returns headers required by admin-api's InternalServiceGuard.
   * All calls to /internal/* MUST include this.
   */
  private getInternalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.internalServiceSecret) {
      headers['x-service-auth'] = this.internalServiceSecret;
    }
    return headers;
  }

  async verifyRegistrationKey(registrationKey: string) {
    try {
      const url = `${this.adminApiUrl}/internal/tenants/verify/${registrationKey}`;
      const response = await firstValueFrom(
        this.httpService.get(url, { headers: this.getInternalHeaders() }),
      );
      return response.data;
    } catch (error: any) {
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
      const response = await firstValueFrom(
        this.httpService.post(url, {}, { headers: this.getInternalHeaders() }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to complete setup on admin-api: ${error.message}`,
      );
      // Non-fatal, just log it, but we can throw if we want strict consistency
    }
  }

  public async getRegistrationKey(): Promise<string | null> {
    // 1. In-memory cache (fastest – set during pairing or first DB hit)
    if (this.cachedRegistrationKey) return this.cachedRegistrationKey;

    // 2. Environment variable (for pre-configured deployments)
    const envKey = this.configService.get<string>('DEVICE_REGISTRATION_KEY');
    if (envKey) {
      this.cachedRegistrationKey = envKey;
      return envKey;
    }

    // 3. SystemConfig table (persisted during pairing – survives container restarts)
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'DEVICE_REGISTRATION_KEY' },
      });
      if (config?.value) {
        this.cachedRegistrationKey = config.value;
        return config.value;
      }
    } catch {
      // Table may not exist yet if migration hasn't run – fall through
    }

    // 4. Organization table (populated during onboarding step 2)
    const org = await this.prisma.organization.findFirst({
      where: { registrationKey: { not: '' } },
    });
    if (org?.registrationKey) {
      this.cachedRegistrationKey = org.registrationKey;
      return org.registrationKey;
    }

    return null;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async pollTenantStatus() {
    this.logger.log('Polling tenant status from admin-api...');
    const registrationKey = await this.getRegistrationKey();

    if (!registrationKey) {
      this.logger.warn(
        'No registration key found in env or db. Skipping poll.',
      );
      return;
    }

    try {
      const result = await this.verifyRegistrationKey(registrationKey);

      if (result.valid) {
        // The endpoint verify is expected to return tenant info if valid
        const orgCode = result.tenant?.psgcCode;
        if (orgCode) {
          const org = await this.prisma.organization.findUnique({
            where: { code: orgCode },
          });
          if (org && org.status !== 'active') {
            await this.prisma.organization.update({
              where: { code: orgCode },
              data: { status: 'active' },
            });
            this.logger.log(
              `Organization ${orgCode} status updated to active.`,
            );
          }
        }
      } else if (result.reason === 'SUSPENDED') {
        const orgCode = result.tenant?.psgcCode;
        if (orgCode) {
          const org = await this.prisma.organization.findUnique({
            where: { code: orgCode },
          });
          if (org && org.status !== 'suspended') {
            await this.prisma.organization.update({
              where: { code: orgCode },
              data: { status: 'suspended' },
            });
            this.logger.log(
              `Organization ${orgCode} status updated to suspended.`,
            );
          }
        }
      }
    } catch (error: any) {
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
      const myApiUrl =
        this.configService.get<string>('PUBLIC_API_URL') ||
        `http://localhost:${process.env.PORT || 4001}`;
      const url = `${this.adminApiUrl}/internal/tenants/heartbeat/${registrationKey}`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { apiUrl: myApiUrl },
          { headers: this.getInternalHeaders() },
        ),
      );
      this.logger.log(`Heartbeat sent successfully.`);
    } catch (error: any) {
      this.logger.error(`Error sending heartbeat: ${error.message}`);
    }
  }

  async pairDeviceAndSave(pairingToken: string): Promise<void> {
    try {
      const url = `${this.adminApiUrl}/api/devices/pair`;
      const response = await firstValueFrom(
        this.httpService.post(url, { token: pairingToken }),
      );
      const { licenseKey } = response.data;

      if (!licenseKey) {
        throw new Error('No license key returned');
      }

      // Persist to database so the key survives container restarts.
      // Previously this wrote to .env + called process.exit(0), which was
      // ephemeral inside Docker containers — the key was lost on restart.
      await this.prisma.systemConfig.upsert({
        where: { key: 'DEVICE_REGISTRATION_KEY' },
        update: { value: licenseKey },
        create: { key: 'DEVICE_REGISTRATION_KEY', value: licenseKey },
      });

      // Cache in memory so heartbeat/poll crons pick it up immediately
      this.cachedRegistrationKey = licenseKey;

      this.logger.log(
        'Registration key saved to database. Device paired successfully.',
      );
    } catch (error: any) {
      this.logger.error(`Failed to pair device: ${error.message}`);
      throw error;
    }
  }
}
