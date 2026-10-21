import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  const today = todayStr();
  const t = (id, title, done, extra = {}) => ({
    id, title, done, status: done ? 'concluida' : 'nao_iniciado', priority: 'media', dueDate: addDaysStr(today, 3), dueTime: '09:00',
    categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, ...extra,
  });
  state.projects = [{
    id: 'p1', name: 'Construção da casa', categoryId: cat, description: '', startDate: addDaysStr(today, -30), endDate: addDaysStr(today, 90), createdAt: 1,
    stages: [
      { id: 's1', name: 'Fundação', start: addDaysStr(today, -30), end: addDaysStr(today, -5) },
      { id: 's2', name: 'Estrutura', start: addDaysStr(today, -10), end: addDaysStr(today, 20) },
      { id: 's3', name: 'Acabamento', start: addDaysStr(today, 25), end: addDaysStr(today, 80) },
    ],
  }];
  state.tasks = [
    t('a', 'Concretar sapatas', true, { projectId: 'p1', stageId: 's1' }),
    t('b', 'Erguer pilares', true, { projectId: 'p1', stageId: 's2' }),
    t('c', 'Concretar laje', false, { projectId: 'p1', stageId: 's2' }),
    t('d', 'Pagar fatura', false),
  ];
  state.events = [];
};

test.describe('Projetos', () => {
  test('cálculo de progresso e status das etapas', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    const r = await page.evaluate((src) => {
      eval('(' + src + ')')();
      const p = projectById('p1');
      return {
        s1: [stagePercent(p, p.stages[0]), stageState(p, p.stages[0])],
        s2: [stagePercent(p, p.stages[1]), stageState(p, p.stages[1])],
        s3: [stagePercent(p, p.stages[2]), stageState(p, p.stages[2])],
        proj: projectStatus(p).pct,
      };
    }, seed.toString());
    expect(r.s1).toEqual([100, 'concluida']);
    expect(r.s2).toEqual([50, 'andamento']);
    expect(r.s3).toEqual([0, 'nao_iniciada']);
    expect(r.proj).toBe(50);
  });

  test('etapa com prazo vencido e sem conclusão fica atrasada', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    const r = await page.evaluate((src) => {
      eval('(' + src + ')')();
      const p = projectById('p1');
      p.stages[1].end = addDaysStr(todayStr(), -2);
      return { state: stageState(p, p.stages[1]), late: projectStatus(p).late };
    }, seed.toString());
    expect(r.state).toBe('atrasada');
    expect(r.late).toBe(true);
  });

  test('página de projetos: lista, detalhe e linha do tempo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'dashboard' });
    await page.evaluate((src) => { eval('(' + src + ')')(); }, seed.toString());
    await page.locator('.nav-item[data-view="projects"]').click();

    await expect(page.locator('#viewTitle')).toHaveText('Projetos');
    await expect(page.locator('.plist-row')).toHaveCount(1);
    await expect(page.locator('.plist-row')).toContainText('Construção da casa');
    await expect(page.locator('.plist-row')).toContainText('50%');

    await page.locator('.plist-row').click();
    await expect(page.locator('.gantt-row')).toHaveCount(3);
    await expect(page.locator('.gantt-bar.concluida')).toHaveCount(1);
    await expect(page.locator('.gantt-today')).toBeVisible();

    await page.locator('.proj-tab[data-tab="lista"]').click();
    await expect(page.locator('.tpl-card')).toHaveCount(3);
  });

  test('criar projeto e etapa pelos formulários', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(() => { state.projects = []; state.tasks = []; render(); });
    await page.locator('#prjNewBtn').click();
    await page.locator('#prjName').fill('Lançamento do site');
    await page.locator('#prjSave').click();
    await expect(page.locator('#prjAddStage')).toBeVisible();

    await page.locator('#prjAddStage').click();
    await page.locator('#stgName').fill('Design');
    await page.locator('#stgSave').click();
    const p = await page.evaluate(() => state.projects[0]);
    expect(p.name).toBe('Lançamento do site');
    expect(p.stages).toHaveLength(1);
    expect(p.stages[0]).toMatchObject({ name: 'Design' });
  });

  test('tarefas: etiqueta do projeto, filtro e vínculo pelo painel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'tasks'; render(); }, seed.toString());

    await expect(page.locator('.task-proj-pill')).toHaveCount(1); // só 1 pendente de projeto (as outras estão concluídas)
    await expect(page.locator('.task-proj-pill').first()).toContainText('Construção da casa > Estrutura');

    await page.locator('#taskProjectFilter').selectOption('personal');
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.locator('.task-row')).toContainText('Pagar fatura');

    await page.locator('#taskProjectFilter').selectOption('p1');
    await expect(page.locator('.task-row')).toHaveCount(1);

    // vincular a tarefa pessoal a uma etapa pelo painel
    await page.locator('#taskProjectFilter').selectOption('all');
    await page.locator('.task-row', { hasText: 'Pagar fatura' }).locator('.task-title').click();
    await expect(page.locator('#tpProject')).toHaveCount(0); // sem seletor fixo
    await page.locator('#tpMenuBtn').click();
    await page.locator('[data-m="proj"]').click();
    await page.locator('[data-p="p1"]').click();
    await page.locator('[data-s="s3"]').click();
    await expect(page.locator('#tpProjChip')).toContainText('Construção da casa · Acabamento');
    const t = await page.evaluate(() => state.tasks.find(x => x.id === 'd'));
    expect(t.projectId).toBe('p1');
    expect(t.stageId).toBe('s3');
  });
});

