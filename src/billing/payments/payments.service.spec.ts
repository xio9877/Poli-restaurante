jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('does not record a payment whose amount differs from the issued invoice', async () => {
    const tx = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          total: '119.00',
          status: 'issued',
          order: { status: 'open' },
        }),
      },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    const service = module.get(PaymentsService);

    await expect(
      service.processPayment(9, { method: 'cash', amount: 118.99 })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('rejects payment for an order that was canceled after invoice creation', async () => {
    const tx = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          total: '119.00',
          status: 'issued',
          order: { status: 'canceled' },
        }),
      },
      payment: { findUnique: jest.fn(), create: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    const service = module.get(PaymentsService);

    await expect(service.processPayment(9, { method: 'cash', amount: 119 })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});
