import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('Projetos: Ordenar escolhe pela linha (sem seletor) e fica salvo depois de atualizar a página', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(() => {
    const t = todayStr(), c = state.categories[0].id;
    state.projects = [
      { id: 'p1', name: 'Zeta', categoryId: c, startDate: t, endDate: addDaysStr(t, 5), createdAt: 1, stages: [] },
      { id: 'p2', name: 'Alfa', categoryId: c, startDate: t, endDate: addDaysStr(t, 9), createdAt: 2, stages: [] },
    ];
    state.tasks = []; activeProjectId = null; currentView = 'projects'; render();
  });
  const nomes = () => page.locator('.pl-row .pl-top > b').allTextContents();
  expect(await nomes()).toEqual(['Zeta', 'Alfa']); // entrega mais próxima primeiro
  await page.locator('.proj-filters [data-pop="sort"]').click();
  await expect(page.locator('.proj-filters input[name="projSort"]')).toHaveCount(0);
  await expect(page.locator('.proj-filters [data-sort="entrega"]')).toHaveClass(/on/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.proj-filters .sort-opt')).fontSize)).toBe('13px');
  await page.locator('.proj-filters [data-sort="nome"]').click();
  expect(await nomes()).toEqual(['Alfa', 'Zeta']);
  expect(await page.evaluate(() => state.projectSort)).toBe('nome');
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  await page.reload();
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); currentView = 'projects'; render(); });
  await expect(page.locator('.proj-filters [data-pop="sort"] b')).toHaveText('Nome');
  expect(await nomes()).toEqual(['Alfa', 'Zeta']);
});
