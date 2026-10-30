import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('prazo traz 08:00 e subtarefa concluída vai pro fim e volta', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    state.tasks = [{ id: 't1', title: 'Tarefa', categoryId: state.categories[0].id, done: false, status: 'nao_iniciado', dueDate: null, dueTime: null,
      startDate: todayStr(), followUpDate: todayStr(), priority: 'media', description: '', tagIds: [], recurrence: 'none',
      subtasks: [{ id: 's1', title: 'Um', done: false }, { id: 's2', title: 'Dois', done: false }, { id: 's3', title: 'Três', done: false }],
      comments: [], attachments: [], createdAt: Date.now() }];
    render(); openTaskPanel('t1');
  });
  await page.locator('#tpDate').fill('2026-11-04');
  await expect(page.locator('#tpTime')).toHaveValue('08:00');

  const titles = () => page.locator('.tp-subtask-title').allTextContents();
  await page.locator('.tp-subtask-row').first().locator('.task-check').click();
  expect(await titles()).toEqual(['Dois', 'Três', 'Um']);
  await page.locator('.tp-subtask-row').last().locator('.task-check').click();
  expect(await titles()).toEqual(['Um', 'Dois', 'Três']);
});
