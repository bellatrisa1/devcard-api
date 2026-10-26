import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from './portfolio.repository.js';
import type { Profile } from './portfolio.types.js';

@Injectable()
export class PortfolioService {
  constructor(private readonly repository: PortfolioRepository) {}

  async getProfile(): Promise<Profile | null> {
    const record = await this.repository.findProfile();
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      headline: record.headline,
      description: record.description,
      githubUrl: record.githubUrl,
      telegramUrl: record.telegramUrl,
      skills: record.skills.map(({ skill }) => ({ id: skill.id, name: skill.name })),
      experience: record.experience.map((job) => ({
        id: job.id,
        company: job.company,
        position: job.position,
        startDate: job.startDate.toISOString().slice(0, 7),
        endDate: job.endDate?.toISOString().slice(0, 7) ?? null,
        achievements: job.achievements.map((a) => ({ id: a.id, text: a.text })),
      })),
      projects: record.projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        repositoryUrl: project.repositoryUrl,
        demoUrl: project.demoUrl,
      })),
    };
  }
}
