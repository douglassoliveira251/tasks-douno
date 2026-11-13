import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Celular sem Visão geral e Projetos sem aba Lista', () => {
  test('celular: Visão geral some do menu e o endereço inicial abre Tarefas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await expect(page.locator('.nav-item[data-view="dashboard"]')).toBeHidden();
    expect(await page.evaluate(() => currentView)).toBe('tasks');
    await page.screenshot({ path: 'test-results/mobile-sem-visao-geral.png' });
  });

  test('computador: Visão geral continua existindo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await expect(page.locator('.nav-item[data-view="dashboard"]')).toBeVisible();
    expect(await page.evaluate(() => currentView)).toBe('dashboard');
  });

  test('projeto no celular: só Etapas e Linha do tempo; "lista" guardada cai na Linha do tempo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(() => {
      const t = todayStr();
      state.projects = [{ id: 'p1', name: 'Projeto X', startDate: t, endDate: t, stages: [{ id: 's1', name: 'Etapa 1', start: t, end: t }] }];
      state.tasks = [];
      currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'lista'; render();
    });
    await expect(page.locator('.proj-tab')).toHaveCount(3); // Etapas, Linha do tempo e Docs
    await expect(page.locator('.proj-tab[data-tab="lista"]')).toHaveCount(0);
    await expect(page.locator('.proj-tab[data-tab="timeline"]')).toHaveClass(/on/);
    await page.screenshot({ path: 'test-results/projeto-mobile-abas.png' });
  });
});
