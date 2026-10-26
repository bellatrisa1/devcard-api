import { Catch, Logger } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphqlErrorFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphqlErrorFilter.name);

  catch(): GraphQLError {
    // Never forward the original exception to Nest's default exception logger.
    this.logger.error('Unexpected portfolio query failure.');
    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
