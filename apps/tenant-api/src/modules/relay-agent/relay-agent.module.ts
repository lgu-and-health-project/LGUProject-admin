import { Module } from '@nestjs/common';
import { RelayAgentService } from './relay-agent.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [RelayAgentService, PrismaService],
})
export class RelayAgentModule {}
