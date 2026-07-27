import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class AssignRoleInput {
  @Field()
  @IsNotEmpty()
  staffUserId!: string;

  @Field()
  @IsNotEmpty()
  roleId!: string;
}