test('lista de projetos: filtros por situação', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, today = todayStr();
    const mk = (id, name, stages) => ({ id, name, categoryId: cat, description: '', startDate: today, endDate: '', createdAt: 1, stages });
    state.tasks = [];
    state.projects = [
      mk('a', 'Atrasado', [{ id: 'a1', name: 'E1', start: addDaysStr(today, -20), end: addDaysStr(today, -2) }]),
      mk('b', 'Em dia', [{ id: 'b1', name: 'E1', start: today, end: addDaysStr(today, 20) }]),
      mk('c', 'Feito', [{ id: 'c1', name: 'E1', start: addDaysStr(today, -20), end: addDaysStr(today, -2), manualDone: true }]),
    ];
    projectListFilter = 'all'; activeProjectId = null; currentView = 'projects'; render();
  });
  await expect(page.locator('.plist-row')).toHaveCount(3);
  await page.locator('.plist-chip[data-f="atrasado"]').click();
  await expect(page.locator('.plist-row')).toHaveCount(1);
  await expect(page.locator('.plist-row')).toContainText('Atrasado');
  await page.locator('.plist-chip[data-f="concluido"]').click();
  await expect(page.locator('.plist-row')).toContainText('Feito');
  await page.locator('.plist-chip[data-f="andamento"]').click();
  await expect(page.locator('.plist-row')).toContainText('Em dia');
});

test('tarefa de projeto: desvincular pela etiqueta e criar tarefa pelo projeto', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => { eval('(' + src + ')')(); activeProjectId = 'p1'; currentView = 'projects'; render(); }, seed.toString());
  await page.locator('#prjAddTask').click();
  const t = await page.evaluate(() => state.tasks[state.tasks.length - 1]);
  expect(t.projectId).toBe('p1');
  await expect(page.locator('#tpProjChip')).toContainText('Construção da casa');
  await page.locator('#tpProjChipX').click();
  expect(await page.evaluate((id) => state.tasks.find(x => x.id === id).projectId, t.id)).toBeNull();
  await expect(page.locator('#tpProjChip')).toHaveCount(0);
});

test('início da tarefa: opcional, ajusta e remove; vira início da barra na linha do tempo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate((src) => {
    eval('(' + src + ')')();
    state.tasks.find(t => t.id === 'c').dueDate = addDaysStr(todayStr(), 15);
    currentView = 'tasks'; activeTaskId = 'c'; render();
  }, seed.toString());
  await expect(page.locator('#tpStartLink')).toHaveText('+ início');
  expect((await page.evaluate(() => effectiveStart(state.tasks.find(t => t.id === 'c')))).source).toBe('open');
  await page.locator('#tpStartLink').click();
  await expect(page.locator('#tpStartPop')).toBeVisible();
  await page.locator('#tpStartPop [data-start]').first().click(); // Hoje
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'c').startDate)).toBe(await page.evaluate(() => todayStr()));
  await expect(page.locator('#tpStartLink')).not.toHaveText('+ início');
  await page.locator('#tpStartLink').click();
  await page.locator('#tpStartReset').click();
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'c').startDate)).toBeNull();
  await expect(page.locator('#tpStartLink')).toHaveText('+ início');
});

