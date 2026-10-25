import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  state.tasks = [
    { id: 't1', title: 'Enviar relatório mensal', done: false, status: 'em_andamento', priority: 'media', dueDate: today, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 },
    { id: 't2', title: 'Pagar fatura', done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 2 },
  ];
  state.notes = [{ id: 'n1', title: 'Reunião', body: '<div>Preparar o relatório da semana</div>', notebookId: null, categoryId: cat, createdAt: 1, updatedAt: Date.now(), archived: false, tagIds: [] }];
  state.events = [{ id: 'e1', title: 'Entrega do relatório', date: today, endDate: today, startTime: '15:00', endTime: '16:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
  currentView = 'tasks'; render();
};

test.describe('Pesquisa', () => {
  test('resultados com abas, contexto e termo destacado', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('relatório');

    await expect(page.locator('.sr-row')).toHaveCount(3);
    await expect(page.locator('.sr-mark').first()).toHaveText('relatório');
    await expect(page.locator('.sr-tab.on')).toContainText('Tudo');
    await expect(page.locator('.sr-tab', { hasText: 'Tarefas' })).toContainText('1');
    await expect(page.locator('.sr-row').first()).toContainText('Em andamento');

    await page.locator('.sr-tab', { hasText: 'Notas' }).click();
    await expect(page.locator('.sr-row')).toHaveCount(1);
    await expect(page.locator('.sr-ic.n')).toHaveCount(1);
  });

  test('teclado: setas e Enter abrem o item', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('relatório');
    await page.keyboard.press('ArrowDown'); // segunda linha: nota
    await page.keyboard.press('Enter');
    await expect(page.locator('#searchResultsDropdown')).toBeHidden();
    expect(await page.evaluate(() => currentView)).toBe('notes');
  });

  test('sem resultado mostra aviso', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('zzzz');
    await expect(page.locator('.search-results-empty')).toContainText('Nenhum resultado');
  });

  test('concluídas ficam ocultas e "Mostrar concluídas" as traz numa seção própria', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => { state.tasks.push({ id: 'd1', title: 'Relatório antigo', done: true, status: 'concluida', priority: 'media', dueDate: addDaysStr(todayStr(), -5), categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }); });
    await page.locator('#searchInput').fill('relatório');
    await expect(page.locator('.sr-row')).toHaveCount(3);
    await expect(page.locator('.sr-row.done')).toHaveCount(0);
    await expect(page.locator('#srToggleDone')).toContainText('Mostrar concluídas (1)');
    await page.locator('#srToggleDone').click();
    await expect(page.locator('.sr-row.done')).toHaveCount(1);
    await expect(page.locator('.sr-sec')).toHaveText('Concluídas');
    await expect(page.locator('#srToggleDone')).toContainText('Ocultar concluídas');
    await page.locator('#srToggleDone').click();
    await expect(page.locator('.sr-row.done')).toHaveCount(0);
  });
});
