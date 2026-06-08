import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { differenceInDays, subDays } from 'date-fns';

@Injectable()
export class ForecastService {
  constructor(private prisma: PrismaService) {}

  async getBudgetForecast(userId: string) {
    try {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);

      // Calculate moving average of daily spending
      const transactions = await this.prisma.ledgerEntry.findMany({
        where: {
          userId,
          type: 'SPEND',
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      const totalPeriodSpend = transactions.reduce((sum: number, t: any) => sum + Number(t.amountCredit), 0);
      const dailyAverage = totalPeriodSpend / 30.0;

      // Get current budget
      const budget = await this.prisma.budget.findFirst({
        where: {
          userId,
          startDate: { lte: today },
          endDate: { gte: today },
        },
      });

      if (!budget) {
        return {
          dailyAverage: Number(dailyAverage.toFixed(2)),
          forecastText: 'No active budget set for forecasting.',
          daysRemaining: -1,
          status: 'UNKNOWN',
          confidence: 0.5,
        };
      }

      const currentSpent = transactions
        .filter((t: any) => t.createdAt >= budget.startDate)
        .reduce((sum: number, t: any) => sum + Number(t.amountCredit), 0);

      const remainingBudget = Number(budget.limitAmountCredit) - currentSpent;
      const daysRemaining = dailyAverage > 0 ? Math.max(0, Math.floor(remainingBudget / dailyAverage)) : 999;
      const daysInBudgetPeriod = differenceInDays(budget.endDate, today);

      let status = 'On Track';
      let confidence = 0.9;

      if (daysRemaining < daysInBudgetPeriod) {
        status = 'At Risk';
        confidence = Math.max(0.6, 0.9 - (daysInBudgetPeriod - daysRemaining) * 0.02);
      }

      return {
        dailyAverage: Number(dailyAverage.toFixed(2)),
        remainingBudget: Number(remainingBudget.toFixed(2)),
        daysRemaining,
        daysInBudgetPeriod,
        status,
        confidence: Number(confidence.toFixed(2)),
      };
    } catch (error) {
      // Fallback response if DB tables not ready
      return {
        dailyAverage: 0,
        remainingBudget: 0,
        daysRemaining: -1,
        daysInBudgetPeriod: 0,
        status: 'UNKNOWN',
        confidence: 0.5,
      };
    }
  }
}
