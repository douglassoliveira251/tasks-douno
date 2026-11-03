import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  const t = (id, title, extra = {}) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, dueTime: '09:00', followUpDate: today, categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, ...extra });
  state.tasks = [t('a', 'Tarefa A', { dueDate: addDaysStr(today, -3) }), t('b', 'Tarefa B'), t('c', 'Tarefa C', { dueDate: addDaysStr(today, 5) })];
  taskGroupMode = 'periodo'; currentView = 'tasks'; activeTaskId = null; render();
};
const groupTitles = (page) => page.locator('.bucket-title').allTextContents();

test.describe('Fixar tarefas', () => {
  test('fixar na lista leva a tarefa ao grupo "Fixadas", no topo; soltar devolve ao grupo de origem', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    expect((await groupTitles(page))[0]).toBe('Vencida');
    const rowA = page.locator('.task-row[data-id="a"]');
    await rowA.hover();
    await rowA.locator('.task-pin-btn').click();
    expect(await groupTitles(page)).toEqual(['Fixadas', 'Vence hoje', 'Nessa semana']);
    await expect(page.locator('.bucket.pinned-bucket .task-row[data-id="a"]')).toHaveCount(1);
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'a').pinned)).toBe(true);
    // segue em cima em outro agrupamento
    await page.evaluate(() => { taskGroupMode = 'retomada'; render(); });
    expect((await groupTitles(page))[0]).toBe('Fixadas');
    // solta
    await page.locator('.bucket.pinned-bucket .task-pin-btn').click();
    await page.evaluate(() => { taskGroupMode = 'periodo'; render(); });
    expect((await groupTitles(page))[0]).toBe('Vencida');
    await expect(page.locator('.bucket.pinned-bucket')).toHaveCount(0);
  });

  test('painel: botão Fixar/Fixada alterna e reflete na lista', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('.task-row[data-id="b"]').click();
    const btn = page.locator('#tpPinBtn');
    await expect(btn).toContainText('Fixar');
    await btn.click();
    await expect(page.locator('#tpPinBtn')).toContainText('Fixada');
    await expect(page.locator('.bucket.pinned-bucket .task-row[data-id="b"]')).toHaveCount(1);
    await page.locator('#tpPinBtn').click();
    await expect(page.locator('#tpPinBtn')).toContainText('Fixar');
    await expect(page.locator('.bucket.pinned-bucket')).toHaveCount(0);
  });

  test('concluir tarefa fixada solta o alfinete', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => { state.tasks.find(t => t.id === 'b').pinned = true; render(); });
    await page.locator('.bucket.pinned-bucket .task-row[data-id="b"] .task-check').click();
    expect(await page.evaluate(() => { const t = state.tasks.find(x => x.id === 'b'); return [t.done, t.pinned]; })).toEqual([true, false]);
    await expect(page.locator('.bucket.pinned-bucket')).toHaveCount(0);
  });
});
