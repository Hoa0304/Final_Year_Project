import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async getExpenseAnalysis(userId: string) {
    try {
      const ledger = await this.prisma.ledgerEntry.findMany({
        where: { userId, type: 'SPEND' },
      });

      const orders = await this.prisma.order.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { orderItems: { include: { product: true } } },
      });

      // 1. Spending Distribution
      const categoryTotals: Record<string, number> = {};
      let totalSpend = 0;

      orders.forEach((o: any) => {
        o.orderItems.forEach((oi: any) => {
          const cat = oi.product.category;
          const cost = Number(oi.priceCredit) * oi.quantity;
          categoryTotals[cat] = (categoryTotals[cat] || 0) + cost;
          totalSpend += cost;
        });
      });

      const distribution = Object.entries(categoryTotals).map(([category, amt]) => ({
        category,
        amount: amt,
        percentage: totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0,
      }));

      // 2. Trend Analysis (Current Month vs Last Month)
      const now = new Date();
      const curStart = startOfMonth(now);
      const lastStart = startOfMonth(subMonths(now, 1));
      const lastEnd = endOfMonth(subMonths(now, 1));

      const curSpendSum = ledger
        .filter((l: any) => l.createdAt >= curStart)
        .reduce((sum: number, l: any) => sum + Number(l.amountCredit), 0);

      const prevSpendSum = ledger
        .filter((l: any) => l.createdAt >= lastStart && l.createdAt <= lastEnd)
        .reduce((sum: number, l: any) => sum + Number(l.amountCredit), 0);

      let increasePercent = 0;
      if (prevSpendSum > 0) {
        increasePercent = Math.round(((curSpendSum - prevSpendSum) / prevSpendSum) * 100);
      }

      // 3. Anomaly Detection (Any single spend exceeding 2x transaction average)
      const anomalies: any[] = [];
      if (ledger.length > 0) {
        const averageSpend = totalSpend / (ledger.length || 1);
        ledger.forEach((l: any) => {
          if (Number(l.amountCredit) > averageSpend * 2) {
            anomalies.push({
              date: l.createdAt,
              amount: Number(l.amountCredit),
              reason: `Single transaction exceeds your average (${averageSpend.toFixed(0)} Credits) by 100%+`,
            });
          }
        });
      }

      return {
        totalSpend,
        distribution: distribution.length > 0 ? distribution : [{ category: 'General', amount: 0, percentage: 0 }],
        trends: {
          currentMonth: curSpendSum,
          previousMonth: prevSpendSum,
          changePercentage: increasePercent,
        },
        anomalies,
      };
    } catch (error) {
      // Fallback response if DB tables are not created/migrated yet
      return {
        totalSpend: 0,
        distribution: [{ category: 'No Data', amount: 0, percentage: 0 }],
        trends: {
          currentMonth: 0,
          previousMonth: 0,
          changePercentage: 0,
        },
        anomalies: [],
      };
    }
  }
}
