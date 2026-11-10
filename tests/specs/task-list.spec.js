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
  test('linha: "Sem data", comentários antes da recorrência, subtarefas em % e tags com contraste', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.tags = [{ id: 'g1', name: 'Escura', color: '#2F5F9E', categoryId: '' }, { id: 'g2', name: 'Clara', color: '#F2C94C', categoryId: '' }];
      state.tasks = [
        { id: 'a', title: 'Sem prazo', done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', categoryId: cat, tagIds: ['g1', 'g2'], recurrence: 'weekly', recurrenceInterval: 1,
          subtasks: [{ id: 's1', title: 'a', done: true }, { id: 's2', title: 'b', done: false }, { id: 's3', title: 'c', done: false }, { id: 's4', title: 'd', done: false }],
          comments: [{ id: 'c1', text: 'x', createdAt: 1 }, { id: 'c2', text: 'y', createdAt: 1 }], attachments: [], description: '', createdAt: 1 },
        { id: 'b', title: 'Tag clara', done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', categoryId: cat, tagIds: ['g2'], subtasks: [], comments: [], attachments: [], description: '', createdAt: 2 },
      ];
      render();
    });
    const row = page.locator('.task-row[data-id="a"]');
    await expect(row.locator('.task-cal-badge.nodate')).toContainText('Sem data');
    await expect(row.locator('.task-subtask-badge')).toHaveText('25%');
    const kids = await row.locator('.task-meta').evaluate(el => [...el.children].map(c => c.className.split(' ')[0]));
    expect(kids.indexOf('task-comment-badge')).toBeGreaterThan(-1);
    expect(kids.indexOf('task-comment-badge')).toBeLessThan(kids.indexOf('task-recurrence-icon'));
    await expect(row.locator('.task-row-right .task-comment-badge')).toHaveCount(0);
    await expect(row.locator('.task-tag-pill')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(row.locator('.task-tag-pill')).toHaveCSS('background-color', 'rgb(47, 95, 158)');
    await expect(page.locator('.task-row[data-id="b"] .task-tag-pill')).toHaveCSS('color', 'rgb(30, 41, 59)');
    await row.locator('.task-title').click();
    await expect(page.locator('.tp-tag-chip.active').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.locator('.tp-tag-chip.active').nth(1)).toHaveCSS('color', 'rgb(30, 41, 59)');
  });
  test('nome do projeto usa o espaço livre da linha e encurta só quando falta lugar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.projects = [{ id: 'p1', name: 'Programa de redução de custos 2026', categoryId: cat, createdAt: 1, stages: [{ id: 's1', name: 'Levantamento inicial' }] }];
      const mk = (id, extra) => ({ id, title: 'Tarefa ' + id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, projectId: 'p1', stageId: 's1', ...extra });
      state.tasks = [mk('a'), mk('b', { tagIds: ['g1'], subtasks: [{ id: 's', title: 'x', done: false }], recurrence: 'weekly', recurrenceInterval: 1, comments: [{ id: 'c', text: 'x', createdAt: 1 }] })];
      state.tags = [{ id: 'g1', name: 'FinOps', color: '#2F5F9E', categoryId: '' }];
      render();
    });
    const wide = await page.locator('.task-row[data-id="a"] .task-proj-pill').boundingBox();
    expect(wide.width).toBeGreaterThan(300); // passou do limite antigo de 230px
    const full = await page.locator('.task-row[data-id="a"] .task-proj-pill').evaluate(el => el.scrollWidth <= el.clientWidth);
    expect(full).toBe(true); // nome inteiro, sem corte
    await page.setViewportSize({ width: 1100, height: 900 });
    const narrow = await page.locator('.task-row[data-id="b"] .task-proj-pill').boundingBox();
    const cut = await page.locator('.task-row[data-id="b"] .task-proj-pill').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(cut).toBe(true); // com a linha cheia e a tela menor, encurta
    expect(narrow.width).toBeGreaterThanOrEqual(48);
  });
});
