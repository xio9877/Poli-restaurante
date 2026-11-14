jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from './delivery.service';

describe('DeliveryService', () => {
  it('rejects invalid delivery status transitions without changing state', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({ orderId: 7, status: 'pending' }),
        update: jest.fn(),
      },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    const service = module.get(DeliveryService);

    await expect(service.updateStatus(7, 'delivered')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.deliveryOrder.update).not.toHaveBeenCalled();
  });
});
