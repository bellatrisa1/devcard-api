import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { printSchema } from 'graphql';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { profile, skills, experience, projects } from '../prisma/portfolio-data.mjs';
import { employerQuery, fullQuery } from './graphql-queries.mjs';

test(
  'GraphQL with seeded PostgreSQL: public contract and bounded relation queries',
  { timeout: 120000 },
  async () => {
    assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL with CREATEDB permission');
    const base = new URL(process.env.TEST_DATABASE_URL);
    assert.ok(!base.searchParams.has('schema'));
    const name = `devcard_graphql_${randomUUID().replaceAll('-', '')}`;
    const target = new URL(base);
    target.pathname = `/${name}`;
    const admin = new PrismaClient({
      adapter: new PrismaPg({ connectionString: base.toString() }),
      log: [],
    });
    // SQL events are counted only in this test. Neither SQL text nor parameters are logged.
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: target.toString() }),
      log: [{ emit: 'event', level: 'query' }],
    });
    let statements = 0;
    db.$on('query', () => statements++);
    let app;
    let created = false;
    const previous = { ...process.env };
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      created = true;
      const preparation = spawnSync(process.execPath, ['scripts/prepare.mjs'], {
        env: { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test' },
        stdio: 'pipe',
        timeout: 30000,
      });
      assert.equal(preparation.status, 0, 'Isolated migration/seed failed; output hidden');
      process.env.DATABASE_URL = target.toString();
      process.env.NODE_ENV = 'production';
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue(db)
        .compile();
      app = module.createNestApplication({ logger: false });
      await app.init();
      const server = app.getHttpServer();
      const post = (query) => request(server).post('/graphql').send({ query });
      const sdl = printSchema(app.get(GraphQLSchemaHost).schema);
      assert.match(sdl, /profile: Profile\n/);
      assert.match(sdl, /skills: \[Skill!\]!/);
      assert.match(sdl, /experience: \[Experience!\]!/);
      assert.match(sdl, /achievements: \[ExperienceAchievement!\]!/);
      assert.match(sdl, /projects: \[Project!\]!/);
      assert.match(sdl, /repositoryUrl: String\n/);
      assert.match(sdl, /endDate: String\n/);
      assert.doesNotMatch(sdl, /displayOrder|profileId|experienceId|ProfileSkill|type Mutation/);
      const expectedEmployer = {
        name: profile.name,
        description: profile.description,
        skills: skills.map(({ name }) => ({ name })),
        experience: experience.map(({ company, position }) => ({ company, position })),
        projects: projects.map(({ name }) => ({ name })),
      };
      statements = 0;
      const employer = await post(employerQuery).expect(200);
      assert.equal(employer.body.errors, undefined);
      assert.deepEqual(employer.body.data.profile, expectedEmployer);
      const smallCount = statements;
      assert.ok(smallCount > 0);
      statements = 0;
      const full = await post(fullQuery).expect(200);
      assert.equal(full.body.errors, undefined);
      assert.deepEqual(full.body.data.profile, {
        ...profile,
        skills: skills.map(({ id, name }) => ({ id, name })),
        experience: experience.map(({ startDate, endDate, ...entry }) => ({
          ...entry,
          startDate: startDate.slice(0, 7),
          endDate: endDate?.slice(0, 7) ?? null,
        })),
        projects,
      });
      assert.equal(
        statements,
        smallCount,
        'Small and full selections deliberately load the same relations',
      );
      const repeat = await post(fullQuery).expect(200);
      assert.deepEqual(repeat.body, full.body);
      for (let i = 0; i < 20; i++) {
        await db.experience.create({
          data: {
            id: `test-job-${i}`,
            profileId: profile.id,
            company: `Test ${i}`,
            position: 'Isolated fixture',
            startDate: new Date('2020-01-01T00:00:00Z'),
            endDate: null,
            displayOrder: 10 + i,
            achievements: {
              create: Array.from({ length: 10 }, (_, j) => ({
                id: `test-achievement-${i}-${j}`,
                text: 'Isolated fixture',
                displayOrder: j,
              })),
            },
          },
        });
      }
      statements = 0;
      const expanded = await post(fullQuery).expect(200);
      const largeCount = statements;
      assert.equal(expanded.body.errors, undefined);
      assert.equal(expanded.body.data.profile.experience.length, 22);
      assert.equal(expanded.body.data.profile.experience[2].achievements.length, 10);
      assert.equal(expanded.body.data.profile.experience[2].endDate, null);
      assert.equal(
        largeCount,
        smallCount,
        'SQL count must not increase per employment/achievement',
      );
      console.log(
        `Relation-loading SQL statements: seeded=${smallCount}, +20 jobs/+200 achievements=${largeCount}`,
      );
      await request(server).get('/health/live').expect(200);
      await request(server).get('/health/ready').expect(200);
      // Induce a real database read error only inside this disposable database.
      await db.$executeRawUnsafe('ALTER TABLE "Profile" RENAME TO "Profile_unavailable"');
      const failed = await post(fullQuery).expect(200);
      assert.equal(failed.body.errors[0].message, 'Internal server error');
      assert.deepEqual(failed.body.errors[0].extensions, { code: 'INTERNAL_SERVER_ERROR' });
      assert.doesNotMatch(
        JSON.stringify(failed.body),
        /stacktrace|Prisma|Profile_unavailable|postgresql|SELECT/,
      );
      await db.$executeRawUnsafe('ALTER TABLE "Profile_unavailable" RENAME TO "Profile"');
      await db.profile.create({ data: { ...profile, id: 'unrelated-profile', name: 'Unrelated' } });
      await db.profile.delete({ where: { id: profile.id } });
      const missing = await post(employerQuery).expect(200);
      assert.deepEqual(missing.body, { data: { profile: null } });
    } finally {
      if (app) await app.close();
      await db.$disconnect();
      process.env = previous;
      try {
        if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${name}"`);
      } finally {
        await admin.$disconnect();
      }
    }
  },
);
