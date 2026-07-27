import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminApiModule } from './modules/admin-api/admin-api.module';
import { RbacModule } from './modules/rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
    }),
    AuthModule,
    StaffModule,
    RbacModule,
    ScheduleModule.forRoot(),
    AdminApiModule,
  ],
  providers: [AppResolver, AppService],
})
export class AppModule {}
