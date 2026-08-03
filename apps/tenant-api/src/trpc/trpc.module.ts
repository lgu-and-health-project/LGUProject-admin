import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcAppRouter } from './trpc.router';
import { AuthRouter } from './routers/auth.router';
import { AttendanceRouter } from './routers/attendance.router';
import { SettingsRouter } from './routers/settings.router';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    PrismaService,
    TrpcService,
    TrpcAppRouter,
    AuthRouter,
    AttendanceRouter,
    SettingsRouter,
  ],
  exports: [TrpcService, TrpcAppRouter],
})
export class TrpcModule {}
