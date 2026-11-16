import { test, expect } from '@playwright/test';
import { gotoApp, novoItem } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id, today = todayStr();
  const t = (id, title, extra) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'alta', dueDate: today, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: Date.now() - 1000 }, extra);
  state.tasks = [t('a', 'Hoje 1'), t('b', 'Hoje 2', { dueDate: addDaysStr(today, 2), followUpDate: today }), t('c', 'Atrasada', { dueDate: addDaysStr(today, -2) }), t('d', 'Feita', { done: true, status: 'concluida', completedAt: Date.now() - 3600000 })];
  state.projects = [{ id: 'p1', name: 'Casa', categoryId: cat, stages: [{ id: 's1', name: 'E1', start: addDaysStr(today, -10), end: addDaysStr(today, -1) }], startDate: today, endDate: '', createdAt: 1 }];
  state.events = [{ id: 'e1', title: 'Reunião', date: today, endDate: today, startTime: '15:00', endTime: '16:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
  currentView = 'dashboard'; render();
};

test.describe('Resumo', () => {
  test('mostra o destaque de hoje, retomadas, projetos e agenda', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(seed);
    await expect(page.locator('.lc-chip.o')).toContainText(/1s*atrasadas/);
    await expect(page.locator('.lc-chip.d')).toContainText(/1s*vencem hoje/);
    await expect(page.locator('.lc-chip.r')).toContainText(/1s*retomar/);
    await expect(page.locator('.dv-lc-r .k', { hasText: 'Hoje' })).toContainText('1 de 4 feitas');
    await expect(page.locator('.dv-hero')).toContainText('projeto em atraso');
    await expect(page.locator('.dv-pr')).toContainText('Casa');
    await expect(page.locator('.dv-agenda')).toContainText('Reunião');
    await expect(page.locator('.dv-card', { hasText: 'Retomar hoje' })).toHaveCount(0); // o cartão saiu; as retomadas ficam sinalizadas na tabela e no chip do cartão Hoje
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

  test('modo escuro usa a paleta grafite com azul escuro', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate(() => { state.theme = 'dark'; document.documentElement.setAttribute('data-theme', 'dark'); });
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    expect(bg).toBe('#14161A');
    const pri = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
    expect(pri).toBe('#234C9C');
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
  await expect(page.locator('.dv-legend')).toContainText('Concluídas');
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
  await expect(page.locator('.lc-nd [data-nodate="due"] b')).toHaveText('3');
  await expect(page.locator('.lc-nd [data-nodate="follow"] b')).toHaveText('3');
  // clicar no indicador abre as tarefas agrupadas pelo critério correspondente
  await page.locator('.lc-nd [data-nodate="due"]').click();
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

test('tabela de tarefas junta prazo e retomada: quem é para retomar hoje aparece em Hoje, sinalizado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const t = (id, title, extra) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }, extra);
    state.tasks = [t('p', 'Com prazo hoje', { dueDate: today }), t('r', 'So retomar hoje', { followUpDate: today }), t('f', 'Retomar na semana', { followUpDate: addDaysStr(today, 3) }), t('o', 'Atrasada por prazo', { dueDate: addDaysStr(today, -1) })];
    render();
  });
  const rows = page.locator('.dv-tr');
  await expect(rows).toHaveCount(2); // Hoje: a com prazo + a para retomar
  await expect(page.locator('.dv-tr[data-task-id="r"] .dv-ret')).toBeVisible();
  await expect(page.locator('.dv-tr[data-task-id="p"] .dv-ret')).toHaveCount(0);
  await expect(page.locator('.dv-tr[data-task-id="r"]')).toContainText('↻ Hoje');
  await page.locator('.dv-seg [data-aba="proximas"]').click();
  await expect(page.locator('.dv-tr[data-task-id="f"] .dv-ret')).toBeVisible();
  await page.locator('.dv-seg [data-aba="atrasadas"]').click();
  await expect(page.locator('.dv-tr[data-task-id="o"]')).toBeVisible();
});

test('mapa de calor: pinta os dias por quantidade de prazos e eventos, navega o mês e abre o dia no calendário', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  const dia = await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const alvo = today.slice(0, 8) + '15';
    const t = (id, extra) => Object.assign({ id, title: 'T' + id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }, extra);
    state.tasks = [t('1', { dueDate: alvo }), t('2', { dueDate: alvo }), t('3', { dueDate: alvo, done: true })]; // a concluída não conta
    state.events = [{ id: 'e1', title: 'Ev', date: alvo, endDate: alvo, startTime: '09:00', endTime: '10:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1 }];
    render();
    return alvo;
  });
  const cell = page.locator(`.hm-c[data-day="${dia}"]`);
  await expect(cell).toHaveClass(/l3/); // 2 prazos + 1 evento = 3 itens
  await expect(cell).toHaveAttribute('data-tip', /3 itens · 2 prazos e 1 evento/);
  await expect(page.locator('.dv-heat .hm-legend b')).toContainText('3 itens no mês');
  const mes = await page.locator('.hm-nav > span').textContent();
  await page.locator('#hmNext').click();
  expect(await page.locator('.hm-nav > span').textContent()).not.toBe(mes);
  await expect(page.locator('.dv-heat .hm-legend b')).toContainText('0 itens no mês');
  await page.locator('#hmPrev').click();
  await page.locator(`.hm-c[data-day="${dia}"]`).click();
  expect(await page.evaluate(() => [currentView, calendarView])).toEqual(['calendar', 'day']);
  expect(await page.evaluate(() => calendarFocusDate)).toBe(dia);
});

test('Agenda ficou na última coluna de baixo e o mapa de calor no lugar dela, na linha de cima', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'dashboard' });
  const topo = await page.locator('.dv-heat').boundingBox();
  const agenda = await page.locator('.dv-agenda').boundingBox();
  expect(topo.y).toBeLessThan(agenda.y);
  const status = await page.locator('.dv-card', { hasText: 'Status das tarefas' }).boundingBox();
  expect(topo.x).toBeGreaterThan(status.x); // mapa à direita do status
  const imp = await page.locator('.dv-card', { hasText: 'Tarefas importantes' }).boundingBox();
  expect(agenda.x).toBeGreaterThan(imp.x); // agenda à direita das importantes
});


