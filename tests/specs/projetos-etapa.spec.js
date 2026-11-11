import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  const d = (k) => new Date(Date.now() + k * 864e5).toISOString().slice(0, 10);
  state.projects = [
    { id: 'p1', name: 'Reforma', categoryId: cat, stages: [{ id: 's1', name: 'Planejamento', start: d(-10), end: d(-1) }, { id: 's2', name: 'Obra', start: d(0), end: d(20) }], startDate: d(-10), endDate: d(20), createdAt: 1 },
    { id: 'p2', name: 'Mudança', categoryId: cat, stages: [{ id: 'm1', name: 'Caixas', start: d(0), end: d(5) }], startDate: d(0), endDate: d(5), createdAt: 1 },
  ];
  state.tasks = [{ id: 't1', title: 'Comprar material', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'alta', dueDate: d(3), description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], projectId: 'p1', stageId: 's2', createdAt: 1 }];
  currentView = 'projects'; activeProjectId = 'p1'; selectedStageId = null; render();
};

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`projeto (${vp.width}px): painel da etapa tem Nova tarefa e Editar lado a lado, embaixo da lista`, async ({ page }) => {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(seed);
    await page.evaluate(() => { selectedStageId = 's2'; render(); });
    const r = await page.evaluate(() => {
      const a = document.getElementById('stgSideNewTask').getBoundingClientRect();
      const b = document.getElementById('stgSideEdit').getBoundingClientRect();
      const list = document.querySelector('.proj-side-tasks').getBoundingClientRect();
      return { at: a.top, bt: b.top, ar: a.right, bl: b.left, topBtns: Math.min(a.top, b.top), listBottom: list.bottom, sw: document.documentElement.scrollWidth, vw: innerWidth, an: a.width, bn: b.width };
    });
    expect(Math.abs(r.at - r.bt)).toBeLessThan(2);
    expect(r.bl).toBeGreaterThan(r.ar - 1);
    expect(r.topBtns).toBeGreaterThanOrEqual(r.listBottom - 1);
    expect(r.an).toBeGreaterThan(60);
    expect(r.bn).toBeGreaterThan(60);
    expect(r.sw).toBeLessThanOrEqual(r.vw);
    // "Editar" abre o editor da etapa; "Nova tarefa" cria a tarefa já nessa etapa
    await page.click('#stgSideNewTask');
    const nova = await page.evaluate(() => state.tasks.find(t => t.id !== 't1'));
    expect(nova.projectId).toBe('p1');
    expect(nova.stageId).toBe('s2');
  });
}

test('chip do projeto na tarefa: lista as etapas, troca a etapa, tem Alterar projeto e Ir até o projeto', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed);
  await page.evaluate(() => { currentView = 'tasks'; render(); openTaskPanel('t1'); });
  await page.click('#tpProjChip');
  const menu = page.locator('#taskMenuPortal');
  await expect(menu).toContainText('Planejamento');
  await expect(menu).toContainText('Obra');
  await expect(menu).toContainText('Alterar projeto');
  await expect(menu).toContainText('Ir até o projeto');
  await expect(menu).not.toContainText('Só o projeto');
  await menu.locator('[data-s="s1"]').click();
  expect(await page.evaluate(() => state.tasks.find(t => t.id === 't1').stageId)).toBe('s1');
  // Alterar projeto…: abre a lista de projetos; escolher o outro pede a etapa dele
  await page.click('#tpProjChip');
  await page.locator('#taskMenuPortal [data-m="change"]').click();
  await expect(page.locator('#taskMenuPortal')).toContainText('Escolha o projeto');
  await page.locator('#taskMenuPortal [data-p="p2"]').click();
  await expect(page.locator('#taskMenuPortal')).toContainText('Caixas');
  await expect(page.locator('#taskMenuPortal')).not.toContainText('Só o projeto');
  await page.locator('#taskMenuPortal [data-s="m1"]').click();
  const t = await page.evaluate(() => state.tasks.find(x => x.id === 't1'));
  expect(t.projectId).toBe('p2');
  expect(t.stageId).toBe('m1');
  // Ir até o projeto
  await page.click('#tpProjChip');
  await page.locator('#taskMenuPortal [data-m="goproj"]').click();
  expect(await page.evaluate(() => [currentView, activeProjectId])).toEqual(['projects', 'p2']);
});

test('projeto: "Nova tarefa" do cabeçalho exige etapa (pergunta quando há várias)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed);
  const antes = await page.evaluate(() => state.tasks.length);
  await page.click('#prjAddTask');
  await expect(page.locator('#taskMenuPortal')).toContainText('Em qual etapa?');
  expect(await page.evaluate(() => state.tasks.length)).toBe(antes); // ainda não criou
  await page.locator('#taskMenuPortal [data-pick-stage="s1"]').click();
  const nova = await page.evaluate(() => state.tasks[state.tasks.length - 1]);
  expect(nova.projectId).toBe('p1');
  expect(nova.stageId).toBe('s1');
  // projeto com uma única etapa: usa ela direto, sem perguntar
  await page.evaluate(() => { closeTaskPanel && closeTaskPanel(true); activeProjectId = 'p2'; selectedStageId = null; currentView = 'projects'; render(); });
  await page.click('#prjAddTask');
  const nova2 = await page.evaluate(() => state.tasks[state.tasks.length - 1]);
  expect(nova2.projectId).toBe('p2');
  expect(nova2.stageId).toBe('m1');
});

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`projeto (${vp.width}px): com muitas tarefas na etapa a lista rola por dentro e os botões continuam perto`, async ({ page }) => {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(seed);
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      for (let i = 0; i < 20; i++) state.tasks.push({ id: 'x' + i, title: 'Tarefa ' + i, categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], projectId: 'p1', stageId: 's2', createdAt: 1 });
      selectedStageId = 's2'; render();
    });
    const r = await page.evaluate(() => {
      const l = document.querySelector('.proj-side-tasks');
      const b = document.getElementById('stgSideNewTask').getBoundingClientRect();
      const lr = l.getBoundingClientRect();
      return { h: lr.height, scroll: l.scrollHeight > l.clientHeight, dist: b.bottom - lr.top, sw: document.documentElement.scrollWidth, vw: innerWidth };
    });
    expect(r.h).toBeLessThanOrEqual(272);
    expect(r.scroll).toBe(true);
    expect(r.dist).toBeLessThan(380);
    expect(r.sw).toBeLessThanOrEqual(r.vw);
    await expect(page.locator('#stgSideNewTask')).toBeVisible();
  });
}
