import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('Retornar antes: chips na janela Repetir e a próxima repetição volta antes do prazo', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  const r = await page.evaluate(() => {
    const due = addDaysStr(todayStr(), 100);
    const t = { id: 'rt', shortId: '9001', title: 'Renovar seguro', categoryId: state.categories[0].id, done: false, status: 'nao_iniciado', dueDate: due, dueTime: '', priority: 'media', description: '', tagIds: [], recurrence: 'yearly', recurrenceInterval: 1, recurrenceBaseDate: due, recurrenceEndDate: null, remindBefore: 0, subtasks: [], comments: [], attachments: [], createdAt: Date.now() };
    state.tasks.push(t);
    const b = document.createElement('button'); b.id = 'fakeAnchor'; document.body.appendChild(b);
    openRecurrencePortal(b, t, () => {});
    return due;
  });
  await expect(page.locator('.rec-remind')).toBeVisible();
  await expect(page.locator('.rec-occ')).toHaveCount(0);
  await page.locator('.rec-chip[data-rb="15"]').click();
  await expect(page.locator('.rec-chip.on')).toHaveText('15 dias');
  const next = await page.evaluate(() => { const n = spawnNextRecurrence(state.tasks.find(x => x.id === 'rt')); return { due: n.dueDate, follow: n.followUpDate, rb: n.remindBefore, exp: addDaysStr(n.dueDate, -15) }; });
  expect(next.rb).toBe(15);
  expect(next.follow).toBe(next.exp);
  expect(next.follow < next.due).toBe(true);
  // "Outro…" abre o campo de dias
  await page.locator('.rec-chip[data-rb="custom"]').click();
  await expect(page.locator('#recPopRemindDays')).toBeVisible();
});
