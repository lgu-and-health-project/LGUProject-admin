import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginInput } from './dto/login.input';
import { OnboardInput } from './dto/onboard.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginResponse, MeResponse } from './models/auth.model';

interface GqlContext {
  req: Request;
  res: Response;
}

interface RequestUser {
  userId: string;
  email: string;
  role: string | null;
  roleId: string | null;
  orgCode: string;
  departmentId: string | null;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService, private prisma: PrismaService) {}

  @Mutation(() => LoginResponse)
  async login(
    @Args('input') input: LoginInput,
    @Context() ctx: GqlContext,
  ): Promise<LoginResponse> {
    const { accessToken, user } = await this.authService.login(
      input.email,
      input.password,
      ctx.req.ip,
      ctx.req.headers['user-agent'],
    );

    ctx.res.cookie('session', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 4,
    });

    return { user: { ...user, org: user.org ?? undefined } };
  }

  @Mutation(() => LoginResponse)
  async onboard(
    @Args('input') input: OnboardInput,
    @Context() ctx: GqlContext,
  ): Promise<LoginResponse> {
    const { accessToken, user } = await this.authService.onboard(
      input.registrationKey,
      input.email,
      input.password,
      ctx.req.ip,
      ctx.req.headers['user-agent'],
    );

    ctx.res.cookie('session', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 4,
    });

    return { user: { ...user, org: user.org ?? undefined } };
  }

  @Query(() => MeResponse)
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: RequestUser): Promise<MeResponse> {
    const permissions = await this.authService.getPermissionsForRole(user.roleId);
    const orgData = await this.prisma.organization.findUnique({
      where: { code: user.orgCode },
      select: { name: true, level: true },
    });
    return {
      user: {
        ...user,
        permissions,
        org: orgData ?? undefined,
      },
    };
  }
}
