import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const sel of [false, true]) {
  test(`rolar sobre a coluna direita (${sel ? 'painel da tarefa' : 'Resumo do dia'}) não rola a lista`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate((sel) => {
      const c = state.categories[0].id, hoje = todayStr();
      state.tasks = Array.from({ length: 30 }, (_, i) => ({ id: 't' + i, shortId: String(i + 1).padStart(4, '0'), title: 'Tarefa ' + i, done: false, status: 'em_andamento', priority: 'media', dueDate: addDaysStr(hoje, i % 5), dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 + i, recurrence: 'none' }));
      activeTaskId = sel ? 't1' : null; creatingNewTask = false; render();
    }, sel);
    await page.mouse.move(1620, 500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.getElementById('tasksView').scrollTop)).toBe(0);
    await page.mouse.move(600, 500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.querySelector('.tasks-list-col').scrollTop)).toBeGreaterThan(0); // a lista rola dentro do próprio quadro
    expect(await page.evaluate(() => document.getElementById('tasksView').scrollTop)).toBe(0); // e a tela não
  });
}
