import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrencyType } from '@prisma/client';

@Controller('api/wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  async getBalances(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.walletService.getWalletBalances(userId);
  }

  @Post('topup')
  async topUp(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('currencyType') currencyType: CurrencyType,
    @Body('description') description?: string,
  ) {
    if (!userId || !amount || !currencyType) {
      throw new BadRequestException('userId, amount, and currencyType are required');
    }
    return this.walletService.topUp(userId, Number(amount), currencyType, description);
  }

  @Post('pay')
  async executePayment(
    @Body('userId') userId: string,
    @Body('amountCredit') amountCredit: number,
    @Body('paymentMethod') paymentMethod: CurrencyType,
    @Body('orderId') orderId?: string,
  ) {
    if (!userId || !amountCredit || !paymentMethod) {
      throw new BadRequestException('userId, amountCredit, and paymentMethod are required');
    }
    return this.walletService.payWithWallet(userId, Number(amountCredit), paymentMethod, orderId);
  }
}
