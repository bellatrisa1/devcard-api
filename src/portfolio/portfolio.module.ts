import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PortfolioRepository } from './portfolio.repository.js';
import { PortfolioService } from './portfolio.service.js';
import { PortfolioResolver } from './portfolio.resolver.js';

@Module({
  imports: [DatabaseModule],
  providers: [PortfolioRepository, PortfolioService, PortfolioResolver],
})
export class PortfolioModule {}
