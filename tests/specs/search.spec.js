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

  test('acento não importa: "relatorio" acha "relatório" e vice-versa, e destaca o trecho', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('RELATORIO');
    await expect(page.locator('.sr-row')).toHaveCount(3);
    await expect(page.locator('.sr-mark').first()).toHaveText('relatório');
    await page.locator('#searchInput').fill('reuniao');
    await expect(page.locator('.sr-row')).toHaveCount(1);
    await page.locator('#searchInput').fill('reunião');
    await expect(page.locator('.sr-row')).toHaveCount(1);
    // busca da tela de tarefas
    await page.locator('#searchInput').fill('');
    expect(await page.evaluate(() => [fold('Ação'), fold('ÇÃO'), fold('naïve').length])).toEqual(['acao', 'cao', 5]);
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
    await expect(page.locator('#srToggleDone')).toContainText('Concluídas');
    await expect(page.locator('#srToggleDone')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#srToggleDone').click();
    await expect(page.locator('.sr-row.done')).toHaveCount(1);
    await expect(page.locator('.sr-sec')).toHaveText('Concluídas');
    await expect(page.locator('#srToggleDone')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#srToggleDone').click();
    await expect(page.locator('.sr-row.done')).toHaveCount(0);
  });
  test('agendas passadas ficam ocultas; chip "Agendas passadas" as mostra no fim, e a de hoje continua visível', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const t = todayStr(), cat = state.categories[0].id;
      const ev = (id, title, d, extra = {}) => ({ id, title, date: d, endDate: d, startTime: '10:00', endTime: '', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, description: '', createdAt: 1, ...extra });
      state.tasks = []; state.notes = [];
      state.events = [ev('f1', 'Reunião futura', addDaysStr(t, 3)), ev('f2', 'Reunião de hoje', t), ev('p1', 'Reunião velha', addDaysStr(t, -10)), ev('p2', 'Reunião mais velha', addDaysStr(t, -40)),
        ev('r1', 'Reunião semanal', addDaysStr(t, -90), { recurrence: 'weekly' })];
      currentView = 'tasks'; render();
    });
    await page.locator('#searchInput').fill('reunião');
    await expect(page.locator('.sr-row')).toHaveCount(3); // futura, hoje e a recorrente
    await expect(page.locator('.sr-tab.on')).toContainText('3');
    await expect(page.locator('#srTogglePast')).toContainText('Agendas passadas');
    await expect(page.locator('#srTogglePast i')).toHaveText('2');
    await page.locator('#srTogglePast').click();
    await expect(page.locator('.sr-row')).toHaveCount(5);
    await expect(page.locator('.sr-sec')).toHaveText('Agendas passadas');
    await expect(page.locator('.sr-row.past').first()).toContainText('Reunião velha'); // mais recente primeiro
    await expect(page.locator('#srToggleDone')).toHaveCount(0);
    await page.locator('#srTogglePast').click();
    await expect(page.locator('.sr-row')).toHaveCount(3);
  });
});
