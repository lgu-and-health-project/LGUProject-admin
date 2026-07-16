import { IsOptional, IsString } from 'class-validator';

export class ListApplicationsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  serviceTypeCode?: string;
}
