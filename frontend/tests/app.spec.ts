import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: Page) {
  test.skip(
    !adminEmail || !adminPassword,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated tests.'
  );
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Poli Restaurante - Login and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check login page elements
    await expect(page.locator('h1')).toContainText('Poli Restaurante');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Iniciar Sesión');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);

    // Verify dashboard loaded - use more specific selector
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Órdenes Activas')).toBeVisible();
    await expect(page.locator('text=Mesas Ocupadas')).toBeVisible();
    await expect(page.locator('text=Ventas Hoy')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message in login form (login page has no layout/toast)
    await expect(page.locator('xpath=//div[contains(@class, "bg-red-50")]//p')).toContainText(
      'Invalid login credentials'
    );
  });

  test('should navigate to Tables page', async ({ page }) => {
    await login(page);

    // Navigate to Tables via sidebar
    await page.click('text=Mesas');
    await page.waitForURL('**/tables');

    // Verify tables page
    await expect(page.locator('h2:has-text("Gestión de Mesas")')).toBeVisible();
    await expect(page.locator('button:has-text("Nueva Mesa")')).toBeVisible();
  });

  test('should navigate to Orders page', async ({ page }) => {
    await login(page);

    // Navigate to Orders
    await page.click('text=Órdenes');
    await page.waitForURL('**/orders');

    // Verify orders page
    await expect(page.locator('h2:has-text("Órdenes")')).toBeVisible();
  });

  test('should navigate to Kitchen page', async ({ page }) => {
    await login(page);

    // Navigate to Kitchen
    await page.click('text=Cocina');
    await page.waitForURL('**/kitchen');

    // Verify kitchen page
    await expect(page.locator('h2:has-text("Vista Cocina")')).toBeVisible();
  });

  test('should navigate to Menu page', async ({ page }) => {
    await login(page);

    // Navigate to Menu
    await page.click('text=Menú');
    await page.waitForURL('**/menu');

    // Verify menu page
    await expect(page.locator('h2:has-text("Gestión de Menú")')).toBeVisible();
  });

  test('should navigate to Reports page', async ({ page }) => {
    await login(page);

    // Navigate to Reports
    await page.click('text=Reportes');
    await page.waitForURL('**/reports');

    // Verify reports page
    await expect(page.locator('h2:has-text("Reportes y Análisis")')).toBeVisible();
  });

  test('should create a new table', async ({ page }) => {
    await login(page);

    // Navigate to Tables
    await page.click('text=Mesas');
    await page.waitForURL('**/tables');

    // Click New Table button
    await page.click('text=Nueva Mesa');

    // Fill table form
    await page.fill('input[placeholder="Ej: Mesa 1, Terraza A"]', 'Mesa Test Playwright');
    await page.fill(
      'textarea[placeholder="Ubicación, características..."]',
      'Creada por Playwright test'
    );
    await page.click('button:has-text("Crear")');

    // Wait for toast/success and table list refresh
    await page.waitForTimeout(2000);

    // Verify table appears
    await expect(page.locator('text=Mesa Test Playwright')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);

    // Click logout button in sidebar
    await page.click('button[title="Cerrar sesión"]');

    // Should redirect to login
    await page.waitForURL('**/login');
    await expect(page.locator('text=Iniciar Sesión')).toBeVisible();
  });
});
