import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Calendário: visão padrão', () => {
  test('no celular abre sempre em Agenda, mesmo com Mês escolhido no computador, e trocar a visão não altera a escolha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.calendarViewDefault = 'month'; state.categoryCalendarViews = {}; calendarView = 'month'; currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="agenda"]')).toHaveClass(/active/);
    // troca para Semana no celular: vale agora, mas não grava como padrão do computador
    await page.locator('.cal-view-toggle button[data-cv="week"]').click();
    await expect(page.locator('.cal-view-toggle button[data-cv="week"]')).toHaveClass(/active/);
    expect(await page.evaluate(() => state.calendarViewDefault)).toBe('month');
    // sai e volta: abre em Agenda de novo
    await page.evaluate(() => { currentView = 'dashboard'; render(); currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="agenda"]')).toHaveClass(/active/);
  });

  test('no computador continua abrindo na visão escolhida', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.calendarViewDefault = 'month'; calendarView = 'month'; currentView = 'calendar'; render(); });
    await expect(page.locator('.cal-view-toggle button[data-cv="month"]')).toHaveClass(/active/);
  });

  test('celular, visão Dia: calendário do mês em cima escolhe a data; só o Hoje, sem setas. Computador não muda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { currentView = 'calendar'; render(); });
    await page.locator('.cal-view-toggle button[data-cv="day"]').click();
    await expect(page.locator('.cal-m-mini .cal-mini')).toBeVisible();
    await expect(page.locator('#calTodayBtn')).toBeVisible();
    await expect(page.locator('#calPrevBtn')).toBeHidden();
    const alvo = await page.evaluate(() => { const d = document.querySelectorAll('.cal-m-mini .cal-mini-day:not(.other)'); return d[d.length - 2].dataset.date; });
    await page.locator(`.cal-m-mini .cal-mini-day[data-date="${alvo}"]`).click();
    expect(await page.evaluate(() => calendarFocusDate)).toBe(alvo);
    await expect(page.locator(`.cal-m-mini .cal-mini-day[data-date="${alvo}"]`)).toHaveClass(/sel/);
    await page.locator('#calTodayBtn').click();
    expect(await page.evaluate(() => calendarFocusDate)).toBe(await page.evaluate(() => todayStr()));
    const rb = await page.evaluate(() => { const b = document.querySelector('#calTodayBtn').getBoundingClientRect(); return [b.height, b.width]; });
    expect(rb[0]).toBeGreaterThanOrEqual(28);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    // na Agenda/Semana/Mês do celular, continuam Hoje e setas
    await page.locator('.cal-view-toggle button[data-cv="week"]').click();
    await expect(page.locator('#calTodayBtn')).toBeVisible();
    await expect(page.locator('.cal-m-mini')).toHaveCount(0);
    // computador: Dia mantém Hoje e setas, sem o calendário extra
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { calendarView = 'day'; render(); });
    await expect(page.locator('#calTodayBtn')).toBeVisible();
    await expect(page.locator('.cal-m-mini')).toHaveCount(0);
  });
});
