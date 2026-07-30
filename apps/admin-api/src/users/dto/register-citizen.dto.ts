import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterCitizenDto {
  @ApiProperty({
    example: 'juan.cruz@gmail.com',
    description: 'The citizen email address OR phone number',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    example: '123456',
    description: 'The OTP code sent to the identifier',
  })
  @IsString()
  @IsNotEmpty()
  otpCode!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'The citizen password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
