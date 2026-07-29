import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RegisterCitizenDto {
  @ApiProperty({
    example: 'juan.cruz@gmail.com',
    description: 'The citizen email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'The citizen password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'Juan', description: 'The citizen first name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Cruz', description: 'The citizen last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: '+639123456789',
    required: false,
    description: 'Optional phone number',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class LoginCitizenDto {
  @ApiProperty({
    example: 'juan.cruz@gmail.com',
    description: 'The citizen email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'The citizen password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
