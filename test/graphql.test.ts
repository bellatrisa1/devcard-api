import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

test('GraphQL production HTTP: Sandbox, introspection, null, validation, safe failures and health', async () => {
  const previous = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgresql://test:secret@localhost/test';
  let failing = false;
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({
      profile: {
        findUnique: () => {
          if (failing)
            throw new Error('postgresql://private:credential@internal/database secret-stack');
          return Promise.resolve(null);
        },
      },
      $queryRaw: () =>
        failing ? Promise.reject(new Error('credential')) : Promise.resolve([{ value: 1 }]),
    })
    .compile();
  const loggedErrors: string[] = [];
  const app = module.createNestApplication({
    logger: {
      log: () => {},
      warn: () => {},
      error: (...args: unknown[]) => {
        loggedErrors.push(args.map(String).join(' '));
      },
    },
  });
  await app.init();
  try {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const post = (query: string) => request(server).post('/graphql').send({ query });
    const landing = await request(server).get('/graphql').set('Accept', 'text/html').expect(200);
    assert.match(landing.text, /apollo/i);
    assert.match(landing.text, /sandbox/i);
    const introspection = await post(
      '{ __schema { queryType { name } mutationType { name } } }',
    ).expect(200);
    assert.equal(introspection.body.data.__schema.queryType.name, 'Query');
    assert.equal(introspection.body.data.__schema.mutationType, null);
    const missing = await post('{ profile { name } }').expect(200);
    assert.deepEqual(missing.body, { data: { profile: null } });
    const unsupported = await post('{ profile { displayOrder } }');
    assert.equal(unsupported.body.errors[0].extensions.code, 'GRAPHQL_VALIDATION_FAILED');
    assert.match(unsupported.body.errors[0].message, /Cannot query field/);
    for (const query of ['{ profile { displayOrder } }', 'mutation { profile { name } }', '{']) {
      const response = await post(query);
      assert.ok(response.body.errors.length > 0);
      assert.ok(!JSON.stringify(response.body).includes('stacktrace'));
    }
    await request(server).get('/health/live').expect(200);
    await request(server).get('/health/ready').expect(200);
    failing = true;
    const failed = await post('{ profile { name } }').expect(200);
    assert.equal(failed.body.errors[0].message, 'Internal server error');
    assert.deepEqual(failed.body.errors[0].extensions, { code: 'INTERNAL_SERVER_ERROR' });
    assert.equal(failed.body.data.profile, null);
    assert.doesNotMatch(
      JSON.stringify(failed.body),
      /credential|private|internal\/database|secret-stack|stacktrace/,
    );
    assert.ok(loggedErrors.some((line) => line.includes('Unexpected portfolio query failure')));
    assert.doesNotMatch(loggedErrors.join(' '), /credential|secret-stack|postgresql/);
    await request(server).get('/health/live').expect(200);
    await request(server).get('/health/ready').expect(503, { status: 'unavailable' });
  } finally {
    await app.close();
    process.env = previous;
  }
});
