import { IsString } from 'class-validator';

export class RejectInviteDto {
  @IsString()
  token!: string;
}
