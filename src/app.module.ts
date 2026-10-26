import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { validateEnvironment } from './config/environment.js';
import { graphqlOptions } from './graphql/graphql.options.js';
import { HealthModule } from './health/health.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    HealthModule,
    PortfolioModule,
    GraphQLModule.forRoot(graphqlOptions),
  ],
})
export class AppModule {}
