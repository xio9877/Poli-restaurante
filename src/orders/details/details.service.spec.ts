import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DetailsService } from './details.service';

describe('DetailsService', () => {
  const detail = {
    id: 5,
    orderId: 7,
    amount: 2,
    unitPrice: 10,
    state: 'pending',
  };
  const order = {
    id: 7,
    status: 'open',
    subtotal: 20,
    taxRate: 0.19,
    discount: 0,
  };

  function createService(orderData = order) {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue(orderData),
        update: jest.fn(),
      },
      orderDetail: {
        findFirst: jest.fn().mockResolvedValue(detail),
        update: jest.fn().mockResolvedValue({ ...detail, amount: 5 }),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
        create: jest.fn(),
      },
      orderDetailStateHistory: { create: jest.fn() },
      orderStateHistory: { create: jest.fn() },
      dineInOrder: { findUnique: jest.fn() },
      restaurantTable: { update: jest.fn() },
    };
    const prisma = {
      client: {
        $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
        orderDetail: { findFirst: jest.fn().mockResolvedValue(detail) },
      },
    } as unknown as PrismaService;

    return { service: new DetailsService(prisma), tx };
  }

  it('recalculates the order total when an open-order quantity changes', async () => {
    const { service, tx } = createService();

    await service.update(detail.id, { amount: 5 });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: order.id },
      data: { subtotal: 50, taxAmount: 9.5, total: 59.5 },
    });
  });

  it('preserves a zero tax rate when recalculating totals', async () => {
    const { service, tx } = createService({ ...order, taxRate: 0 });

    await service.update(detail.id, { amount: 5 });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: order.id },
      data: { subtotal: 50, taxAmount: 0, total: 50 },
    });
  });

  it('rejects detail edits after an order has been closed', async () => {
    const { service, tx } = createService({ ...order, status: 'ready' });

    await expect(service.update(detail.id, { amount: 5 })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('rejects empty detail updates instead of silently succeeding', async () => {
    const { service } = createService();

    await expect(service.update(detail.id, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves an order into preparation when its first product starts cooking', async () => {
    const { service, tx } = createService();
    tx.orderDetail.findMany.mockResolvedValue([{ ...detail, state: 'in_preparation' }]);

    await service.updateStatus(detail.id, 'in_preparation', 'user-1');

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: order.id },
      data: { status: 'in_preparation' },
    });
    expect(tx.orderStateHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: order.id,
        oldState: 'open',
        newState: 'in_preparation',
      }),
    });
  });
});
