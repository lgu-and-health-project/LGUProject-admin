import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateApplicationStatusInput {
  @IsString()
  @IsNotEmpty()
  status: string;
}
