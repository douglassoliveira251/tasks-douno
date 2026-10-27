import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const today = todayStr();
  const mk = (id, title, date, s, e) => ({ id, title, date, endDate: date, startTime: s, endTime: e, allDay: false,
    categoryId: state.categories[0].id, tagIds: [], recurrence: 'none', recurrenceInterval: 1,
    recurrenceBaseDate: date, linkedTaskId: null, description: '', createdAt: Date.now() });
  state.tasks = [];
  state.events = [
    mk('a1', 'Workshop', today, '09:00', '12:00'),
    mk('a2', 'Reunião', today, '10:00', '11:00'),
    mk('a3', 'Depois', today, '13:00', '14:00'),
  ];
  currentView = 'calendar'; calendarView = 'week'; calendarFocusDate = today;
  render();
};

test('semana: agendas no mesmo horário ficam lado a lado, sem sobrepor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(seed);
  const a = await page.locator('[data-event-id="a1"].cal-event-block-timed').boundingBox();
  const b = await page.locator('[data-event-id="a2"].cal-event-block-timed').boundingBox();
  const c = await page.locator('[data-event-id="a3"].cal-event-block-timed').boundingBox();
  expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
  expect(c.width).toBeGreaterThan(a.width * 1.8);
});
