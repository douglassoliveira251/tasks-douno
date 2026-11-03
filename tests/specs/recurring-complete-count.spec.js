import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('concluir tarefa recorrente conta como concluída, sem criar cópia em Concluídas', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const today = todayStr();
    state.tasks = [{ id: 'r1', title: 'Pagar aluguel', done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, dueTime: '09:00', followUpDate: today, categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'daily', recurrenceInterval: 1, recurrenceBaseDate: today }];
    state.completedLog = []; taskGroupMode = 'periodo'; currentView = 'tasks'; render();
  });
  await page.locator('.task-row[data-id="r1"] .task-check').click();
  const r = await page.evaluate(() => ({
    done: state.tasks.filter(t => t.done).length, open: state.tasks.filter(t => !t.done).length,
    log: state.completedLog.map(e => e.title),
  }));
  expect(r).toEqual({ done: 0, open: 1, log: ['Pagar aluguel'] });
  await expect(page.locator('.bucket-title', { hasText: 'Concluídas' })).toHaveCount(0);
  await expect(page.locator('#pageHeaderStats')).toContainText('1');
  await expect(page.locator('#pageHeaderStats')).toContainText('concluída hoje');
});
