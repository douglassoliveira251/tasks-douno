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
  test('resultados por seção (Tarefas, Agenda, Notas) com informação de cada tipo e termo destacado', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('relatório');

    await expect(page.locator('.sr-row')).toHaveCount(3);
    await expect(page.locator('.sr-mark').first()).toHaveText('relatório');
    await expect(page.locator('.sr-head')).toContainText('3 resultados');
    await expect(page.locator('.sr-sec')).toHaveText(['Tarefas · 1', 'Agenda · 1', 'Notas · 1']);
    // tarefa: status, subtarefas/prazo; agenda: horário com duração; nota: trecho e caderno
    await expect(page.locator('.sr-row[data-kind="tasks"]')).toContainText('Em andamento');
    await expect(page.locator('.sr-row[data-kind="tasks"] .sr-when')).toContainText('Hoje');
    await expect(page.locator('.sr-row[data-kind="calendar"] .sr-meta')).toContainText('15:00 – 16:00 (1h)');
    await expect(page.locator('.sr-row[data-kind="notes"] .sr-snip')).toContainText('Preparar o relatório da semana');
    await expect(page.locator('.sr-row[data-kind="notes"] .sr-meta')).toContainText('Sem caderno');
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
    await page.keyboard.press('ArrowDown'); // segunda linha: agenda
    await page.keyboard.press('ArrowDown'); // terceira linha: nota
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
    await expect(page.locator('.sr-sec', { hasText: 'Concluídas' })).toContainText('Concluídas · 1');
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
    await expect(page.locator('.sr-head')).toContainText('3 resultados');
    await expect(page.locator('#srTogglePast')).toContainText('Agendas passadas');
    await expect(page.locator('#srTogglePast i')).toHaveText('2');
    await page.locator('#srTogglePast').click();
    await expect(page.locator('.sr-row')).toHaveCount(5);
    await expect(page.locator('.sr-sec', { hasText: 'Agendas passadas' })).toContainText('Agendas passadas · 2');
    await expect(page.locator('.sr-row.past').first()).toContainText('Reunião velha'); // mais recente primeiro
    await expect(page.locator('#srToggleDone')).toHaveCount(0);
    await page.locator('#srTogglePast').click();
    await expect(page.locator('.sr-row')).toHaveCount(3);
  });
  test('a pesquisa não filtra a lista de Tarefas; clicar no resultado abre o detalhe e limpa a busca', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('#searchInput').fill('relatório');
    await expect(page.locator('#tasksView .task-row')).toHaveCount(2); // as duas tarefas seguem na lista
    await expect(page.locator('.sr-row[data-kind="tasks"]')).toHaveCount(1); // o resultado só aparece na pesquisa
    await page.locator('.sr-row[data-kind="tasks"]').first().click();
    await expect(page.locator('#searchInput')).toHaveValue('');
    await expect(page.locator('#tasksView .task-row')).toHaveCount(2);
    await expect(page.locator('#tasksView .task-row.selected')).toContainText('Enviar relatório mensal');
    await expect(page.locator('.task-panel')).toBeVisible();
  });
});

test('Pesquisa: título muito longo não estica a lista; recorta em volta do termo com … e destaca', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const longo = 'Revisar e consolidar todos os documentos do projeto de reforma da casa de praia incluindo contratos, plantas, orçamentos, cronograma físico-financeiro e as autorizações da prefeitura antes da reunião final com a diretoria';
    const t = (id, title) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: today, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 });
    state.tasks = [t('c1', 'Reunião sobre o orçamento da obra'), t('c2', longo), t('c3', 'A'.repeat(200) + ' orçamento final')];
    currentView = 'tasks'; render();
  });
  await page.locator('#searchInput').fill('orçamento');
  await expect(page.locator('.sr-row')).toHaveCount(3);
  const box = await page.locator('#searchResultsDropdown').boundingBox();
  expect(box.width).toBeLessThanOrEqual(620);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);
  // título curto fica inteiro; longo vira trecho com … e o termo destacado
  await expect(page.locator('.sr-row[data-id="c1"] .sr-title')).toHaveText('Reunião sobre o orçamento da obra');
  const longo = page.locator('.sr-row[data-id="c2"] .sr-title');
  await expect(longo).toContainText('…');
  await expect(longo.locator('.sr-mark')).toHaveText('orçamento');
  expect((await longo.innerText()).length).toBeLessThanOrEqual(64);
  await expect(longo).toHaveAttribute('title', /Revisar e consolidar todos os documentos/); // título inteiro no tooltip
  await expect(page.locator('.sr-row[data-id="c3"] .sr-title .sr-mark')).toHaveText('orçamento');
  await page.screenshot({ path: 'test-results/busca-titulo-longo-d.png' });
  // celular: também cabe
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#searchInput').fill('orçamentos');
  await page.locator('#searchInput').fill('orçamento');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('.sr-row[data-id="c1"] .sr-title .sr-mark')).toBeVisible();
  const cel = await page.evaluate(() => { const m = document.querySelector('.sr-row[data-id="c1"] .sr-title .sr-mark').getBoundingClientRect(), t = document.querySelector('.sr-row[data-id="c1"] .sr-title').getBoundingClientRect(); return m.right <= t.right + 1; });
  expect(cel).toBe(true); // o trecho destacado aparece inteiro, não fica escondido pelas reticências
  await page.screenshot({ path: 'test-results/busca-titulo-longo-m.png' });
});
