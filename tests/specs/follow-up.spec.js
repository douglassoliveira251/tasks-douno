import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  const t = (id, title, follow, due) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: due || addDaysStr(today, 5), dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, followUpDate: follow });
  state.tasks = [t('a', 'Hoje', today), t('b', 'Futura', addDaysStr(today, 3)), t('c', 'Vencida', addDaysStr(today, -2)), t('d', 'Nenhuma', null)];
  state.events = [];
  currentView = 'tasks'; render();
};

test.describe('Retomar em', () => {
  test('etiqueta na lista e estados', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    const r = await page.evaluate(() => state.tasks.map(t => [t.id, followUpState(t), followUpLabel(t)]));
    expect(r[0]).toEqual(['a', 'hoje', 'Retomar hoje']);
    expect(r[1][1]).toBe('futura');
    expect(r[2][1]).toBe('vencida');
    expect(r[3]).toEqual(['d', null, '']);
    await page.evaluate(() => { taskGroupMode = 'periodo'; render(); });
    await expect(page.locator('.task-follow-pill')).toHaveCount(3);
    await expect(page.locator('.task-follow-pill.hoje')).toHaveText('Retomar hoje');
  });

  test('agrupar por Retomada separa os grupos', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => { taskGroupMode = 'retomada'; render(); });
    const titles = await page.locator('.bucket-title').allInnerTexts();
    expect(titles).toEqual(expect.arrayContaining(['Retomada vencida', 'Retomar hoje', 'Sem data de retomada']));
    // mesma régua da visão por período: sem o antigo "Próximos 7 dias"
    expect(titles).not.toContain('Próximos 7 dias');
    expect(titles).toEqual(expect.arrayContaining([expect.stringMatching(/Nessa semana|Próxima semana|Neste mês|Mais tarde|Amanhã/)]));
    expect(await page.locator('.bucket', { hasText: 'Retomar hoje' }).locator('.task-row').count()).toBe(1);
    // na visão por retomada o grupo já diz a data: sem a etiqueta âmbar em cada linha
    await expect(page.locator('.task-follow-pill')).toHaveCount(0);
  });

  test('painel: definir, usar atalho e limpar sem mexer no prazo', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => { activeTaskId = 'd'; render(); });
    const dueBefore = await page.evaluate(() => state.tasks.find(t => t.id === 'd').dueDate);
    await page.locator('#tpFollowTrigger').click();
    await expect(page.locator('#tpFollowMenu')).toBeVisible();
    await page.locator('.tp-follow-opt[data-days="0"]').click();
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').followUpDate)).toBe(await page.evaluate(() => todayStr()));
    await page.locator('#tpFollowTrigger').click();
    await page.locator('.tp-follow-opt[data-days="7"]').click();
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').followUpDate)).toBe(await page.evaluate(() => addDaysStr(todayStr(), 7)));
    await page.locator('#tpFollowTrigger').click();
    await page.locator('.tp-follow-opt[data-days="15"]').click();
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').followUpDate)).toBe(await page.evaluate(() => addDaysStr(todayStr(), 15)));
    await page.locator('#tpFollowDate').evaluate(el => { el.value = '2031-01-05'; el.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').followUpDate)).toBe('2031-01-05');
    await page.locator('#tpFollowTrigger').click();
    await page.locator('.tp-follow-opt[data-clear]').click();
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').followUpDate)).toBeNull();
    expect(await page.evaluate(() => state.tasks.find(t => t.id === 'd').dueDate)).toBe(dueBefore);
  });

  test('sino lista retomadas de hoje e vencidas, não as futuras', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    const ids = await page.evaluate(() => computeNotifItems().followUpTasks.map(t => t.id));
    expect(ids).toEqual(['c', 'a']);
  });
});

test('agrupamento escolhido fica guardado por espaço e volta ao recarregar', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => { state.categories = [{ id: 'c1', name: 'A', color: '#2F7D5B' }, { id: 'c2', name: 'B', color: '#3B82F6' }]; state.tasks = []; activeCategoryFilter = 'c1'; render(); });
  await page.locator('#groupModeTrigger').click();
  await page.locator('.tp-status-option[data-mode="retomada"]').click();
  expect(await page.evaluate(() => taskGroupMode)).toBe('retomada');
  expect(await page.evaluate(() => state.categoryGroupModes.c1)).toBe('retomada');

  // outro espaço não herda (abre na visão principal, Retomada); "Todos" tem o seu próprio
  await page.evaluate(() => { selectSpace('c2'); });
  await page.locator('#groupModeTrigger').click();
  await page.locator('.tp-status-option[data-mode="periodo"]').click();
  await page.evaluate(() => { selectSpace('c1'); });
  expect(await page.evaluate(() => taskGroupMode)).toBe('retomada');
  await page.evaluate(() => { selectSpace('c2'); });
  expect(await page.evaluate(() => taskGroupMode)).toBe('periodo');
  await page.evaluate(() => { selectSpace(null); });
  await page.locator('#groupModeTrigger').click();
  await page.locator('.tp-status-option[data-mode="prioridade"]').click();
  expect(await page.evaluate(() => state.categoryGroupModes.__all)).toBe('prioridade');

  // simula recarregar: dados novos carregados + primeiro render
  await page.evaluate(() => { activeCategoryFilter = 'c1'; normalizeState(); taskGroupMode = 'periodo'; render(); });
  expect(await page.evaluate(() => taskGroupMode)).toBe('retomada');
  await page.evaluate(() => { activeCategoryFilter = null; normalizeState(); taskGroupMode = 'periodo'; render(); });
  expect(await page.evaluate(() => taskGroupMode)).toBe('prioridade');
});
