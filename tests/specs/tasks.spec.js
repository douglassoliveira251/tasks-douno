import { test, expect } from '@playwright/test';
import { gotoApp, novoItem } from './helpers.js';

test.describe('Tarefas — básico', () => {
  test('criar uma tarefa pela UI persiste no state', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => { state.tasks = []; });

    await novoItem(page, 'task');
    await page.locator('#tpName').fill('Tarefa de teste');
    await page.locator('#tpDesc').fill('Descrição de teste');
    await page.locator('#tpDesc').blur();

    const count = await page.evaluate(() => state.tasks.length);
    expect(count).toBe(1);
  });

  test('recorrência semanal avança sempre a partir de "A partir de", não do prazo editado', async ({ page }) => {
    // Regressão: tarefa criada dia 1 com recorrência semanal, reagendada pro
    // dia 4 e concluída ali — a próxima ocorrência tem que cair no dia 8
    // (dia 1 + 7), não no dia 11 (dia 4 + 7). Corrigido na versão 1.10.085.
    await gotoApp(page, { view: 'tasks' });

    const result = await page.evaluate(() => {
      const task = {
        id: 'task_test', shortId: '9999', title: 'Recorrente semanal',
        categoryId: state.categories[0].id, done: false, status: 'nao_iniciado',
        dueDate: '2026-10-04', dueTime: null, priority: 'media', description: '',
        tagIds: [], recurrence: 'weekly', recurrenceInterval: 1,
        recurrenceBaseDate: '2026-10-01', recurrenceEndDate: null,
        subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
      };
      const next = spawnNextRecurrence(task);
      return { nextDueDate: next ? next.dueDate : null, nextBaseDate: next ? next.recurrenceBaseDate : null };
    });

    expect(result.nextDueDate).toBe('2026-10-08');
    expect(result.nextBaseDate).toBe('2026-10-08');
  });

  test('abrir e fechar uma tarefa nova sem editar nada não cria registro vazio', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => { state.tasks = []; });

    const before = await page.evaluate(() => {
      creatingNewTask = true;
      activeTaskId = null;
      render();
      return state.tasks.length;
    });
    expect(before).toBe(0);

    const after = await page.evaluate(() => {
      closeTaskPanel();
      render();
      return state.tasks.length;
    });
    expect(after).toBe(0);
  });
});

test('tarefa nova nasce sem prazo', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => { state.tasks = []; openNewTaskPanel(); });
  await expect(page.locator('#tpDate')).toHaveValue('');
  await expect(page.locator('#tpTime')).toHaveValue('');
  await page.locator('.tp-name-input').fill('Sem data');
  await page.locator('.tp-name-input').blur();
  const t = await page.evaluate(() => state.tasks.find(x => x.title === 'Sem data'));
  expect(t.dueDate).toBeNull();
  expect(t.dueTime).toBe('');
});

test('Resumo do dia aparece na coluna da direita sem tarefa aberta e some quando uma tarefa é aberta', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const t = (id, d, done) => ({ id, title: 'T' + id, done, status: done ? 'concluida' : 'nao_iniciado', priority: 'alta', dueDate: d, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, completedAt: done ? Date.now() : null });
    state.tasks = [t('a', today, false), t('b', today, true), t('c', addDaysStr(today, -1), false)];
    render();
  });
  const ds = page.locator('.day-summary');
  await expect(ds).toBeVisible();
  await expect(ds.locator('.ds-big')).toContainText('1 de 2');
  await expect(ds.locator('.ds-kpi').nth(0)).toContainText('2'); // abertas
  await expect(ds.locator('.ds-kpi').nth(1)).toContainText('1'); // vencidas
  await ds.locator('.ds-task').first().click();
  await expect(page.locator('.task-panel')).toBeVisible();
  await expect(page.locator('.day-summary')).toHaveCount(0);
});
