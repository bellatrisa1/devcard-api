import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PORTFOLIO_PROFILE_ID } from './portfolio.identity.js';

@Injectable()
export class PortfolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile() {
    // Prisma batches relation reads; this is one client call, not necessarily one SQL statement.
    return this.prisma.profile.findUnique({
      where: { id: PORTFOLIO_PROFILE_ID },
      include: {
        skills: {
          orderBy: [{ displayOrder: 'asc' }, { skillId: 'asc' }],
          include: { skill: true },
        },
        experience: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          include: { achievements: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] } },
        },
        projects: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      },
    });
  }
}
