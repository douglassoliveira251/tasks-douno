import { test, expect } from '@playwright/test';
import { gotoApp, novoItem } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  const t = (id, title, extra) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'alta', dueDate: today, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: Date.now() - 1000 }, extra);
  state.tasks = [t('a', 'Hoje 1'), t('b', 'Hoje 2', { followUpDate: today }), t('c', 'Atrasada', { dueDate: addDaysStr(today, -2) }), t('d', 'Feita', { done: true, status: 'concluida', completedAt: Date.now() - 3600000 })];
  state.projects = [{ id: 'p1', name: 'Casa', categoryId: cat, stages: [{ id: 's1', name: 'E1', start: addDaysStr(today, -10), end: addDaysStr(today, -1) }], startDate: today, endDate: '', createdAt: 1 }];
  state.events = [{ id: 'e1', title: 'Reunião', date: today, endDate: today, startTime: '15:00', endTime: '16:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
  currentView = 'dashboard'; render();
};

test.describe('Resumo', () => {
  test('mostra o destaque de hoje, retomadas, projetos e agenda', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await expect(page.locator('.dv-big')).toContainText('2');
    await expect(page.locator('.dv-hero')).toContainText('para retomar');
    await expect(page.locator('.dv-hero')).toContainText('1 atrasada');
    await expect(page.locator('.dv-hero')).toContainText('projeto em atraso');
    await expect(page.locator('.dv-pr')).toContainText('Casa');
    await expect(page.locator('.dv-agenda')).toContainText('Reunião');
    await expect(page.locator('.dv-card', { hasText: 'Retomar hoje' }).first()).toContainText('Hoje 2');
  });

  test('cartão do espaço abre as tarefas daquele espaço', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('.dv-sp-row').first().click();
    expect(await page.evaluate(() => currentView)).toBe('tasks');
    expect(await page.evaluate(() => activeCategoryFilter)).toBe(await page.evaluate(() => state.categories[0].id));
  });

  test('clicar num prazo abre a tarefa e no projeto abre o projeto', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await page.locator('.dv-li[data-task-id="a"]').first().click();
    expect(await page.evaluate(() => [currentView, activeTaskId])).toEqual(['tasks', 'a']);
    await page.evaluate(() => { activeTaskId = null; currentView = 'dashboard'; render(); });
    await page.locator('.dv-pr').click();
    expect(await page.evaluate(() => [currentView, activeProjectId])).toEqual(['projects', 'p1']);
  });

  test('modo escuro usa a paleta azul-petróleo', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.theme = 'dark'; document.documentElement.setAttribute('data-theme', 'dark'); });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bg).toBe('#0A141D');
  });
});

test('faixa de título: saudação com a data no Resumo e nome da página nas demais', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { state.profile.name = 'Douglas Silva'; render(); });
  await expect(page.locator('#viewTitle')).toContainText('Douglas');
  await expect(page.locator('#viewTitle')).toContainText(/Bom dia|Boa tarde|Boa noite/);
  await expect(page.locator('#viewSubtitle')).toBeVisible();
  await expect(page.locator('.page-header-card')).toHaveCount(0);
  await page.evaluate(() => { currentView = 'tasks'; render(); });
  await expect(page.locator('#viewTitle')).toHaveText('Tarefas');
  const t = await page.locator('#viewTitle').boundingBox();
  expect(t.y).toBeLessThan(110); // fica na faixa logo abaixo do menu do topo
});

test('menu no topo: abas das telas, busca em ícone e botão + com o menu Novo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  const nav = await page.locator('.nav-item[data-view="dashboard"]').boundingBox();
  expect(nav.y).toBeLessThan(60);
  await expect(page.locator('.nav-item[data-view="dashboard"]')).toHaveClass(/active/);
  const search = await page.locator('#searchWrap').boundingBox();
  expect(search.width).toBeLessThan(60); // só o ícone até focar
  await page.locator('#newBtn').click();
  await expect(page.locator('.new-menu-item')).toHaveCount(5); // tarefa, evento, nota, projeto e modelo
  await page.keyboard.press('Escape');
  await expect(page.locator('#newMenu')).toBeHidden();
});

test('Novo > Nota e Novo > Evento abrem o editor certo, de qualquer tela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await novoItem(page, 'event');
  await expect(page.locator('#eventComposerOverlay')).toHaveClass(/show/);
  await page.keyboard.press('Escape');
  await novoItem(page, 'note');
  expect(await page.evaluate(() => currentView)).toBe('notes');
});

test('atalho de teclado do menu Novo (T abre nova tarefa)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.locator('#newBtn').click();
  await page.keyboard.press('t');
  expect(await page.evaluate(() => [currentView, creatingNewTask])).toEqual(['tasks', true]);
});

test('Resumo: marcar a tarefa como concluída direto da tabela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(seed);
  await page.locator('.dv-cb[data-check="a"]').click();
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'a').done)).toBe(true);
});

test('Resumo: filtro de período muda o rótulo e as conclusões do painel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    const d = (days) => Date.now() - days * 86400000;
    state.tasks = [5, 20, 60].map((days, i) => ({ id: 'z' + i, title: 'Feita ' + i, done: true, status: 'concluida', priority: 'media', dueDate: null, categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: d(days + 1), completedAt: d(days) }));
    render();
  });
  await page.locator('#periodSelectorBtn').click();
  await page.locator('[data-period="90"]').click();
  await expect(page.locator('#periodSelectorName')).toHaveText('Últimos 90 dias');
  await expect(page.locator('.dv-legend')).toContainText('Concluídas (90d)');
  await expect(page.locator('.dv-legend div', { hasText: 'Concluídas' }).locator('b')).toHaveText('3');
  await page.locator('#periodSelectorBtn').click();
  await page.locator('[data-period="semana"]').click();
  await expect(page.locator('.dv-legend div', { hasText: 'Concluídas' }).locator('b')).toHaveText('1');
});

test('Resumo: indicadores de tarefas sem data', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const t = (id, due, follow) => ({ id, title: 'T' + id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: due, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, followUpDate: follow });
    state.tasks = [t('1', today, today), t('2', null, today), t('3', today, null), t('4', null, null), t('5', null, null)];
    render();
  });
  await expect(page.locator('.dv-stats .link[data-nodate="due"] b')).toHaveText('3');
  await expect(page.locator('.dv-stats .link[data-nodate="follow"] b')).toHaveText('3');
  // clicar no indicador abre as tarefas agrupadas pelo critério correspondente
  await page.locator('.dv-stats .link[data-nodate="due"]').click();
  expect(await page.evaluate(() => [currentView, taskGroupMode])).toEqual(['tasks', 'periodo']);
});

test('agenda da visão geral: hoje + próximos dias, 4 no cartão e "Ver mais" lista o resto', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    state.tasks = [];
    state.events = [0, 1, 2, 3, 4, 6].map((k, i) => ({ id: 'e' + i, title: 'Evento ' + i, date: addDaysStr(today, k), endDate: addDaysStr(today, k), startTime: '09:00', endTime: '10:00', categoryId: cat, tagIds: [], attendees: [], recurrence: 'none', description: '', createdAt: 1 }));
    currentView = 'dashboard'; render();
  });
  await expect(page.locator('.dv-agenda .dash-list-row')).toHaveCount(4);
  await page.locator('#dashAgendaMore').click();
  await expect(page.locator('#agendaMoreOverlay .dash-list-row')).toHaveCount(6);
});
