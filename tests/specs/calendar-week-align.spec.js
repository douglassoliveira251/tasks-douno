import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

// com barra de rolagem de verdade (o Playwright a esconde por padrão)
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test('semana: cabeçalho, dia todo e grade de horas ficam com as colunas alinhadas', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 800 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => {
    state.events.push({ id: 'e1', title: 'Aniversário', date: '2026-11-04', endDate: '2026-11-04', startTime: '', endTime: '', allDay: true, categoryId: state.categories[0].id, recurrence: 'none', recurrenceInterval: 1, recurrenceBaseDate: '2026-11-04', tagIds: [], attendees: [] });
    calendarView = 'week'; calendarFocusDate = '2026-11-04'; render();
  });
  const pos = await page.evaluate(() => {
    const L = els => [...els].map(el => Math.round(el.getBoundingClientRect().left));
    return {
      head: L(document.querySelectorAll('.cal-week-headrow > *')),
      allday: L(document.querySelectorAll('.cal-week-alldayrow > .cal-week-allday-cell')),
      cols: L([...document.querySelectorAll('.cal-week-hourgrid > *')].slice(0, 8)),
    };
  });
  expect(pos.head).toEqual(pos.cols);
  expect(pos.allday).toEqual(pos.cols.slice(1));
});
