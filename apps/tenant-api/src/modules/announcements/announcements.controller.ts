import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

import { Request } from 'express';
import { JwtPayload } from '../../trpc/trpc.service';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

@Controller('announcements')
@UseGuards(AuthGuard('jwt'))
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ) {
    const user = req.user;
    return this.announcementsService.create(
      user.orgCode,
      user.userId,
      createAnnouncementDto,
    );
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    const user = req.user;
    return this.announcementsService.findAll(user.orgCode);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
