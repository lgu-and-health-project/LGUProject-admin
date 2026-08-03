import { IsOptional, IsString } from 'class-validator';

export class ListApplicationsInput {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  serviceTypeCode?: string;
}
