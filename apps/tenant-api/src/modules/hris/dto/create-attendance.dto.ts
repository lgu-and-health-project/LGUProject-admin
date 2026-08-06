import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ example: 'check-in', description: 'Type of attendance event' })
  @IsString()
  type: string; // 'check-in' or 'check-out'

  @ApiPropertyOptional({ example: 14.599512, description: 'Latitude coordinate' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 120.984222, description: 'Longitude coordinate' })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
