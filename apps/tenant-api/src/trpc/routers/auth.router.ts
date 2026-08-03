import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../trpc.service';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthRouter {
  constructor(
    private trpc: TrpcService,
    private authService: AuthService,
  ) {}

  get router() {
    return this.trpc.router({
      me: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return { user: ctx.user };
        }),
        
      login: this.trpc.publicProcedure
        .input(
          z.object({
            email: z.string().email(),
            password: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const res = await this.authService.login(
            input.email, 
            input.password, 
            ctx.reqIp, 
            ctx.userAgent
          );
          return { user: res.user, access_token: res.accessToken };
        }),
        
      onboard: this.trpc.publicProcedure
        .input(
          z.object({
            registrationKey: z.string(),
            email: z.string().email(),
            password: z.string(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const res = await this.authService.onboard(
            input.registrationKey, 
            input.email, 
            input.password, 
            ctx.reqIp, 
            ctx.userAgent
          );
          return { user: res.user, access_token: res.accessToken };
        }),
    });
  }
}
