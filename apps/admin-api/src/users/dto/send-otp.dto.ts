import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'juan.cruz@gmail.com',
    description: 'The email or phone number to send the OTP to',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;
}
