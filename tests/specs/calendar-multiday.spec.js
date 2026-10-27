import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('agenda de vários dias aparece em todos os dias, também nas repetições', async ({ page }) => {
  await gotoApp(page, { view: 'calendar' });
  const r = await page.evaluate(() => {
    const base = { id: 'm1', title: 'Viagem', date: '2026-11-02', endDate: '2026-11-04', allDay: true, startTime: '', categoryId: state.categories[0].id, tagIds: [], recurrence: 'none', recurrenceInterval: 1 };
    const rec = { ...base, id: 'm2', recurrence: 'weekly', recurrenceInterval: 2 };
    const on = (ev, d) => eventOccursOn(ev, d);
    return {
      simples: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map(d => on(base, d)),
      repete: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-09', '2026-11-10'].map(d => on(rec, d)),
    };
  });
  expect(r.simples).toEqual([false, true, true, true, false]);
  expect(r.repete).toEqual([true, true, true, false, false, false]);
});
