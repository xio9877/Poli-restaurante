jest.mock('../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService billing invariants', () => {
  const createService = (client: object) =>
    Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: { client } }],
    }).compile();

  it('does not cancel an order with a completed payment', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          status: 'ready',
          invoice: { id: 9, status: 'issued', payment: { status: 'completed' } },
        }),
        update: jest.fn(),
      },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await createService(client);
    const service = module.get(OrdersService);

    await expect(service.updateStatus(7, 'canceled', 'waiter-1')).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('cancels an unpaid invoice in the same transaction as its order', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          status: 'ready',
          invoice: { id: 9, status: 'issued', payment: null },
        }),
        update: jest.fn(),
      },
      orderDetail: { findMany: jest.fn().mockResolvedValue([]) },
      orderStateHistory: { create: jest.fn() },
      invoice: { update: jest.fn() },
      dineInOrder: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
      order: { findUnique: jest.fn().mockResolvedValue({ id: 7, status: 'canceled' }) },
    };
    const module: TestingModule = await createService(client);
    const service = module.get(OrdersService);

    await service.updateStatus(7, 'canceled', 'waiter-1');

    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ status: 'canceled' }),
      })
    );
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: 'canceled' },
    });
  });

  it('does not delete an order that has a completed payment', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          invoice: { id: 9, payment: { status: 'completed' } },
        }),
      },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await createService(client);
    const service = module.get(OrdersService);

    await expect(service.delete(7)).rejects.toBeInstanceOf(ConflictException);
  });
});
