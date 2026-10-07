import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('tarefas do mesmo grupo ficam em ordem de horário (sem hora por último)', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    const today = todayStr();
    const t = (id, title, time, created) => ({
      id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, dueTime: time,
      categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: created,
    });
    state.tasks = [
      t('a', 'Tarde', '18:00', 1),
      t('b', 'Sem hora', '', 2),
      t('c', 'Cedo', '07:30', 3),
      t('d', 'Meio-dia', '12:00', 4),
    ];
    currentView = 'tasks';
    render();
  });
  const titles = await page.locator('.task-row .task-title').allInnerTexts();
  expect(titles).toEqual(['Cedo', 'Meio-dia', 'Tarde', 'Sem hora']);
});
