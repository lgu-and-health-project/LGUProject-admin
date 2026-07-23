import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AddStaffInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  office!: string;

  @Field()
  baseRole!: string;
}
