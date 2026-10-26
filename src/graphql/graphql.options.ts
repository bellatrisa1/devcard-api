import { Logger } from '@nestjs/common';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

const logger = new Logger('GraphQL');
const standardErrors = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'OPERATION_RESOLUTION_FAILURE',
  'BAD_REQUEST',
]);

export const graphqlOptions: ApolloDriverConfig = {
  driver: ApolloDriver,
  path: '/graphql',
  autoSchemaFile: true,
  sortSchema: true,
  graphiql: false,
  // Public recruitment demo: explicitly keep schema discovery and Sandbox in production.
  introspection: true,
  includeStacktraceInErrorResponses: false,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({
      embed: true,
      document: `query {
  profile {
    name
    description
    skills { name }
    experience { company position }
    projects { name }
  }
}`,
    }),
  ],
  // Embedded Sandbox requests are same-origin. No cross-origin credentials are needed.
  // Nest CORS remains disabled; no global enableCors() call.
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => logger.warn('Apollo server warning.'),
    error: () => logger.error('Apollo server failure.'),
  },
  formatError(error) {
    const code = String(error.extensions?.code ?? 'INTERNAL_SERVER_ERROR');
    if (standardErrors.has(code)) {
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: { code },
      };
    }
    if (code !== 'INTERNAL_SERVER_ERROR' || error.message !== 'Internal server error') {
      logger.error('Unexpected GraphQL execution failure.');
    }
    return {
      message: 'Internal server error',
      locations: error.locations,
      path: error.path,
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    };
  },
};
