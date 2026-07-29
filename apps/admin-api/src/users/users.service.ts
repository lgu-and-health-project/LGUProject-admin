import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { IdentifierType, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(data: any) {
    const existing = await this.prisma.userIdentifiers.findFirst({
      where: { identifierValue: data.email, identifierType: IdentifierType.EMAIL },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.users.create({
      data: {
        status: UserStatus.ACTIVE,
        identifiers: {
          create: [{ identifierType: IdentifierType.EMAIL, identifierValue: data.email }],
        },
        credentials: {
          create: [{ passwordHash: hash }],
        },
        profiles: {
          create: [{
            firstName: data.firstName,
            lastName: data.lastName,
            middleName: data.middleName || '',
            sex: data.sex || 'Not specified',
            birthDate: new Date(data.birthDate),
          }],
        },
      },
      include: { profiles: true },
    });
    return { message: 'User registered successfully', userId: user.userId };
  }

  async login(data: any) {
    const identifier = await this.prisma.userIdentifiers.findFirst({
      where: { identifierValue: data.email, identifierType: IdentifierType.EMAIL },
      include: { user: { include: { credentials: true, profiles: true } } },
    });
    if (!identifier) throw new UnauthorizedException('Invalid credentials');
    
    const user = identifier.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }
    const valid = await bcrypt.compare(data.password, user.credentials[0].passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.userId, type: 'citizen' };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, user: user.profiles[0] };
  }
}
