import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  type: string; // 'check-in' or 'check-out'

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
