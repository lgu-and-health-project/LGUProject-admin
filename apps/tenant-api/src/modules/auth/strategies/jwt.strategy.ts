import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  role: string | null;
  roleId: string | null;
  orgCode: string;
  departmentId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          (req?.cookies as Record<string, string> | undefined)?.session ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      roleId: payload.roleId,
      orgCode: payload.orgCode,
      departmentId: payload.departmentId,
    };
  }
}
