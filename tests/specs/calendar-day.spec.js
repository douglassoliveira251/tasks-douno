import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const today = todayStr();
  state.categories[0].name = 'Desenvolvimento de produtos e serviços';
  state.tags = [{ id: 'tg1', name: 'Reunião de planejamento estratégico', color: '#4A6FA5' }];
  state.tasks = [];
  state.events = [{
    id: 'e1', title: 'https://meet.google.com/abc-defg-hij-klmnopqrstuvwxyz-reuniao-semanal',
    date: today, endDate: today, startTime: '09:00', endTime: '10:30', allDay: false,
    categoryId: state.categories[0].id, tagIds: ['tg1'], recurrence: 'none', recurrenceInterval: 1,
    recurrenceBaseDate: today, linkedTaskId: null, description: '', createdAt: Date.now(),
  }];
  currentView = 'calendar';
  calendarView = 'day';
  calendarFocusDate = today;
  render();
};

for (const [name, width] of [['celular', 390], ['desktop', 1280]]) {
  test(`modo Dia (${name}): nada passa da borda do quadro`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(seed);

    const row = page.locator('.cal-day-row').first();
    await expect(row).toBeVisible();
    const rowBox = await row.boundingBox();
    for (const sel of ['.cal-day-time', '.cal-day-title', '.cal-event-tag', '.cal-day-cat']) {
      const box = await row.locator(sel).boundingBox();
      expect(box.x + box.width, sel).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
    }
  });
}
