import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginCitizenDto {
  @ApiProperty({
    example: 'juan.cruz@gmail.com',
    description: 'The citizen email or phone',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'The citizen password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
