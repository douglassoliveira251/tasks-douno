import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('feriados nacionais: datas calculadas, mês/semana/dia e liga-desliga', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'calendar' });
  // Páscoa 2026 = 5/abr: Sexta Santa 3/abr, Carnaval 16-17/fev, Corpus Christi 4/jun
  const nomes = await page.evaluate(() => ['2026-04-03', '2026-02-16', '2026-06-04', '2026-04-21', '2026-11-20', '2023-11-20', '2026-04-22'].map(d => (holidayOn(d) || {}).name || null));
  expect(nomes).toEqual(['Sexta-feira Santa', 'Carnaval', 'Corpus Christi', 'Tiradentes', 'Consciência Negra', null, null]);
  // mês
  await page.evaluate(() => { calendarView = 'month'; calendarFocusDate = '2026-04-10'; render(); });
  await expect(page.locator('.cal-month-cell[data-date="2026-04-21"] .cal-hol')).toHaveText('Tiradentes');
  await expect(page.locator('.cal-month-cell[data-date="2026-04-22"] .cal-hol')).toHaveCount(0);
  // semana
  await page.evaluate(() => { calendarView = 'week'; calendarFocusDate = '2026-04-21'; render(); });
  await expect(page.locator('.cal-allday-hol')).toHaveText('Tiradentes');
  await expect(page.locator('.cal-week-daycol.holiday')).toHaveCount(1);
  await expect(page.locator('.cal-week-daycol.weekend')).toHaveCount(2);
  // dia
  await page.evaluate(() => { calendarView = 'day'; calendarFocusDate = '2026-04-21'; render(); });
  await expect(page.locator('.cal-hol-chip')).toContainText('Tiradentes');
  // facultativos podem ser desligados pelo menu Camadas sem esconder os demais
  await page.evaluate(() => { calendarView = 'month'; calendarFocusDate = '2026-02-10'; render(); });
  await expect(page.locator('.cal-month-cell[data-date="2026-02-16"] .cal-hol')).toHaveText('Carnaval');
  await page.locator('#calLayersBtn').click();
  await page.locator('#layOpt').evaluate(el => el.click());
  await expect(page.locator('.cal-month-cell[data-date="2026-02-16"] .cal-hol')).toHaveCount(0);
  await page.evaluate(() => { calendarFocusDate = '2026-04-10'; render(); });
  await expect(page.locator('.cal-month-cell[data-date="2026-04-21"] .cal-hol')).toHaveText('Tiradentes');
  await page.evaluate(() => { state.showOptionalHolidays = true; });
  // desligar nas configurações some tudo
  await page.evaluate(() => { state.showHolidays = false; calendarView = 'month'; render(); });
  await expect(page.locator('.cal-hol')).toHaveCount(0);
});
