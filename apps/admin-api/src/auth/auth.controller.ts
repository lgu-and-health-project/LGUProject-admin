import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { AuditAction, AuditStatus, AuditTargetType } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditLogsService: AuditLogsService,
  ) {}

  @Throttle({ auth: {} })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      const user = await this.authService.validateAdmin(
        dto.email,
        dto.password,
      );

      const {
        access_token,
        refresh_token,
        user: userData,
      } = await this.authService.login(user);

      await this.auditLogsService.logAction({
        actorId: user.superadminId,
        action: AuditAction.login,
        status: AuditStatus.SUCCESS,
        targetType: AuditTargetType.session,
        ipAddress,
        userAgent,
      });

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/auth',
      });

      return {
        message: 'Logged in successfully',
        user: userData,
        access_token,
      };
    } catch (err) {
      // We don't have an actorId for a failed login (email may not even
      // exist), so this is logged without one - metadata carries the
      // attempted email instead for investigation purposes.
      if (err instanceof UnauthorizedException) {
        await this.auditLogsService
          .logAction({
            // No actorId: the email may not belong to any real admin.
            action: AuditAction.login,
            status: AuditStatus.FAILURE,
            targetType: AuditTargetType.session,
            metadata: { attempted_email: dto.email },
            ipAddress,
            userAgent,
          })
          .catch(() => undefined); // never let audit logging break the response
      }
      throw err;
    }
  }

  @Throttle({ auth: {} })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const {
      access_token,
      refresh_token: new_refresh_token,
      user: userData,
    } = await this.authService.refresh(refreshToken);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', new_refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });

    return { access_token, user: userData };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth' });
    return { message: 'Logged out successfully' };
  }
}
