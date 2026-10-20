import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Tarefas — básico', () => {
  test('criar uma tarefa pela UI persiste no state', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => { state.tasks = []; });

    await page.getByTitle('Nova tarefa').click();
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
