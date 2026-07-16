import { IsIn, IsString } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(['submitted', 'in_review', 'approved', 'rejected'])
  status!: string;
}
