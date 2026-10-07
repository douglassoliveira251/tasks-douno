import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const view of ['tasks', 'notes', 'calendar']) {
  test(`desktop (${view}): seletor de espaço fica na barra do topo, à esquerda do botão (?)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view });
    const chip = await page.locator('#spaceSelectorBtn').boundingBox();
    const help = await page.locator('#helpBtn').boundingBox();
    const topbar = await page.locator('.topbar').boundingBox();

    expect(await page.locator('#spaceSelectorWrap').evaluate(el => !!el.closest('.topbar'))).toBe(true);
    expect(chip.x + chip.width).toBeLessThanOrEqual(help.x); // à esquerda do (?)
    expect(chip.height).toBeLessThanOrEqual(help.height + 1); // mesma altura dos outros botões
    expect(chip.width).toBeLessThan(200);
    await expect(page.locator('.space-selector-tag')).toBeVisible();
    await expect(page.locator('.space-selector-tag')).toHaveText('Espaço');
    expect(chip.y).toBeGreaterThanOrEqual(topbar.y);
    expect(chip.y + chip.height).toBeLessThanOrEqual(topbar.y + topbar.height);
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

test('celular: o seletor fica no cartão do título e volta para o topo ao alargar a janela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  expect(await page.locator('#spaceSelectorWrap').evaluate(el => !!el.closest('.page-header-card'))).toBe(true);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => page.locator('#spaceSelectorWrap').evaluate(el => !!el.closest('.topbar'))).toBe(true);
});

test('Visão geral e Configurações não mostram o seletor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await expect(page.locator('#spaceSelectorWrap')).toBeHidden();
});
