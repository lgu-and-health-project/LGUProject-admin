import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class ExtendedProfileDto {
  @ApiProperty({ example: 'Rizal', required: false })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({ example: 'Jr.', required: false })
  @IsString()
  @IsOptional()
  extensionName?: string;

  @ApiProperty({ example: 'juan.cruz.alternate@gmail.com', required: false })
  @IsEmail()
  @IsOptional()
  secondaryEmail?: string;

  @ApiProperty({ example: '+639198765432', required: false })
  @IsString()
  @IsOptional()
  secondaryPhone?: string;

  @ApiProperty({ example: 'SINGLE', required: false })
  @IsString()
  @IsOptional()
  civilStatus?: string;

  @ApiProperty({ example: 'Software Engineer', required: false })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiProperty({
    example: 'Non-binary',
    required: false,
    description: 'Optional gender identity',
  })
  @IsString()
  @IsOptional()
  genderIdentity?: string;
}
