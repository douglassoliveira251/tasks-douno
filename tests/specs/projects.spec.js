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
    await expect(page.locator('.proj-card')).toHaveCount(1);
    await expect(page.locator('.proj-card')).toContainText('Construção da casa');
    await expect(page.locator('.proj-card')).toContainText('50%');

    await page.locator('.proj-card').click();
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
    await page.locator('#stgEnd').fill('2030-01-31');
    await page.locator('#stgSave').click();
    const p = await page.evaluate(() => state.projects[0]);
    expect(p.name).toBe('Lançamento do site');
    expect(p.stages).toHaveLength(1);
    expect(p.stages[0]).toMatchObject({ name: 'Design', end: '2030-01-31' });
  });

  test('tarefas: etiqueta do projeto, filtro e vínculo pelo painel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate((src) => { eval('(' + src + ')')(); currentView = 'tasks'; render(); }, seed.toString());

    await expect(page.locator('.task-proj-pill')).toHaveCount(1); // só 1 pendente de projeto (as outras estão concluídas)
    await expect(page.locator('.task-proj-pill').first()).toContainText('Construção da casa · Estrutura');

    await page.locator('#taskProjectFilter').selectOption('personal');
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.locator('.task-row')).toContainText('Pagar fatura');

    await page.locator('#taskProjectFilter').selectOption('p1');
    await expect(page.locator('.task-row')).toHaveCount(1);

    // vincular a tarefa pessoal a uma etapa pelo painel
    await page.locator('#taskProjectFilter').selectOption('all');
    await page.locator('.task-row', { hasText: 'Pagar fatura' }).locator('.task-title').click();
    await page.locator('#tpProject').selectOption('p1');
    await page.locator('#tpStage').selectOption('s3');
    const t = await page.evaluate(() => state.tasks.find(x => x.id === 'd'));
    expect(t.projectId).toBe('p1');
    expect(t.stageId).toBe('s3');
  });
});
