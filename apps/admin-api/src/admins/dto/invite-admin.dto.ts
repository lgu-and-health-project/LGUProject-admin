import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AdminRole } from '@prisma/client';

export class InviteAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
