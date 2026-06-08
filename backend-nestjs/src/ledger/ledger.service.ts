import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async getUserLedger(userId: string, limit = 50, offset = 0) {
    return this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getLedgerStats() {
    const aggregations = await this.prisma.ledgerEntry.groupBy({
      by: ['paymentMethod', 'type'],
      _sum: {
        amountCredit: true,
      },
      _count: true,
    });

    return aggregations.map((a: any) => ({
      paymentMethod: a.paymentMethod,
      transactionType: a.type,
      totalCredits: Number(a._sum.amountCredit || 0),
      count: a._count,
    }));
  }
}
