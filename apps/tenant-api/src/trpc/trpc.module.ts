import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TrpcService } from './trpc.service';
import { TrpcAppRouter } from './trpc.router';
import { AuthRouter } from './routers/auth.router';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [JwtModule, AuthModule],
  providers: [
    PrismaService,
    TrpcService,
    TrpcAppRouter,
    AuthRouter,
  ],
  exports: [TrpcService, TrpcAppRouter],
})
export class TrpcModule {}
