import { Injectable, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string | null;
  roleId: string | null;
  orgCode: string;
  departmentId: string | null;
}

export interface TrpcContext {
  user: JwtPayload | null;
  reqIp?: string;
  userAgent?: string;
}

function mapHttpStatus(status: number) {
  switch (status) {
    case 400:
      return 'BAD_REQUEST' as const;
    case 401:
      return 'UNAUTHORIZED' as const;
    case 403:
      return 'FORBIDDEN' as const;
    case 404:
      return 'NOT_FOUND' as const;
    case 409:
      return 'CONFLICT' as const;
    case 429:
      return 'TOO_MANY_REQUESTS' as const;
    default:
      return 'INTERNAL_SERVER_ERROR' as const;
  }
}

const t = initTRPC.context<TrpcContext>().create();

@Injectable()
export class TrpcService {
  readonly router = t.router;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  get publicProcedure() {
    return t.procedure.use(async ({ next }) => {
      try {
        return await next();
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof HttpException) {
          throw new TRPCError({
            code: mapHttpStatus(error.getStatus()),
            message: error.message,
            cause: error,
          });
        }
        throw error;
      }
    });
  }

  get protectedProcedure() {
    return this.publicProcedure.use(async ({ ctx, next }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }
      return next({ ctx: { user: ctx.user } });
    });
  }

  createContext = async ({
    req,
  }: CreateExpressContextOptions): Promise<TrpcContext> => {
    const token: string | undefined =
      (req.cookies as Record<string, string> | undefined)?.session ??
      req.headers.authorization?.replace('Bearer ', '');

    const reqIp = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!token) return { user: null, reqIp, userAgent };

    try {
      const payload = await this.jwtService.verifyAsync<
        JwtPayload & { sub: string }
      >(token);
      return {
        user: {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
          roleId: payload.roleId,
          orgCode: payload.orgCode,
          departmentId: payload.departmentId,
        },
        reqIp,
        userAgent,
      };
    } catch {
      return { user: null, reqIp, userAgent };
    }
  };
}
