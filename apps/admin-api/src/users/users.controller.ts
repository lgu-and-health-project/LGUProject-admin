import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Put,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CitizenAuthGuard } from './citizen-auth.guard';
import type { Request } from 'express';
import {
  RegisterCitizenDto,
  LoginCitizenDto,
  SendOtpDto,
  InitialProfileDto,
  SubmitIdVerificationDto,
  ExtendedProfileDto,
  GoogleAuthDto,
} from './dto';

@ApiTags('Citizens (Users)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Step 1: Send OTP to email or phone' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  @HttpCode(HttpStatus.OK)
  @Post('send-otp')
  sendOtp(@Body() body: SendOtpDto) {
    return this.usersService.sendOtp(body);
  }

  @ApiOperation({
    summary: 'Step 2: Register citizen (Validates OTP, Creates Account)',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created, returns JWT. Status is AWAITING_PROFILE.',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP.' })
  @ApiResponse({ status: 409, description: 'Identifier already in use.' })
  @Post('register')
  register(@Body() body: RegisterCitizenDto) {
    return this.usersService.register(body);
  }

  @ApiOperation({ summary: 'Google SSO (Login or Register implicitly)' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated successfully. Returns JWT.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('google')
  googleAuth(@Body() body: GoogleAuthDto) {
    return this.usersService.googleAuth(body);
  }

  @ApiOperation({ summary: 'Step 3: Submit initial profiling data' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated. Status changed to UNVERIFIED.',
  })
  @ApiBearerAuth()
  @UseGuards(CitizenAuthGuard)
  @Put('me/initial-profile')
  updateInitialProfile(@Req() req: Request, @Body() body: InitialProfileDto) {
    const userId = (req as any).user.sub;
    return this.usersService.updateInitialProfile(userId, body);
  }

  @ApiOperation({ summary: 'Branch A: Submit ID for Verification' })
  @ApiResponse({
    status: 201,
    description: 'ID Verification submitted successfully.',
  })
  @ApiBearerAuth()
  @UseGuards(CitizenAuthGuard)
  @Post('me/id-verification')
  submitIdVerification(
    @Req() req: Request,
    @Body() body: SubmitIdVerificationDto,
  ) {
    const userId = (req as any).user.sub;
    return this.usersService.submitIdVerification(userId, body);
  }

  @ApiOperation({ summary: 'Branch B: Update Extended Profiling Data' })
  @ApiResponse({
    status: 200,
    description: 'Extended profile updated successfully.',
  })
  @ApiBearerAuth()
  @UseGuards(CitizenAuthGuard)
  @Patch('me/extended-profile')
  updateExtendedProfile(@Req() req: Request, @Body() body: ExtendedProfileDto) {
    const userId = (req as any).user.sub;
    return this.usersService.updateExtendedProfile(userId, body);
  }

  @ApiOperation({ summary: 'Login as a citizen' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in. Returns JWT access token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or user inactive.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: LoginCitizenDto) {
    return this.usersService.login(body);
  }

  @ApiOperation({ summary: 'Get current citizen profile and status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user profile and current verification status.',
  })
  @ApiBearerAuth()
  @UseGuards(CitizenAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.usersService.getProfile(userId);
  }
}
