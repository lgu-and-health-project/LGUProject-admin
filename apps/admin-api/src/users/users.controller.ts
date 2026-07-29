import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CitizenAuthGuard } from './citizen-auth.guard';
import type { Request } from 'express';
import { RegisterCitizenDto, LoginCitizenDto } from './users.dto';

@ApiTags('Citizens (Users)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Register a new citizen' })
  @Post('register')
  register(@Body() body: RegisterCitizenDto) {
    return this.usersService.register(body);
  }

  @ApiOperation({ summary: 'Login as a citizen' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: LoginCitizenDto) {
    return this.usersService.login(body);
  }

  @ApiOperation({ summary: 'Get current citizen profile' })
  @ApiBearerAuth()
  @UseGuards(CitizenAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    // The decoded JWT payload is attached to req.user by the guard
    return {
      message: 'Secure data accessed successfully',
      userPayload: req['user'],
    };
  }
}
