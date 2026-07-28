import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Guards routes meant to be called ONLY by other internal services (e.g. the
 * tenant/staff server checking a registration key), never by end users or
 * the public internet. Checks a shared secret header.
 *
 * This was previously MISSING entirely from InternalTenantsController -
 * /internal/tenants/verify/:key and /complete-setup/:key were reachable by
 * anyone with the URL, with no authentication at all.
 *
 * NOTE: a shared secret is the minimum viable fix. Per the architecture
 * discussion, mTLS or a signed short-lived JWT minted specifically for
 * inter-service calls is the stronger long-term option.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-service-auth'];
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

    if (!expectedSecret) {
      // Fail closed: if the secret isn't configured, refuse rather than
      // silently allowing every request through.
      throw new UnauthorizedException('Internal service auth not configured');
    }

    if (providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid service credentials');
    }

    return true;
  }
}
