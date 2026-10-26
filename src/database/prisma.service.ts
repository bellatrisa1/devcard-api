import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Environment } from '../config/environment.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Environment, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        connectionTimeoutMillis: 2000,
        query_timeout: 2000,
        statement_timeout: 2000,
        max: 5,
      }),
      log: [],
    });
  }

  async onModuleInit(): Promise<void> {
    // PostgreSQL availability is reported by readiness, never by process liveness.
    try {
      await this.$connect();
    } catch {
      /* Later readiness checks retry. */
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
