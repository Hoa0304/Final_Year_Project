import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';

@Controller('api/ledger')
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get('history')
  async getUserHistory(
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const parseLimit = limit ? Number(limit) : 50;
    const parseOffset = offset ? Number(offset) : 0;
    return this.ledgerService.getUserLedger(userId, parseLimit, parseOffset);
  }

  @Get('stats')
  async getLedgerStats() {
    return this.ledgerService.getLedgerStats();
  }
}
