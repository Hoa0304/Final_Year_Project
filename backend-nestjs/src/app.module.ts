import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CreditModule } from './credit/credit.module';
import { WalletModule } from './wallet/wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, CreditModule, WalletModule, LedgerModule, AIModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
