import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ModuleModel {
  @Field(() => ID)
  id!: string;

  @Field()
  label!: string;

  @Field()
  category!: string;
}
