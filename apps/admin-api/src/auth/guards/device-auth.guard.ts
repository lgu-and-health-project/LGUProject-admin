import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseStatus, TenantStatus } from '@prisma/client';
import type { Request } from 'express';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // We expect the key to come from the URL param for now based on existing endpoints.
    // If it's eventually passed via header, we can extract it there.
    const registrationKey = request.params.registrationKey || request.headers['x-registration-key'];

    if (!registrationKey || typeof registrationKey !== 'string') {
      throw new UnauthorizedException('Missing registration key');
    }

    const license = await this.prisma.licenses.findUnique({
      where: { registrationKey },
      include: { 
        device: true,
        tenant: {
          include: { psgcLocation: true }
        } 
      },
    });

    if (!license) {
      throw new NotFoundException('Invalid registration key');
    }

    if (license.status !== LicenseStatus.active) {
      throw new ForbiddenException('License is not active');
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      throw new ForbiddenException('License has expired');
    }

    const tenant = license.tenant;
    if (
      tenant.status !== TenantStatus.active &&
      tenant.status !== TenantStatus.pending_setup
    ) {
      throw new ForbiddenException({
        message: 'Tenant is suspended',
        tenant,
      });
    }

    // FUTURE PROOFING: Certificate-based auth check
    if (license.device?.certFingerprint) {
      // TODO: In a future upgrade, when certFingerprint is set on the device,
      // we must verify the incoming mTLS certificate fingerprint (or signature)
      // matches this record and that certExpiresAt has not passed.
      // e.g.:
      // const clientCert = request.socket.getPeerCertificate();
      // if (clientCert.fingerprint !== license.device.certFingerprint) throw new UnauthorizedException('Invalid cert');
    } else {
      // Currently active check: Shared-secret via registrationKey
      // The fact we fetched the valid license via the registrationKey above serves as the shared secret check
    }

    // Attach to request so routes don't have to query the DB again
    (request as any).deviceAuth = {
      license,
      device: license.device,
      tenant: license.tenant,
    };

    return true;
  }
}
