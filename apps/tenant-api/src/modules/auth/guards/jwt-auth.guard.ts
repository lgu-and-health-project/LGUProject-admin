import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  orgCode: string;
  departmentId: string | null;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const passed = (await super.canActivate(context)) as boolean;
    if (!passed) return false;

    const req = context.switchToHttp().getRequest<{ user: JwtUser }>();
    const user = await this.prisma.staffUser.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException(
        'Account is suspended or no longer exists',
      );
    }

    return true;
  }
}