test('etapa: resumo lateral, progresso com subtarefas e + cria etapa', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate((src) => {
    eval('(' + src + ')')();
    const c = state.tasks.find(t => t.id === 'c');
    c.subtasks = [{ id: 'x1', title: 'a', done: true }, { id: 'x2', title: 'b', done: false }];
    currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; selectedStageId = null; render();
  }, seed.toString());
  // progresso: tarefa b concluída (100%) + c com 1/2 subtarefas (50%) => etapa 75%
  expect(await page.evaluate(() => { const p = projectById('p1'); return stagePercent(p, p.stages[1]); })).toBe(75);
  // sem seleção: resumo geral com Editar projeto
  await expect(page.locator('#prjSideEdit')).toBeVisible();
  await page.locator('.gantt-row[data-id="s2"]').click();
  await expect(page.locator('#stgSideNewTask')).toBeVisible();
  await expect(page.locator('#stgSideEdit')).toBeVisible();
  await page.locator('#stgSideBack').click();
  await expect(page.locator('#prjSideEdit')).toBeVisible();
  // + cria etapa quando há projeto aberto
  await page.locator('#primaryAddBtn').click();
  await expect(page.locator('#stgName')).toBeVisible();
  await page.locator('#stgCancel').click();
});

test('trocar a etapa pelo chip e arrastando na linha do tempo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'tasks'; activeTaskId = 'c'; render(); }, seed.toString());
  // chip do projeto abre a lista de etapas (a atual marcada) sem precisar desvincular
  await page.locator('#tpProjChip').click();
  await expect(page.locator('.task-menu-item.current')).toContainText('Estrutura');
  await page.locator('[data-s="s3"]').click();
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'c').stageId)).toBe('s3');
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'c').projectId)).toBe('p1');

  // arrastar na linha do tempo: tarefa 'c' (agora em s3) volta para s2
  await page.evaluate(() => { currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; activeTaskId = null; selectedStageId = null; render(); });
  const task = page.locator('.gantt-task[data-task-id="c"]');
  const stageRow = page.locator('.gantt-row[data-id="s2"]');
  await task.dragTo(stageRow);
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 'c').stageId)).toBe('s2');
});

test('datas da etapa vêm das tarefas (sem campos de data no formulário)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => {
    eval('(' + src + ')')();
    const t = todayStr();
    state.tasks.find(x => x.id === 'c').dueDate = addDaysStr(t, 12);
    state.tasks.find(x => x.id === 'b').dueDate = addDaysStr(t, 5);
    state.tasks.find(x => x.id === 'c').startDate = addDaysStr(t, 1);
    currentView = 'projects'; activeProjectId = 'p1'; render();
  }, seed.toString());
  const r = await page.evaluate(() => { const sg = projectById('p1').stages[1]; return [sg.start === addDaysStr(todayStr(), 1), sg.end === addDaysStr(todayStr(), 12)]; });
  expect(r).toEqual([true, true]);
  await page.evaluate(() => { openStageEditor(projectById('p1'), projectById('p1').stages[1]); });
  await expect(page.locator('#stgName')).toBeVisible();
  await expect(page.locator('#stgStart')).toHaveCount(0);
  await expect(page.locator('#stgEnd')).toHaveCount(0);
});

test('tarefas do projeto: criar pelo resumo da etapa e abrir na própria tela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render(); }, seed.toString());
  const antes = await page.evaluate(() => state.tasks.length);
  await page.locator('.gantt-row[data-id="s2"]').click();
  await page.locator('#stgSideNewTask').click();
  const nova = await page.evaluate(() => state.tasks[state.tasks.length - 1]);
  expect(await page.evaluate(() => state.tasks.length)).toBe(antes + 1);
  expect(nova).toMatchObject({ projectId: 'p1', stageId: 's2', dueDate: null });
  // o painel abre sem sair de Projetos
  expect(await page.evaluate(() => currentView)).toBe('projects');
  await expect(page.locator('.task-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task-panel')).toHaveCount(0);
});

