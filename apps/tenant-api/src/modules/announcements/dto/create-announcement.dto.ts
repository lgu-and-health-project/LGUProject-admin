import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  @IsIn(['all', 'office', 'department'])
  targetType?: string;

  @IsString()
  @IsOptional()
  targetId?: string;
}
