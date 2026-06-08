import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { CurrencyType, TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private creditService: CreditService,
  ) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: true },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { balances: true },
      });
      
      // Initialize zero balances for COIN and VND by default
      await this.prisma.walletBalance.createMany({
        data: [
          { walletId: wallet.id, currencyType: CurrencyType.COIN, balance: 0.0 },
          { walletId: wallet.id, currencyType: CurrencyType.VND, balance: 0.0 },
        ],
      });

      // Refetch wallet
      wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        include: { balances: true },
      });
    }

    if (!wallet) {
      throw new BadRequestException('Failed to retrieve or create user wallet');
    }

    return wallet;
  }

  async getWalletBalances(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    
    // We will calculate balance representations in Credits, Coins, and VND
    const details = [];
    let totalCredits = 0;

    for (const bal of wallet.balances) {
      const balanceVal = Number(bal.balance);
      const inCredits = await this.creditService.convertToCredit(balanceVal, bal.currencyType);
      totalCredits += inCredits;

      details.push({
        currencyType: bal.currencyType,
        rawBalance: balanceVal,
        inCredits,
      });
    }

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      totalCredits,
      balances: details,
    };
  }

  async topUp(userId: string, amount: number, currencyType: CurrencyType, description?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Top up amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);

    return this.prisma.$transaction(async (tx: any) => {
      const updatedBalance = await tx.walletBalance.upsert({
        where: {
          walletId_currencyType: {
            walletId: wallet.id,
            currencyType,
          },
        },
        update: {
          balance: { increment: amount },
        },
        create: {
          walletId: wallet.id,
          currencyType,
          balance: amount,
        },
      });

      // Convert amount to Credit for the ledger entry
      const amountCredit = await this.creditService.convertToCredit(amount, currencyType);

      // Create ledger entry
      await tx.ledgerEntry.create({
        data: {
          userId,
          amountCredit,
          paymentMethod: currencyType,
          type: TransactionType.EARN,
          description: description || `Top up of ${amount} ${currencyType}`,
        },
      });

      return updatedBalance;
    });
  }

  async payWithWallet(userId: string, amountCredit: number, paymentMethod: CurrencyType, orderId?: string) {
    if (amountCredit <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0 Credits');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        include: { balances: true },
      });

      if (!wallet) {
        throw new NotFoundException('User wallet not found');
      }

      // Check balance
      const specificBalance = wallet.balances.find((b: any) => b.currencyType === paymentMethod);
      const currentBalanceRaw = specificBalance ? Number(specificBalance.balance) : 0;
      
      // Convert raw balance to credits
      const currentBalanceInCredits = await this.creditService.convertToCredit(currentBalanceRaw, paymentMethod);

      if (currentBalanceInCredits < amountCredit) {
        throw new BadRequestException(
          `Insufficient funds. Required: ${amountCredit} Credits. Available in ${paymentMethod}: ${currentBalanceInCredits} Credits.`
        );
      }

      // Convert amountCredit back to original raw currency amount to deduct
      const deductAmountRaw = await this.creditService.convertFromCredit(amountCredit, paymentMethod);

      // Deduct selected balance
      await tx.walletBalance.update({
        where: {
          walletId_currencyType: {
            walletId: wallet.id,
            currencyType: paymentMethod,
          },
        },
        data: {
          balance: { decrement: deductAmountRaw },
        },
      });

      // Record transaction ledger in Credit
      const ledger = await tx.ledgerEntry.create({
        data: {
          userId,
          orderId,
          amountCredit,
          paymentMethod,
          type: TransactionType.SPEND,
          description: `Paid for order using ${paymentMethod}`,
        },
      });

      return {
        success: true,
        ledgerId: ledger.id,
        amountCredit,
        paymentMethod,
        deductedRawAmount: deductAmountRaw,
      };
    });
  }
}
