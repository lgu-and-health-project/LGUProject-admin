import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  RegisterCitizenDto,
  LoginCitizenDto,
  SendOtpDto,
  InitialProfileDto,
  SubmitIdVerificationDto,
  GoogleAuthDto,
  ExtendedProfileDto,
} from './dto';
import { IdentifierType, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { getOtpEmailTemplate } from '../templates/mails/otp.template';

const OTP_TTL_MINUTES = 5;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private readonly logger = new Logger(UsersService.name);

  private getIdentifierType(identifier: string): IdentifierType {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    return isEmail ? IdentifierType.EMAIL : IdentifierType.PHONE;
  }

  async sendOtp(data: SendOtpDto) {
    const identifierType = this.getIdentifierType(data.identifier);

    // Check if user already exists
    const existing = await this.prisma.userIdentifiers.findFirst({
      where: { identifierValue: data.identifier, identifierType },
    });
    if (existing) {
      throw new ConflictException('Identifier already registered');
    }

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otps.create({
      data: {
        identifier: data.identifier,
        identifierType,
        code,
        expiresAt,
      },
    });

    // Integration with Nodemailer for @gmail.com users
    this.logger.debug(`[MOCK EMAIL/SMS] OTP for ${data.identifier} is ${code}`);

    if (identifierType === IdentifierType.EMAIL) {
      try {
        const transporter = nodemailer.createTransport({
          host: this.configService.get<string>('SMTP_HOST'),
          port: this.configService.get<number>('SMTP_PORT'),
          secure: Number(this.configService.get<number>('SMTP_PORT')) === 465,
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        });

        await transporter.sendMail({
          from: `"${this.configService.get<string>('MAIL_FROM_NAME')}" <${this.configService.get<string>('MAIL_FROM_ADDRESS')}>`,
          to: data.identifier,
          subject: 'Your OTP Code - One City',
          text: `Your OTP code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
          html: getOtpEmailTemplate({
            code,
            appName: 'LGU Platform',
            companyName: 'Infinite Motion Xpress Inc.',
            teamName: 'LGU Admin Team',
            validityMinutes: OTP_TTL_MINUTES,
          }),
        });

        this.logger.log(`OTP email sent successfully to ${data.identifier}`);
      } catch (error) {
        this.logger.error(
          `Failed to send OTP email to ${data.identifier}`,
          error,
        );
      }
    }

    return { message: 'OTP sent successfully' };
  }

  async register(data: RegisterCitizenDto) {
    const identifierType = this.getIdentifierType(data.identifier);

    // 1. Verify user doesn't already exist
    const existing = await this.prisma.userIdentifiers.findFirst({
      where: { identifierValue: data.identifier, identifierType },
    });
    if (existing) {
      throw new ConflictException('Identifier already registered');
    }

    // 2. Validate OTP
    const otpRecord = await this.prisma.otps.findFirst({
      where: {
        identifier: data.identifier,
        identifierType,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || otpRecord.code !== data.otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }
    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Mark OTP as used
    await this.prisma.otps.update({
      where: { otpId: otpRecord.otpId },
      data: { isUsed: true },
    });

    // 3. Create User, Identifiers, and Credentials
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.users.create({
      data: {
        status: UserStatus.AWAITING_PROFILE,
        identifiers: {
          create: [{ identifierType, identifierValue: data.identifier }],
        },
        credentials: {
          create: [{ passwordHash: hash }],
        },
      },
    });

    // 4. Generate JWT
    const payload = { sub: user.userId, type: 'citizen' };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      message: 'Account created successfully. Please complete your profile.',
    };
  }

  async login(data: LoginCitizenDto) {
    const identifierType = this.getIdentifierType(data.identifier);

    const identifierRecord = await this.prisma.userIdentifiers.findFirst({
      where: { identifierValue: data.identifier, identifierType },
      include: {
        user: {
          include: {
            credentials: true,
          },
        },
      },
    });

    // Use generic error messages to prevent username enumeration
    if (
      !identifierRecord ||
      !identifierRecord.user ||
      identifierRecord.user.credentials.length === 0
    ) {
      throw new UnauthorizedException('Invalid credentials provided');
    }

    const user = identifierRecord.user;
    const credential = user.credentials[0];

    const isValidPassword = await bcrypt.compare(
      data.password,
      credential.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials provided');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const payload = { sub: user.userId, type: 'citizen' };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      message: 'Authentication successful',
      userStatus: user.status,
    };
  }

  async googleAuth(data: GoogleAuthDto) {
    // TODO: Implement actual Google OAuth verification (e.g., using google-auth-library)
    // We throw 501 instead of returning dummy tokens to maintain security
    throw new BadRequestException('Google SSO is not fully implemented yet');
  }

  async updateInitialProfile(userId: string, data: InitialProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Address
      const address = await tx.addresses.create({
        data: {
          psgcCode: data.psgcCode,
          unitBuilding: data.unitBuilding,
          street: data.street,
          zipCode: data.zipCode,
        },
      });

      // 2. Create the User Profile
      const profile = await tx.userProfiles.create({
        data: {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          sex: data.sex,
          birthDate: new Date(data.birthdate),
        },
      });

      // 3. Link Address and Profile
      await tx.profileAddresses.create({
        data: {
          profileId: profile.profileId,
          addressId: address.addressId,
          type: 'RESIDENTIAL',
          isPrimary: true,
        },
      });

      // 4. Update User Status
      await tx.users.update({
        where: { userId },
        data: { status: UserStatus.UNVERIFIED },
      });

      return {
        message: 'Initial profile updated successfully',
        profileId: profile.profileId,
      };
    });
  }

  async submitIdVerification(userId: string, data: SubmitIdVerificationDto) {
    const verification = await this.prisma.userVerifications.create({
      data: {
        userId,
        idType: data.idType,
        idNumber: data.idNumber,
        idPhotoUrl: data.idPhotoUrl,
        status: 'PENDING',
      },
    });

    return {
      message: 'ID verification submitted successfully',
      verificationId: verification.verificationId,
    };
  }

  async updateExtendedProfile(userId: string, data: ExtendedProfileDto) {
    // TODO: implement extended profile update (saving occupation, civil status, etc.)
    throw new BadRequestException(
      'Extended profile update is not fully implemented yet',
    );
  }

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { userId },
      include: {
        identifiers: {
          select: { identifierType: true, identifierValue: true },
        },
        profiles: {
          include: {
            addresses: {
              include: { address: true },
            },
          },
        },
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User profile not found');
    }

    return {
      userId: user.userId,
      status: user.status,
      createdAt: user.createdAt,
      identifiers: user.identifiers,
      profile: user.profiles[0] || null,
      latestVerification: user.verifications[0] || null,
    };
  }
}
