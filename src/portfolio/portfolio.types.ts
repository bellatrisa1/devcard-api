import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Skill')
export class Skill {
  @Field(() => ID) id!: string;
  @Field(() => String) name!: string;
}

@ObjectType('ExperienceAchievement')
export class ExperienceAchievement {
  @Field(() => ID) id!: string;
  @Field(() => String) text!: string;
}

@ObjectType('Experience')
export class Experience {
  @Field(() => ID) id!: string;
  @Field(() => String) company!: string;
  @Field(() => String) position!: string;
  @Field(() => String, { description: 'Month precision: YYYY-MM (UTC).' }) startDate!: string;
  @Field(() => String, { nullable: true, description: 'Month precision: YYYY-MM (UTC).' })
  endDate!: string | null;
  @Field(() => [ExperienceAchievement]) achievements!: ExperienceAchievement[];
}

@ObjectType('Project')
export class Project {
  @Field(() => ID) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => String, { nullable: true }) repositoryUrl!: string | null;
  @Field(() => String, { nullable: true }) demoUrl!: string | null;
}

@ObjectType('Profile')
export class Profile {
  @Field(() => ID) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) headline!: string;
  @Field(() => String) description!: string;
  @Field(() => String) githubUrl!: string;
  @Field(() => String) telegramUrl!: string;
  @Field(() => [Skill]) skills!: Skill[];
  @Field(() => [Experience]) experience!: Experience[];
  @Field(() => [Project]) projects!: Project[];
}
