import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  AuditStatus,
  AuditTargetType,
  Prisma,
} from '@prisma/client';

export interface LogActionParams {
  actorId?: string;
  action: AuditAction;
  status?: AuditStatus;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async logAction(params: LogActionParams) {
    return this.prisma.superAdminAuditLogs.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        status: params.status ?? AuditStatus.SUCCESS,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findAll() {
    return this.prisma.superAdminAuditLogs.findMany({
      include: {
        actor: { select: { fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
