import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('subtarefa nova entra antes das concluídas', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const t = { id: 'x', title: 'Tarefa X', done: false, status: 'nao_iniciado', priority: 'media', dueDate: todayStr(), dueTime: '09:00', categoryId: state.categories[0].id, tagIds: [], comments: [], attachments: [], description: '', createdAt: 1,
      subtasks: [{ id: 's1', title: 'Pendente 1', done: false }, { id: 's2', title: 'Feita', done: true }] };
    state.tasks = [t]; currentView = 'tasks'; render();
  });
  await page.locator('.task-row[data-id="x"]').click();
  await page.locator('#tpNewSubtask').fill('Nova');
  await page.locator('#tpNewSubtask').press('Enter');
  await expect.poll(() => page.evaluate(() => state.tasks[0].subtasks.map(s => s.title))).toEqual(['Pendente 1', 'Nova', 'Feita']);
});
