import { expect, test, type Page } from '@playwright/test';

const user = { id: 'waiter-1', name: 'Mesero Demo', role: 'waiter' };

async function openOrders(page: Page) {
  await page.addInitScript((currentUser) => {
    localStorage.setItem('pr_token', 'test-token');
    localStorage.setItem('pr_user', JSON.stringify(currentUser));
  }, user);
  await page.route('**/auth/validate', (route) => route.fulfill({ json: { user } }));
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Órdenes', exact: true })).toBeVisible();
}

test.describe('Order and billing workflows', () => {
  test('creates an order in a table with a selected product', async ({ page }) => {
    let orderRequest: Record<string, unknown> | undefined;
    await page.route('**/orders?limit=100', (route) => route.fulfill({ json: [] }));
    await page.route('**/tables/available', (route) =>
      route.fulfill({ json: [{ id: 4, name: 'Mesa 4', state: 'available' }] })
    );
    await page.route('**/products?status=available&limit=100', (route) =>
      route.fulfill({ json: [{ id: 8, name: 'Arepa', price: 100.25, status: 'available' }] })
    );
    await page.route('**/dine-in/orders', async (route) => {
      orderRequest = route.request().postDataJSON();
      await route.fulfill({ json: { id: 21, total: 119.3 } });
    });

    await openOrders(page);
    await page.getByRole('button', { name: '+ Orden en Mesa' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva orden en mesa' })).toBeVisible();
    await page.getByLabel('Producto').selectOption('8');
    await page.getByRole('button', { name: 'Agregar producto' }).click();
    await page.getByRole('button', { name: 'Crear orden' }).click();

    await expect
      .poll(() => orderRequest)
      .toMatchObject({
        tableId: 4,
        guestCount: 1,
        details: [{ productId: 8, amount: 1 }],
      });
  });

  test('creates a customer and address while placing a delivery order', async ({ page }) => {
    let deliveryRequest: Record<string, unknown> | undefined;
    await page.route('**/orders?limit=100', (route) => route.fulfill({ json: [] }));
    await page.route('**/customers?limit=100', (route) => route.fulfill({ json: [] }));
    await page.route('**/products?status=available&limit=100', (route) =>
      route.fulfill({ json: [{ id: 8, name: 'Arepa', price: 100, status: 'available' }] })
    );
    await page.route('**/users?role=domiciliary&limit=100', (route) =>
      route.fulfill({ json: [{ id: 'driver-1', name: 'Domiciliario' }] })
    );
    await page.route('**/customers/with-address', (route) =>
      route.fulfill({
        json: {
          id: 'customer-1',
          name: 'Ana Pérez',
          username: 'ana@example.com',
          phone: '3001234567',
          addresses: [{ id: 2, label: 'Casa', address: 'Calle 1 # 2-3' }],
        },
      })
    );
    await page.route('**/delivery/orders', async (route) => {
      deliveryRequest = route.request().postDataJSON();
      await route.fulfill({ json: { id: 22 } });
    });

    await openOrders(page);
    await page.getByRole('button', { name: '+ Delivery' }).click();
    await page.getByRole('button', { name: 'Nuevo', exact: true }).click();
    await page.getByPlaceholder('Nombre', { exact: true }).fill('Ana Pérez');
    await page.getByPlaceholder('Correo / identificador').fill('ana@example.com');
    await page.getByPlaceholder('Teléfono').fill('3001234567');
    await page.getByPlaceholder('Dirección', { exact: true }).fill('Calle 1 # 2-3');
    await page.getByRole('button', { name: 'Guardar cliente' }).click();
    await page.getByLabel('Domiciliario').selectOption('driver-1');
    await page.getByLabel('Producto').selectOption('8');
    await page.getByRole('button', { name: 'Agregar producto' }).click();
    await page.getByRole('button', { name: 'Crear domicilio' }).click();

    await expect
      .poll(() => deliveryRequest)
      .toMatchObject({
        customerId: 'customer-1',
        addressId: 2,
        domiciliaryId: 'driver-1',
        details: [{ productId: 8, amount: 1 }],
      });
  });

  test('issues an invoice and records a payment', async ({ page }) => {
    let paymentRequest: Record<string, unknown> | undefined;
    const invoice = { id: 9, total: 119, status: 'issued', payment: null };
    await page.route('**/orders?limit=100', (route) =>
      route.fulfill({
        json: [
          {
            id: 3,
            status: 'served',
            total: 119,
            invoice: null,
            dineInOrder: { table: { name: 'Mesa 4' } },
          },
        ],
      })
    );
    await page.route('**/invoices/issue', (route) => route.fulfill({ json: invoice }));
    await page.route('**/payments/invoice/9/process', async (route) => {
      paymentRequest = route.request().postDataJSON();
      await route.fulfill({
        json: { invoiceId: 9, amount: 119, method: 'cash', status: 'completed' },
      });
    });

    await page.addInitScript((currentUser) => {
      localStorage.setItem('pr_token', 'test-token');
      localStorage.setItem('pr_user', JSON.stringify(currentUser));
    }, user);
    await page.route('**/auth/validate', (route) => route.fulfill({ json: { user } }));
    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: 'Facturación y pagos' })).toBeVisible();
    await page.getByRole('button', { name: 'Emitir factura' }).click();
    await page.getByRole('button', { name: 'Registrar pago' }).click();
    await page.getByRole('button', { name: 'Confirmar pago recibido' }).click();

    await expect.poll(() => paymentRequest).toMatchObject({ method: 'cash', amount: 119 });
    await expect(page.getByText('Pagada')).toBeVisible();
  });
});
