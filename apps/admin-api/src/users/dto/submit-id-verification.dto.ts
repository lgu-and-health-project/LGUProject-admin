import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SubmitIdVerificationDto {
  @ApiProperty({ example: 'PASSPORT', description: 'Type of ID provided' })
  @IsString()
  @IsNotEmpty()
  idType!: string;

  @ApiProperty({ example: 'P1234567A', description: 'ID Number' })
  @IsString()
  @IsOptional()
  idNumber?: string;

  @ApiProperty({
    example: 'https://storage.example.com/id-photo.jpg',
    description: 'URL of the uploaded ID photo',
  })
  @IsString()
  @IsNotEmpty()
  idPhotoUrl!: string;
}
