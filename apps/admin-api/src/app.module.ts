import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminsModule } from './admins/admins.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TenantsModule } from './tenants/tenants.module';
import { TrpcModule } from './trpc/trpc.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { PsgcModule } from './psgc/psgc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 5 },
    ]),
    PrismaModule,
    AuthModule,
    AdminsModule,
    AuditLogsModule,
    TenantsModule,
    TrpcModule,
    UsersModule,
    DevicesModule,
    PsgcModule,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
