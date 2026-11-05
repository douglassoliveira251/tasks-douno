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

test('Desfazer devolve a recorrente original, apaga a próxima e tira a conclusão da contagem', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const today = todayStr();
    state.tasks = [{ id: 'r1', title: 'Pagar aluguel', done: false, status: 'em_andamento', priority: 'media', dueDate: today, dueTime: '09:00', followUpDate: today, categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'daily', recurrenceInterval: 1, recurrenceBaseDate: today }];
    state.completedLog = []; taskGroupMode = 'periodo'; currentView = 'tasks'; render();
  });
  await page.locator('.task-row[data-id="r1"] .task-check').click();
  await expect(page.locator('.undo-toast')).toContainText('Concluída');
  expect(await page.evaluate(() => state.tasks.length)).toBe(1);
  expect(await page.evaluate(() => state.tasks[0].id)).not.toBe('r1');

  await page.locator('.undo-toast button').click();
  const r = await page.evaluate(() => ({ ids: state.tasks.map(t => t.id), done: state.tasks[0].done, status: state.tasks[0].status, completedAt: state.tasks[0].completedAt, log: state.completedLog.length }));
  expect(r).toEqual({ ids: ['r1'], done: false, status: 'em_andamento', completedAt: null, log: 0 });
  await expect(page.locator('#pageHeaderStats')).toContainText('0 concluídas hoje');
});
