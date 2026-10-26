import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { validateEnvironment } from '../dist/config/environment.js';
import { profile, skills, experience, projects } from './portfolio-data.mjs';

export async function seedPortfolio(prisma) {
  await prisma.$transaction(
    async (tx) => {
      await tx.profile.upsert({ where: { id: profile.id }, create: profile, update: profile });
      for (const { displayOrder, ...skill } of skills) {
        const saved = await tx.skill.upsert({
          where: { slug: skill.slug },
          create: skill,
          update: { name: skill.name },
        });
        const link = { profileId: profile.id, skillId: saved.id, displayOrder };
        await tx.profileSkill.upsert({
          where: { profileId_skillId: { profileId: profile.id, skillId: saved.id } },
          create: link,
          update: { displayOrder },
        });
      }
      for (const [displayOrder, entry] of experience.entries()) {
        const { achievements, startDate, endDate, ...fields } = entry;
        const existing = await tx.experience.findUnique({ where: { id: entry.id } });
        if (existing && existing.profileId !== profile.id)
          throw new Error('Managed experience ID conflict');
        const data = {
          ...fields,
          profileId: profile.id,
          displayOrder,
          startDate: new Date(`${startDate}T00:00:00.000Z`),
          endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
        };
        await tx.experience.upsert({ where: { id: entry.id }, create: data, update: data });
        for (const [achievementOrder, achievement] of achievements.entries()) {
          const existingAchievement = await tx.experienceAchievement.findUnique({
            where: { id: achievement.id },
          });
          if (existingAchievement && existingAchievement.experienceId !== entry.id)
            throw new Error('Managed achievement ID conflict');
          const data = { ...achievement, experienceId: entry.id, displayOrder: achievementOrder };
          await tx.experienceAchievement.upsert({
            where: { id: achievement.id },
            create: data,
            update: data,
          });
        }
      }
      for (const [displayOrder, project] of projects.entries()) {
        const existing = await tx.project.findUnique({ where: { id: project.id } });
        if (existing && existing.profileId !== profile.id)
          throw new Error('Managed project ID conflict');
        const data = { ...project, profileId: profile.id, displayOrder };
        await tx.project.upsert({ where: { id: project.id }, create: data, update: data });
      }
    },
    { timeout: 15000 },
  );
}

export async function runSeed() {
  const config = validateEnvironment(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 5000 }),
    log: [],
  });
  try {
    await seedPortfolio(prisma);
    console.log('Portfolio seed completed.');
  } finally {
    await prisma.$disconnect();
  }
}
