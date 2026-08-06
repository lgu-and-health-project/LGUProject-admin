import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 'formal_leave', description: 'Type of leave request' })
  @IsString()
  type: string;

  @ApiProperty({ example: '2026-10-01T00:00:00Z', description: 'Start date of the leave' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-10-05T23:59:59Z', description: 'End date of the leave' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Medical reasons and family time', description: 'Reason for the leave' })
  @IsString()
  reason: string;
}
