import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(orgCode: string, authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        orgCode,
        authorId,
        title: dto.title,
        content: dto.content,
        targetType: dto.targetType ?? 'all',
        targetId: dto.targetId,
      },
      include: { author: { select: { name: true, email: true } } },
    });
  }

  async findAll(orgCode: string) {
    return this.prisma.announcement.findMany({
      where: { orgCode },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, employeeCode: true, roleId: true } },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }
}
