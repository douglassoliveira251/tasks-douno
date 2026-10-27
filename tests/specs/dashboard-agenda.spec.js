import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('cartão Agenda: 5 itens e agenda de vários dias numa linha só com início e fim', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const t = todayStr(); const c = state.categories[0].id;
    const mk = (id, title, d, e, all, st, en) => ({ id, title, date: d, endDate: e, allDay: all, startTime: st || '', endTime: en || '', categoryId: c, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1 });
    state.tasks = [];
    state.events = [
      mk('e1', 'Viagem de trabalho', addDaysStr(t, 1), addDaysStr(t, 3), true),
      mk('e2', 'Reunião A', t, t, false, '09:00', '10:00'),
      mk('e3', 'Reunião B', t, t, false, '11:00', '12:00'),
      mk('e4', 'Reunião C', addDaysStr(t, 2), addDaysStr(t, 2), false, '09:00', '10:00'),
      mk('e5', 'Reunião D', addDaysStr(t, 4), addDaysStr(t, 4), false, '09:00', '10:00'),
      mk('e6', 'Reunião E', addDaysStr(t, 5), addDaysStr(t, 5), false, '09:00', '10:00'),
      mk('e7', 'Reunião F', addDaysStr(t, 6), addDaysStr(t, 6), false, '09:00', '10:00'),
    ];
    render();
  });
  const rows = page.locator('.rs-agenda .dash-list-row');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('.rs-agenda .dash-list-row', { hasText: 'Viagem de trabalho' })).toHaveCount(1);
  await expect(page.locator('.rs-agenda .dash-list-row', { hasText: 'Viagem de trabalho' })).toContainText('até');
  await expect(page.locator('#dashAgendaMore')).toContainText('Ver mais (2)');
  await page.locator('.rs-agenda').screenshot({ path: 'C:/Users/dougl/AppData/Local/Temp/claude/C--Users-dougl-OneDrive-Projetos-Taskin/46ecb1d9-892f-47df-80c6-aa1f793830c6/scratchpad/dag.png' });
});