test('linha "+ Nova tarefa" no fim de cada etapa cria a tarefa com nome + Enter', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render(); }, seed.toString());
  await expect(page.locator('.gantt-add')).toHaveCount(3); // uma por etapa, nenhuma "sem etapa"
  const campo = page.locator('.gantt-add[data-stage="s2"] .gantt-add-input');
  await campo.fill('Instalar elétrica');
  await campo.press('Enter');
  const nova = await page.evaluate(() => state.tasks[state.tasks.length - 1]);
  expect(nova).toMatchObject({ title: 'Instalar elétrica', projectId: 'p1', stageId: 's2', dueDate: null });
  await expect(page.locator('.gantt-task', { hasText: 'Instalar elétrica' })).toHaveCount(1);
  // clicar abre o painel sem sair de Projetos
  await page.locator('.gantt-task', { hasText: 'Instalar elétrica' }).click();
  expect(await page.evaluate(() => currentView)).toBe('projects');
  await expect(page.locator('.task-panel .tp-name-input')).toHaveValue('Instalar elétrica');
});

test('projeto: ícone e cor, descrição breve e tarefas da etapa em ordem de início', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'projects'; activeProjectId = null; render(); }, seed.toString());
  // ícone e cor pelo cadastro
  await page.locator('.plist-row').click();
  await page.locator('#prjEdit').click();
  await page.locator('.prj-icon-btn[data-icon="rocket"]').click();
  // a paleta só aparece ao clicar na bolinha
  await expect(page.locator('#prjColorPop')).toBeHidden();
  await page.locator('#prjColorDot').click();
  await expect(page.locator('#prjColorPop')).toBeVisible();
  await page.locator('.prj-swatch[data-color="#E5484D"]').click();
  await expect(page.locator('#prjColorPop')).toBeHidden();
  await page.locator('#prjSave').click();
  expect(await page.evaluate(() => { const p = projectById('p1'); return [p.icon, p.color]; })).toEqual(['rocket', '#E5484D']);
  await expect(page.locator('.proj-toolbar .prj-badge')).toBeVisible();
  // descrição breve direto no topo
  await page.locator('#prjDescInline').fill('Casa de dois pavimentos');
  await page.locator('#prjDescInline').press('Enter');
  expect(await page.evaluate(() => projectById('p1').description)).toBe('Casa de dois pavimentos');
  // ordem por início: quem começa antes sobe; sem data vai para o fim
  const ordem = await page.evaluate(() => {
    const t = todayStr();
    const mk = (id, due, start) => ({ id, title: id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: due, startDate: start, createdAt: 1, subtasks: [], tagIds: [], comments: [], attachments: [] });
    return sortByStart([mk('sem', null, null), mk('tarde', addDaysStr(t, 20), null), mk('cedo', addDaysStr(t, 30), addDaysStr(t, 1)), mk('meio', addDaysStr(t, 5), null)]).map(x => x.id);
  });
  expect(ordem).toEqual(['cedo', 'meio', 'tarde', 'sem']);
});

test('relatório do projeto: página com nome, descrição, linha do tempo e tarefas linha a linha', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate((src) => {
    eval('(' + src + ')')();
    projectById('p1').description = 'Casa de dois pavimentos';
    currentView = 'projects'; activeProjectId = 'p1'; render();
    window.__rep = '';
    window.open = () => ({ document: { write: (h) => { window.__rep += h; }, close() {} }, focus() {} });
  }, seed.toString());
  await page.locator('#prjExport').click();
  const html = await page.evaluate(() => window.__rep);
  expect(html).toContain('Construção da casa');
  expect(html).toContain('Casa de dois pavimentos');
  expect(html).toContain('Linha do tempo');
  for (const t of ['Concretar sapatas', 'Erguer pilares', 'Concretar laje']) expect(html).toContain(t);
  expect(html).toContain('Concluída');
  expect(html).toContain('window.print()');
  expect(html).toContain('data:text/csv');
  const csv = await page.evaluate(() => projectCsv(buildProjectReportData(projectById('p1'))));
  expect(csv.split('\r\n')).toHaveLength(1 + 3); // cabeçalho + 3 tarefas do projeto
  expect(csv).toContain('"Concretar laje"');
});
