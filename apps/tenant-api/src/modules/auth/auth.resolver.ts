import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
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
  role: string;
  orgCode: string;
  departmentId: string | null;
}

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

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

    return { user };
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

    return { user };
  }

  @Query(() => MeResponse)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: RequestUser): MeResponse {
    const permissions = this.authService.getPermissionsForRole(user.role);
    return { 
      user: {
        ...user,
        permissions,
      }
    };
  }
}
