import { UseFilters } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GraphqlErrorFilter } from '../graphql/graphql-error.filter.js';
import { PortfolioService } from './portfolio.service.js';
import { Profile } from './portfolio.types.js';

@Resolver(() => Profile)
@UseFilters(GraphqlErrorFilter)
export class PortfolioResolver {
  constructor(private readonly portfolio: PortfolioService) {}

  @Query(() => Profile, { nullable: true })
  profile(): Promise<Profile | null> {
    return this.portfolio.getProfile();
  }
}
