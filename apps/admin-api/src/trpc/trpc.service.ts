import { Injectable, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { AdminRole, AdminStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';

export interface TrpcContext {
  user: JwtPayload | null;
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

// Module-scope init — no runtime deps needed.
const t = initTRPC.context<TrpcContext>().create();

@Injectable()
export class TrpcService {
  /** The raw tRPC router builder. */
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

      // Mirror JwtAuthGuard: verify the admin still exists and is active.
      const admin = await this.prisma.superAdmins.findUnique({
        where: { superadminId: ctx.user.sub },
      });

      if (!admin || admin.status === AdminStatus.REVOKED) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Account has been restricted',
        });
      }

      return next({ ctx: { user: ctx.user } });
    });
  }

  get rootOnlyProcedure() {
    return this.protectedProcedure.use(async ({ ctx, next }) => {
      if (ctx.user.role !== AdminRole.ROOT_SUPERADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
      return next();
    });
  }

  /**
   * Express context factory — extracts JWT from the access_token cookie
   * (or Authorization header) and verifies it. Called once per request.
   */
  createContext = async ({
    req,
  }: CreateExpressContextOptions): Promise<TrpcContext> => {
    const token: string | undefined =
      (req.cookies as Record<string, string> | undefined)?.access_token ??
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) return { user: null };

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return { user: payload };
    } catch {
      return { user: null };
    }
  };
}
