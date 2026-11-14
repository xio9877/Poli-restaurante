jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { DineInService } from './dine-in.service';

describe('DineInService', () => {
  let service: DineInService;

  it('creates a fully priced order and reserves the table in one transaction', async () => {
    const savedOrder = { id: 21, total: 119.3 };
    const tx = {
      restaurantTable: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, name: 'Mesa 4' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, price: '100.25', status: 'available' }),
      },
      order: {
        create: jest.fn().mockResolvedValue({ id: 21 }),
        findUnique: jest.fn().mockResolvedValue(savedOrder),
      },
      dineInOrder: { create: jest.fn().mockResolvedValue({ orderId: 21 }) },
      orderStateHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DineInService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    service = module.get(DineInService);

    await expect(
      service.createOrder(
        { tableId: 4, guestCount: 2, details: [{ productId: 8, amount: 1 }] },
        'waiter-1'
      )
    ).resolves.toBe(savedOrder);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 100.25, taxAmount: 19.05, total: 119.3 }),
      })
    );
    expect(tx.restaurantTable.updateMany).toHaveBeenCalledWith({
      where: { id: 4, state: 'available' },
      data: { state: 'unavailable' },
    });
  });

  it('does not create an order if another request has claimed the table', async () => {
    const tx = {
      restaurantTable: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, name: 'Mesa 4' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      order: { create: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DineInService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    service = module.get(DineInService);

    await expect(
      service.createOrder({ tableId: 4, details: [{ productId: 8, amount: 1 }] }, 'waiter-1')
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});
