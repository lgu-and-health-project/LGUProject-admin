import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class StaffUserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  orgCode!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  office!: string | null;

  @Field(() => String, { nullable: true })
  baseRole!: string | null;

  @Field()
  createdAt!: Date;
}
