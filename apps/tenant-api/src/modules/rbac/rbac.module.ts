import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacResolver } from './rbac.resolver';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  providers: [RbacResolver, RbacService, PrismaService],
})
export class RbacModule {}