test('botão "+" é contextual: + Item na Visão geral (menu) e + Tarefa/Nota/Evento/Projeto nas outras telas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await expect(page.locator('#newBtnLabel')).toHaveText('Novo item');
  const nb = await page.locator('#newBtn').boundingBox();
  const per = await page.locator('#periodSelectorBtn').boundingBox();
  expect(nb.x).toBeGreaterThan(per.x); // à direita do Período, na mesma linha
  await expect(page.locator('.tn-right #newBtn')).toHaveCount(0); // saiu do menu do topo
  for (const [view, label] of [['tasks', 'Nova tarefa'], ['notes', 'Nova nota'], ['calendar', 'Novo evento'], ['projects', 'Novo projeto']]) {
    await page.evaluate(v => { currentView = v; render(); }, view);
    await expect(page.locator('#newBtn')).toContainText(label);
  }
  await page.evaluate(() => { currentView = 'tasks'; render(); });
  await page.locator('#newBtn').click();
  expect(await page.evaluate(() => creatingNewTask)).toBe(true);
  await expect(page.locator('.view-mode-toggle button[disabled]')).toHaveCount(1); // Kanban ainda desativado
});

test('topo do Resumo: atalhos do dia abrem o grupo na tabela; sem pendências mostra Tudo em dia', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const t = (id, title, extra) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }, extra);
    state.tasks = [t('o', 'Atrasada por prazo', { dueDate: addDaysStr(today, -1), priority: 'critica' }), t('p', 'Hoje', { dueDate: today })];
    render();
  });
  await page.locator('.lc-chip.o').click();
  await expect(page.locator('.dv-seg a.on')).toHaveText('Atrasadas');
  await expect(page.locator('.dv-tr[data-task-id="o"]')).toBeVisible();
  await page.evaluate(() => { state.tasks = []; render(); });
  await expect(page.locator('.lc-chip')).toHaveCount(0);
  await expect(page.locator('.dv-lc-r')).toContainText('Tudo em dia');
});

test('gráfico do topo (do tamanho da linha de status e compromissos): concluídas e criadas por período (Semana, Mês, Trimestre) e filtro compartilhado com o topo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr(), D = 86400000;
    const t = (id, extra) => Object.assign({ id, title: 'T' + id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: Date.now() - 2 * D }, extra);
    const l = [];
    for (let i = 0; i < 3; i++) l.push(t('d' + i, { done: true, status: 'concluida', completedAt: Date.now() - i * 60000 - 3600000, createdAt: Date.now() - 50 * D }));   // 3 hoje
    l.push(t('v', { done: true, status: 'concluida', completedAt: Date.now() - 40 * D, createdAt: Date.now() - 41 * D })); // só entra no Trimestre
    for (let i = 0; i < 5; i++) l.push(t('n' + i, { createdAt: Date.now() - 3600000 })); // 5 criadas hoje
    state.tasks = l; render();
  });
  const seg = k => page.locator('.dv-lseg [data-per="' + k + '"]');
  await expect(seg('mes')).toHaveClass(/on/);
  await expect(page.locator('#lcChart svg path').first()).toBeVisible();
  await expect(page.locator('.dv-lc-big b')).toHaveText('3');
  await expect(page.locator('.dv-lc-cap')).toContainText('contra 5 criadas');
  await expect(page.locator('.dv-lc-r .k', { hasText: 'Saldo da fila' })).toContainText('+2');
  await seg('semana').click();
  await expect(seg('semana')).toHaveClass(/on/);
  await expect(page.locator('#periodSelectorName')).toContainText('7 dias'); // o filtro do topo acompanha
  await expect(page.locator('.dv-lc-big b')).toHaveText('3');
  await seg('90').click();
  await expect(page.locator('.dv-lc-big b')).toHaveText('4');
  await expect(page.locator('#periodSelectorName')).toContainText('90 dias');
  const hero = await page.locator('.dv-hero').boundingBox(), st = await page.locator('.dv-status-card').boundingBox();
  expect(Math.abs(hero.y - st.y)).toBeLessThan(2); // na mesma linha do Status das tarefas
  expect(hero.width).toBeLessThan(900);
  // largura do gráfico acompanha o cartão ao redimensionar
  const w1 = await page.locator('#lcChart svg').evaluate(e => e.getBoundingClientRect().width);
  await page.setViewportSize({ width: 900, height: 900 });
  await expect.poll(() => page.locator('#lcChart').evaluate(e => Math.abs(e.clientWidth - e.querySelector('svg').getBoundingClientRect().width) < 2 && Math.round(e.clientWidth))).not.toBe(Math.round(w1));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900);
  await page.screenshot({ path: 'test-results/grafico-topo-t.png' });
});
