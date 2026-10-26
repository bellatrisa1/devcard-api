export interface Environment {
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
}

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const port = Number(input.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const nodeEnv = input.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test or production');
  }
  const databaseUrl = input.DATABASE_URL;
  try {
    if (typeof databaseUrl !== 'string') throw new Error();
    const url = new URL(databaseUrl);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  return { PORT: port, NODE_ENV: nodeEnv, DATABASE_URL: databaseUrl as string };
}
