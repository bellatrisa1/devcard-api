import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { profile, skills, experience, projects } from '../prisma/portfolio-data.mjs';

function client(connectionString) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
    log: [],
  });
}

test(
  'committed migration and repeatable seed in a fresh disposable database',
  { timeout: 120000 },
  async () => {
    assert.ok(
      process.env.TEST_DATABASE_URL,
      'Set TEST_DATABASE_URL to a PostgreSQL URL with CREATEDB permission',
    );
    const base = new URL(process.env.TEST_DATABASE_URL);
    assert.ok(!base.searchParams.has('schema'), 'Use a database URL without schema for this test');
    const databaseName = `devcard_test_${randomUUID().replaceAll('-', '')}`;
    const admin = client(base.toString());
    const target = new URL(base);
    target.pathname = `/${databaseName}`;
    const db = client(target.toString());
    let created = false;
    function command(args) {
      const result = spawnSync(process.execPath, args, {
        env: { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test' },
        stdio: 'pipe',
        timeout: 30000,
      });
      assert.equal(
        result.status,
        0,
        `Database command failed: ${args.join(' ')} (output hidden to protect credentials)`,
      );
    }
    const ordered = [{ displayOrder: 'asc' }, { id: 'asc' }];
    async function snapshot() {
      return db.profile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          skills: {
            orderBy: [{ displayOrder: 'asc' }, { skillId: 'asc' }],
            include: { skill: true },
          },
          experience: { orderBy: ordered, include: { achievements: { orderBy: ordered } } },
          projects: { orderBy: ordered },
        },
      });
    }
    try {
      // The generated name contains only a fixed prefix and UUID hex; no developer DB is reset.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      created = true;
      command(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
      assert.equal(await db.profile.count(), 0);
      command(['scripts/prepare.mjs']);
      const first = await snapshot();
      assert.equal(await db.profile.count(), 1);
      assert.equal(await db.skill.count(), 27);
      assert.equal(await db.profileSkill.count(), 27);
      assert.equal(await db.experience.count(), 2);
      assert.equal(await db.experienceAchievement.count(), 7);
      assert.equal(await db.project.count(), 3);
      const { skills: links, experience: jobs, projects: savedProjects, ...savedProfile } = first;
      assert.deepEqual(savedProfile, profile);
      assert.deepEqual(
        links.map((link) => link.skill.name),
        skills.map((skill) => skill.name),
      );
      assert.deepEqual(
        links.map((link) => link.displayOrder),
        skills.map((skill) => skill.displayOrder),
      );
      assert.deepEqual(
        jobs.map((job) => job.company),
        ['Буше', 'Московский Кредитный Банк'],
      );
      for (const [index, job] of jobs.entries()) {
        const expected = experience[index];
        assert.equal(job.displayOrder, index);
        assert.equal(job.startDate.toISOString().slice(0, 10), expected.startDate);
        assert.equal(job.endDate.toISOString().slice(0, 10), expected.endDate);
        assert.deepEqual(
          job.achievements.map((a) => a.text),
          expected.achievements.map((a) => a.text),
        );
        assert.deepEqual(
          job.achievements.map((a) => a.displayOrder),
          expected.achievements.map((_, i) => i),
        );
        assert.ok(job.achievements.every((a) => a.experienceId === job.id));
      }
      assert.deepEqual(
        savedProjects,
        projects.map((project, displayOrder) => ({
          ...project,
          displayOrder,
          profileId: profile.id,
        })),
      );
      assert.equal(savedProjects[1].repositoryUrl, null);
      assert.equal(savedProjects[2].repositoryUrl, null);
      // Unmanaged records, including records attached to the seeded profile, survive.
      await db.project.create({
        data: {
          id: 'unmanaged-project',
          profileId: profile.id,
          name: 'Preserve me',
          description: 'Unmanaged',
          displayOrder: 100,
        },
      });
      await db.profile.create({ data: { ...profile, id: 'unmanaged-profile', name: 'Unmanaged' } });
      command(['node_modules/prisma/build/index.js', 'db', 'seed']);
      const second = await snapshot();
      assert.deepEqual(
        { ...second, projects: second.projects.filter((p) => p.id !== 'unmanaged-project') },
        first,
      );
      assert.equal(await db.profile.count(), 2);
      assert.equal(await db.project.count(), 4);
      assert.equal(await db.skill.count(), 27);
      assert.equal(await db.profileSkill.count(), 27);
      assert.equal(await db.experience.count(), 2);
      assert.equal(await db.experienceAchievement.count(), 7);
      // Correct managed edits on rerun, still retaining unrelated data.
      await db.project.update({
        where: { id: 'project-lexora' },
        data: { name: 'Changed', repositoryUrl: 'https://example.com', displayOrder: 99 },
      });
      command(['node_modules/prisma/build/index.js', 'db', 'seed']);
      assert.deepEqual(await snapshot(), second);
      // A conflicting managed ID belonging elsewhere must roll the entire seed back.
      await db.profile.update({
        where: { id: profile.id },
        data: { headline: 'Must survive rollback' },
      });
      await db.project.update({
        where: { id: 'project-orbit' },
        data: { profileId: 'unmanaged-profile' },
      });
      const failed = spawnSync(process.execPath, ['prisma/run-seed.mjs'], {
        env: { ...process.env, DATABASE_URL: target.toString() },
        encoding: 'utf8',
        timeout: 30000,
      });
      assert.equal(failed.status, 1);
      assert.ok(!failed.stderr.includes(target.toString()));
      assert.equal(
        (await db.profile.findUniqueOrThrow({ where: { id: profile.id } })).headline,
        'Must survive rollback',
      );
    } finally {
      await db.$disconnect();
      try {
        if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${databaseName}"`);
      } finally {
        await admin.$disconnect();
      }
    }
  },
);
