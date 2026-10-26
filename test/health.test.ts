import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from '../src/health/health.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { validateEnvironment } from '../src/config/environment.js';

test('HTTP health: liveness ignores DB; readiness handles success and failure safely', async () => {
  let failing = false;
  let calls = 0;
  const module = await Test.createTestingModule({ imports: [HealthModule] })
    .overrideProvider(PrismaService)
    .useValue({
      $queryRaw: () => {
        calls++;
        if (failing) throw new Error('postgresql://secret:password@internal/db');
        return Promise.resolve([{ '?column?': 1 }]);
      },
    })
    .compile();
  const app = module.createNestApplication({ logger: false });
  await app.init();
  try {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/health/live').expect(200, { status: 'ok' });
    assert.equal(calls, 0);
    await request(server).get('/health/ready').expect(200, { status: 'ok' });
    failing = true;
    await request(server).get('/health/ready').expect(503, { status: 'unavailable' });
    await request(server).get('/health/live').expect(200, { status: 'ok' });
    assert.equal(calls, 2);
  } finally {
    await app.close();
  }
});

test('configuration rejects missing URL, invalid protocol, port and environment without leaking values', () => {
  const valid = { DATABASE_URL: 'postgresql://user:secret@localhost:5432/test' };
  assert.equal(validateEnvironment(valid).PORT, 3000);
  for (const config of [
    {},
    { DATABASE_URL: 'https://secret@host/db' },
    { ...valid, PORT: 0 },
    { ...valid, NODE_ENV: 'invalid' },
  ]) {
    assert.throws(
      () => validateEnvironment(config),
      (error: Error) => !error.message.includes('secret'),
    );
  }
});
