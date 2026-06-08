import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyType } from '@prisma/client';

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  async getRates() {
    try {
      let settings = await this.prisma.systemSettings.findFirst();
      if (!settings) {
        settings = await this.prisma.systemSettings.create({
          data: {
            coinRate: 100.0, // 1 Coin = 100 Credits
            vndRate: 1.0,    // 1 VND = 1 Credit
          },
        });
      }
      return settings;
    } catch (error) {
      // Return default rates if database connection isn't ready
      return {
        coinRate: 100.0,
        vndRate: 1.0,
      };
    }
  }

  async convertToCredit(amount: number, fromCurrency: CurrencyType): Promise<number> {
    const rates = await this.getRates();
    if (fromCurrency === CurrencyType.COIN) {
      return amount * Number(rates.coinRate);
    }
    if (fromCurrency === CurrencyType.VND) {
      return amount * Number(rates.vndRate);
    }
    // Other currencies are treated 1:1 with credits unless dynamic exchange logic added
    return amount;
  }

  async convertFromCredit(amountCredit: number, toCurrency: CurrencyType): Promise<number> {
    const rates = await this.getRates();
    if (toCurrency === CurrencyType.COIN) {
      return amountCredit / Number(rates.coinRate);
    }
    if (toCurrency === CurrencyType.VND) {
      return amountCredit / Number(rates.vndRate);
    }
    return amountCredit;
  }
}
