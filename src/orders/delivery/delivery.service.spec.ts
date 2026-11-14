jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from './delivery.service';

describe('DeliveryService', () => {
  const createService = (client: object) =>
    Test.createTestingModule({
      providers: [DeliveryService, { provide: PrismaService, useValue: { client } }],
    }).compile();

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
    const module: TestingModule = await createService(client);
    const service = module.get(DeliveryService);

    await expect(service.updateStatus(7, 'delivered')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.deliveryOrder.update).not.toHaveBeenCalled();
  });

  it('adds the delivery fee to an existing order before linking the delivery', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          status: 'open',
          total: '119.00',
          deliveryOrder: null,
          dineInOrder: null,
          invoice: null,
        }),
        update: jest.fn(),
      },
      customer: { findUnique: jest.fn().mockResolvedValue({ id: 'customer-1' }) },
      customerAddress: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, customerId: 'customer-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'driver-1', role: 'domiciliary' }),
      },
      deliveryOrder: { create: jest.fn().mockResolvedValue({ orderId: 7 }) },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await service.create({
      orderId: 7,
      customerId: 'customer-1',
      addressId: 2,
      domiciliaryId: 'driver-1',
      deliveryFee: 10,
    });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { total: 129 },
    });
    expect(tx.deliveryOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ deliveryFee: 10 }),
    });
  });

  it('updates order totals when the delivery fee changes', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 7,
          deliveryFee: '5.00',
          customerId: 'customer-1',
          addressId: 2,
          order: { total: '119.00', invoice: null },
        }),
        update: jest.fn().mockResolvedValue({ orderId: 7, deliveryFee: 10 }),
      },
      order: { update: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await service.update(7, { deliveryFee: 10 });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { total: 124 },
    });
    expect(tx.deliveryOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deliveryFee: 10 }) })
    );
  });

  it('does not change delivery charges after an invoice exists', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 7,
          deliveryFee: '5.00',
          customerId: 'customer-1',
          addressId: 2,
          order: { total: '119.00', invoice: { id: 9, status: 'issued' } },
        }),
        update: jest.fn(),
      },
      order: { update: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await expect(service.update(7, { deliveryFee: 10 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.deliveryOrder.update).not.toHaveBeenCalled();
  });

  it('marks the order served when the delivery is completed', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 7,
          status: 'picked_up',
          domiciliaryId: 'driver-1',
        }),
        update: jest.fn().mockResolvedValue({ orderId: 7, status: 'delivered' }),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, status: 'ready' }),
        update: jest.fn(),
      },
      orderStateHistory: { create: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await service.updateStatus(7, 'delivered');

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ status: 'served', completedAt: expect.any(Date) }),
    });
    expect(tx.orderStateHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ oldState: 'ready', newState: 'served' }),
    });
  });

  it('does not deliver an order that was already canceled', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 7,
          status: 'picked_up',
          domiciliaryId: 'driver-1',
        }),
        update: jest.fn(),
      },
      order: { findUnique: jest.fn().mockResolvedValue({ id: 7, status: 'canceled' }) },
      orderStateHistory: { create: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await expect(service.updateStatus(7, 'delivered')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.deliveryOrder.update).not.toHaveBeenCalled();
  });

  it('does not cancel a delivery after its invoice was paid', async () => {
    const tx = {
      deliveryOrder: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 7,
          status: 'pending',
          domiciliaryId: 'driver-1',
        }),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          status: 'open',
          invoice: { id: 9, payment: { status: 'completed' } },
        }),
        update: jest.fn(),
      },
      invoice: { update: jest.fn() },
      orderStateHistory: { create: jest.fn() },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module = await createService(client);
    const service = module.get(DeliveryService);

    await expect(service.updateStatus(7, 'canceled')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.deliveryOrder.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
