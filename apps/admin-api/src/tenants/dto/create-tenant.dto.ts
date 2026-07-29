import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(1)
  psgcCode!: string;

  @IsEmail()
  sysadminEmail!: string;
}
