import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AddStaffInput {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  office: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
