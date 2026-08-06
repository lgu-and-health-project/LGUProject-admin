import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Scheduled System Maintenance', description: 'Title of the announcement' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'The system will be down for maintenance this weekend.', description: 'Content body of the announcement' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'all', enum: ['all', 'office', 'department'], description: 'Who the announcement targets' })
  @IsString()
  @IsOptional()
  @IsIn(['all', 'office', 'department'])
  targetType?: string;

  @ApiPropertyOptional({ example: 'office-uuid-123', description: 'ID of the target if targetType is not all' })
  @IsString()
  @IsOptional()
  targetId?: string;
}
