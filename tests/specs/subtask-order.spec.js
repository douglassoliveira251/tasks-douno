import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = (subs) => {
  state.tasks = [{ id: 't1', title: 'Tarefa', categoryId: state.categories[0].id, done: false, status: 'nao_iniciado', dueDate: null, dueTime: null,
    startDate: todayStr(), followUpDate: todayStr(), priority: 'media', description: '', tagIds: [], recurrence: 'none',
    subtasks: subs, comments: [], attachments: [], createdAt: Date.now() }];
  render(); openTaskPanel('t1');
};

test.describe('Ordem das subtarefas', () => {
  test('desmarcar sem posição guardada não move a subtarefa', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed, [{ id: 's1', title: 'Um', done: true }, { id: 's2', title: 'Dois', done: false }, { id: 's3', title: 'Três', done: false }]);
    await page.locator('.tp-subtask-row').first().locator('.task-check').click();
    expect(await page.locator('.tp-subtask-title').allTextContents()).toEqual(['Um', 'Dois', 'Três']);
    expect(await page.evaluate(() => state.tasks[0].subtasks[0].done)).toBe(false);
  });

  test('concluir vai pro fim; desmarcar volta ao lugar, mesmo em sequência e após recarregar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed, [{ id: 'a', title: 'A', done: false }, { id: 'b', title: 'B', done: false }, { id: 'c', title: 'C', done: false }, { id: 'd', title: 'D', done: false }]);
    const titles = () => page.locator('.tp-subtask-title').allTextContents();
    const toggle = (name) => page.locator('.tp-subtask-row', { hasText: name }).locator('.task-check').click();

    await toggle('A');
    await toggle('B');
    expect(await titles()).toEqual(['C', 'D', 'A', 'B']);

    // a posição é gravada no estado (vai junto no salvamento e na sincronização)
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(state.tasks[0].subtasks)));
    expect(saved.find(s => s.id === 'a').nextIds).toEqual(['b', 'c', 'd']);

    await toggle('A');
    expect(await titles()).toEqual(['A', 'C', 'D', 'B']);
    await toggle('B');
    expect(await titles()).toEqual(['A', 'B', 'C', 'D']);
    const left = await page.evaluate(() => state.tasks[0].subtasks.some(s => 'nextIds' in s || 'prevIdx' in s));
    expect(left).toBe(false);
  });

  test('a posição guardada sobrevive a recarregar o estado', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed, [{ id: 'a', title: 'A', done: false }, { id: 'b', title: 'B', done: false }, { id: 'c', title: 'C', done: false }]);
    await page.locator('.tp-subtask-row', { hasText: 'A' }).locator('.task-check').click();
    await page.evaluate(() => { const copy = JSON.parse(JSON.stringify(state)); state = copy; normalizeState(); render(); openTaskPanel('t1'); });
    await page.locator('.tp-subtask-row', { hasText: 'A' }).locator('.task-check').click();
    expect(await page.locator('.tp-subtask-title').allTextContents()).toEqual(['A', 'B', 'C']);
  });
});
