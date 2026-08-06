import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HrisController } from './hris.controller';
import { HrisService } from './hris.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [HrisController],
  providers: [HrisService, PrismaService],
})
export class HrisModule {}
