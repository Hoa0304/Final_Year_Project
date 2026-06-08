import { Controller, Get, Post, Query, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { ExpenseService } from './expense.service';
import { ForecastService } from './forecast.service';
import { CoachService } from './coach.service';

@Controller('api/ai')
export class AIController {
  constructor(
    private recService: RecommendationService,
    private expService: ExpenseService,
    private forecastService: ForecastService,
    private coachService: CoachService,
  ) {}

  @Get('recommendations')
  async getRecommendations(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.recService.getRecommendations(userId);
  }

  @Get('expense-analysis')
  async getExpenseAnalysis(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.expService.getExpenseAnalysis(userId);
  }

  @Get('budget-forecast')
  async getBudgetForecast(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.forecastService.getBudgetForecast(userId);
  }

  @Post('financial-coach')
  @HttpCode(200)
  async getFinancialCoachAdvice(@Body('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const expense = await this.expService.getExpenseAnalysis(userId);
    const forecast = await this.forecastService.getBudgetForecast(userId);
    const advice = await this.coachService.getFinancialAdvice(expense, forecast);
    return { advice };
  }
}
