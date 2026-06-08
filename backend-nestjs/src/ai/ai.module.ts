import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { RecommendationService } from './recommendation.service';
import { ExpenseService } from './expense.service';
import { ForecastService } from './forecast.service';
import { CoachService } from './coach.service';

@Module({
  controllers: [AIController],
  providers: [
    RecommendationService,
    ExpenseService,
    ForecastService,
    CoachService,
  ],
})
export class AIModule {}
