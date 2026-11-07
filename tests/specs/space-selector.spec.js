import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const view of ['tasks', 'notes', 'calendar']) {
  test(`desktop (${view}): seletor de espaço fica na faixa de título, à direita`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view });
    const chip = await page.locator('#spaceSelectorBtn').boundingBox();
    const topbar = await page.locator('.topbar').boundingBox();
    expect(await page.locator('#spaceSelectorWrap').evaluate(el => !!el.closest('.topbar'))).toBe(true);
    expect(chip.height).toBeLessThanOrEqual(34);
    expect(chip.width).toBeLessThan(220);
    expect(chip.x).toBeGreaterThan(640); // à direita da faixa
    await expect(page.locator('#spaceSelectorBtn .space-selector-tag')).toBeVisible();
    await expect(page.locator('#spaceSelectorBtn .space-selector-tag')).toHaveText('Espaço:');
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

test('celular: o seletor fica dentro da faixa de título e cabe na tela', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  expect(await page.locator('#spaceSelectorWrap').evaluate(el => !!el.closest('.topbar'))).toBe(true);
  const chip = await page.locator('#spaceSelectorBtn').boundingBox();
  expect(chip.x).toBeGreaterThanOrEqual(0);
  expect(chip.x + chip.width).toBeLessThanOrEqual(390);
});

test('Visão geral mostra o seletor; Configurações não', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await expect(page.locator('#spaceSelectorWrap')).toBeVisible();
  await page.evaluate(() => { currentView = 'settings'; render(); });
  await expect(page.locator('#spaceSelectorWrap')).toBeHidden();
});

test('Resumo tem filtro de espaço próprio, separado das demais telas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    state.categories = [{ id: 'c1', name: 'A', color: '#2F7D5B' }, { id: 'c2', name: 'B', color: '#3B82F6' }];
    const t = (id, cat) => ({ id, title: 'T' + id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 });
    state.tasks = [t('1', 'c1'), t('2', 'c2'), t('3', 'c2')];
    activeCategoryFilter = 'c1'; dashboardSpace = null; render();
  });
  // Resumo começa em "Todos", mesmo com a tela de tarefas filtrada em A
  await expect(page.locator('#spaceSelectorName')).toContainText('Todos');
  await expect(page.locator('.dv-stats .link[data-nodate="due"] b')).toHaveText('3');
  await page.locator('#spaceSelectorBtn').click();
  await page.locator('.space-selector-item[data-cat-id="c2"]').click();
  await expect(page.locator('.dv-stats .link[data-nodate="due"] b')).toHaveText('2');
  // as demais telas continuam no espaço anterior
  expect(await page.evaluate(() => activeCategoryFilter)).toBe('c1');
  await page.evaluate(() => { currentView = 'tasks'; render(); });
  await expect(page.locator('#spaceSelectorName')).toHaveText('A');
});
