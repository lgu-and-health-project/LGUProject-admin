import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatus } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('No token found');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const admin = await this.prisma.superAdmins.findUnique({
      where: { superadminId: payload.sub },
    });

    if (!admin) {
      throw new UnauthorizedException('Account no longer exists');
    }

    if (admin.status === AdminStatus.REVOKED) {
      throw new UnauthorizedException('Account has been restricted');
    }

    // request['user'] is consumed by RolesGuard and every controller that
    // reads req['user'] to know who's calling.
    request['user'] = payload;
    return true;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    if (request.cookies?.access_token) {
      return request.cookies.access_token as string;
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
