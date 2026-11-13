import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const [w, h] of [[1280, 900], [390, 844]]) {
  test(`Concluir subtarefa põe a tarefa "Não iniciado" em andamento (${w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const c = state.categories[0].id;
      const mk = (id, status) => ({ id, title: 'Tarefa ' + id, done: false, status, priority: 'media', dueDate: todayStr(), dueTime: '', categoryId: c, tagIds: [], subtasks: [{ id: id + 's1', title: 'A', done: false }, { id: id + 's2', title: 'B', done: false }], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' });
      state.tasks = [mk('a', 'nao_iniciado'), mk('b', 'concluida')];
      state.tasks[1].done = true;
      currentView = 'tasks'; activeTaskId = 'a'; render();
    });
    const st = (id) => page.evaluate((id) => state.tasks.find(t => t.id === id).status, id);
    expect(await st('a')).toBe('nao_iniciado');
    await page.locator('.tp-subtask-row .task-check').first().click();
    expect(await st('a')).toBe('em_andamento');
    await expect(page.locator('#tpStatusTrigger')).toContainText('Em andamento');
    await page.screenshot({ path: 'test-results/subtarefa-andamento-' + w + '.png' });
    // desmarcar não volta o status
    await page.locator('.tp-subtask-row.done .task-check').first().click();
    expect(await st('a')).toBe('em_andamento');
    // tarefa concluída não muda
    await page.evaluate(() => { activeTaskId = 'b'; render(); });
    await page.locator('.tp-subtask-row .task-check').first().click();
    expect(await st('b')).toBe('concluida');
  });
}
