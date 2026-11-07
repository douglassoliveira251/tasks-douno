import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Calendário: visão padrão', () => {
  test('no celular abre em Dia, mesmo com Mês escolhido no computador, e trocar a visão não altera a escolha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.calendarViewDefault = 'month'; state.categoryCalendarViews = {}; calendarView = 'month'; currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="day"]')).toHaveClass(/active/);
    // troca para Semana no celular: vale agora, mas não grava como padrão do computador
    await page.locator('.cal-view-toggle button[data-cv="week"]').click();
    await expect(page.locator('.cal-view-toggle button[data-cv="week"]')).toHaveClass(/active/);
    expect(await page.evaluate(() => state.calendarViewDefault)).toBe('month');
    // sai e volta: abre em Dia de novo
    await page.evaluate(() => { currentView = 'dashboard'; render(); currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="day"]')).toHaveClass(/active/);
  });

  test('no computador continua abrindo na visão escolhida', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.calendarViewDefault = 'month'; calendarView = 'month'; currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="month"]')).toHaveClass(/active/);
  });
});
