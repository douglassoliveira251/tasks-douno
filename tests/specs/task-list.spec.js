import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  const today = todayStr();
  state.tasks = [{
    id: 't1', shortId: '0042', title: 'Enviar relatório mensal de resultados para a diretoria', done: false,
    status: 'em_andamento', priority: 'alta', dueDate: today, dueTime: '09:00', categoryId: cat,
    tagIds: [], subtasks: [], comments: [{ id: 'c1', text: 'ok', createdAt: Date.now() }], attachments: [],
    description: '', recurrence: 'weekly', recurrenceInterval: 1,
  }];
  currentView = 'tasks';
  render();
};

test.describe('Lista de tarefas', () => {
  test('não mostra o número da tarefa na lista nem no painel', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);

    const row = page.locator('.task-row').first();
    await expect(row).toBeVisible();
    await expect(row).not.toContainText('0042');

    await row.locator('.task-title').click();
    await expect(page.locator('.tp-created-at')).toBeVisible();
    await expect(page.locator('.tp-created-at')).not.toContainText('0042');
  });

  test('celular: nome com mais espaço e sem ícones/alertas na linha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);

    const row = page.locator('.task-row').first();
    await expect(row.locator('.task-recurrence-icon')).toBeHidden();
    await expect(row.locator('.task-comment-badge')).toBeHidden();
    await expect(row.locator('.task-status-pill')).toBeHidden();

    const titleBox = await row.locator('.task-title').boundingBox();
    expect(titleBox.width).toBeGreaterThan(220);
  });

  test('desktop: mantém os ícones e alertas da linha', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);

    const row = page.locator('.task-row').first();
    await expect(row.locator('.task-recurrence-icon')).toBeVisible();
    await expect(row.locator('.task-status-pill')).toBeVisible();
  });
});
