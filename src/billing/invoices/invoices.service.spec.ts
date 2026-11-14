jest.mock('../../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  it('issues an invoice using authoritative order totals', async () => {
    const order = {
      id: 3,
      subtotal: '100.00',
      taxRate: '0.19',
      taxAmount: '19.00',
      total: '119.00',
    };
    const invoice = { id: 9, orderId: 3, status: 'issued' };
    const tx = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(invoice),
      },
    };
    const client = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoicesService, { provide: PrismaService, useValue: { client } }],
    }).compile();
    const service = module.get(InvoicesService);

    await expect(service.issue(3, 'cashier-1')).resolves.toBe(invoice);
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 3,
          cashierId: 'cashier-1',
          subtotal: '100.00',
          taxAmount: '19.00',
          total: '119.00',
          status: 'issued',
        }),
      })
    );
  });
});
