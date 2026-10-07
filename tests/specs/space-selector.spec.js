import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const view of ['tasks', 'notes', 'calendar']) {
  test(`desktop (${view}): seletor de espaço fica à direita do cartão do título`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view });
    const card = await page.locator('.page-header-card').boundingBox();
    const chip = await page.locator('#spaceSelectorBtn').boundingBox();
    const title = await page.locator('#viewTitle').boundingBox();

    expect(chip.x).toBeGreaterThan(card.x + card.width * 0.6);
    expect(chip.x + chip.width).toBeLessThanOrEqual(card.x + card.width);
    expect(chip.y).toBeGreaterThanOrEqual(card.y);
    expect(chip.y + chip.height).toBeLessThanOrEqual(card.y + card.height);
    expect(chip.x).toBeGreaterThan(title.x + title.width); // lado a lado, não em cima
  });
}

test('desktop: a lista de espaços abre dentro da tela, alinhada à direita do botão', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.locator('#spaceSelectorBtn').click();
  const dd = await page.locator('#spaceSelectorDropdown').boundingBox();
  const chip = await page.locator('#spaceSelectorBtn').boundingBox();
  expect(dd.x).toBeGreaterThanOrEqual(0);
  expect(dd.x + dd.width).toBeLessThanOrEqual(1280);
  expect(Math.abs((dd.x + dd.width) - (chip.x + chip.width))).toBeLessThan(2);
});
