import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description:
      'The Google ID Token received from the frontend Google Sign-In SDK',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
