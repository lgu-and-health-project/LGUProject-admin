import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class InitialProfileDto {
  @ApiProperty({ example: 'Juan', description: 'The citizen first name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Cruz', description: 'The citizen last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'MALE', description: 'Sex of the citizen' })
  @IsEnum(['MALE', 'FEMALE'])
  @IsNotEmpty()
  sex!: string;

  @ApiProperty({ example: '1990-01-01', description: 'Birthdate (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  birthdate!: string;

  @ApiProperty({ example: 'Unit 12A / Tower 1', required: false })
  @IsString()
  @IsOptional()
  unitBuilding?: string;

  @ApiProperty({ example: 'Mangga St., Purok 4', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '1108', required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: '012801000', description: 'PSGC code for location' })
  @IsString()
  @IsNotEmpty()
  psgcCode!: string;
}
