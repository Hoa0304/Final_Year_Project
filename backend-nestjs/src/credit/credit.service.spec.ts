import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyType } from '@prisma/client';

describe('CreditService', () => {
  let service: CreditService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      systemSettings: {
        findFirst: jest.fn().mockResolvedValue({
          coinRate: 100.0,
          vndRate: 1.0,
        }),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CreditService>(CreditService);
  });

  it('should convert Coin to Credit correctly', async () => {
    const credits = await service.convertToCredit(10, CurrencyType.COIN);
    expect(credits).toBe(1000);
  });

  it('should convert VND to Credit correctly', async () => {
    const credits = await service.convertToCredit(500, CurrencyType.VND);
    expect(credits).toBe(500);
  });

  it('should convert Credits back to original currency correctly', async () => {
    const coins = await service.convertFromCredit(1000, CurrencyType.COIN);
    expect(coins).toBe(10);

    const vnd = await service.convertFromCredit(500, CurrencyType.VND);
    expect(vnd).toBe(500);
  });
});
