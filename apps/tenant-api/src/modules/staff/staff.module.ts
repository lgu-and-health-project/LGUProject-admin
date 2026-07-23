import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffResolver } from './staff.resolver';
import { StaffService } from './staff.service';
import { StaffManagementResolver } from './staff-management.resolver';
import { StaffManagementService } from './staff-management.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [AuthModule],
  providers: [
    StaffResolver, 
    StaffService, 
    StaffManagementResolver, 
    StaffManagementService, 
    PrismaService
  ],
})
export class StaffModule {}
