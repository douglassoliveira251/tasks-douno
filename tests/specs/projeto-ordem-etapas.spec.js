import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = (tab) => {
  const t = todayStr(), c = state.categories[0].id;
  const mk = (id, title, stage, a, b) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', startDate: addDaysStr(t, a), dueDate: addDaysStr(t, b), dueTime: '', categoryId: c, projectId: 'p1', stageId: stage, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' });
  state.projects = [{ id: 'p1', name: 'Reforma', categoryId: c, stages: [{ id: 's1', name: 'Planejamento' }, { id: 's2', name: 'Obra' }, { id: 's3', name: 'Acabamento' }, { id: 's4', name: 'Entrega' }], startDate: addDaysStr(t, -10), endDate: addDaysStr(t, 40), createdAt: 1 }];
  state.tasks = [
    mk('a1', 'Orçamento', 's1', -9, -3), mk('b1', 'Demolição', 's2', 1, 9),
    mk('c1', 'Pisos (veio de outra etapa)', 's3', -7, 3), mk('c2', 'Pintura', 's3', 20, 28), mk('d1', 'Vistoria', 's4', 30, 34),
  ];
  delete state.projects[0].stageOrder;
  currentView = 'projects'; activeProjectId = 'p1'; projectTab = tab; render();
};
const arrastar = async (page, grip, alvo, dy = 6) => {
  const a = await grip.boundingBox(), b = await alvo.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 12, { steps: 3 });
  await page.mouse.move(b.x + 40, b.y + b.height / 2 + dy, { steps: 10 });
};
const nomes = (page, sel) => page.locator(sel).evaluateAll(els => els.map(e => e.textContent.trim().replace(/\s+/g, ' ').split(' · ')[0]));

test('Etapas (linha do tempo): arrastar pela alça muda a ordem, salva, e dá para voltar à ordem por data', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed, 'timeline');
  const heads = '.gantt-row[data-id] .gl b';
  expect(await nomes(page, heads)).toEqual(['Planejamento', 'Acabamento', 'Obra', 'Entrega']); // o problema de hoje
  await expect(page.locator('.stage-manual')).toHaveCount(0);
  // arrasta Acabamento para depois de Obra (antes de Entrega)
  const grip = page.locator('.gantt-row[data-id="s3"] .drag-grip');
  await arrastar(page, grip, page.locator('.gantt-row[data-id="s4"]'), -8);
  await expect(page.locator('.stage-dropline')).toBeVisible();
  await page.screenshot({ path: 'test-results/etapas-arrastando-d.png' });
  await page.mouse.up();
  expect(await page.evaluate(() => state.projects[0].stageOrder)).toEqual(['s1', 's2', 's3', 's4']);
  expect(await nomes(page, heads)).toEqual(['Planejamento', 'Obra', 'Acabamento', 'Entrega']);
  await expect(page.locator('.stage-manual')).toContainText('Ordem manual');
  expect(await page.evaluate(() => currentView + '/' + (selectedStageId || ''))).toBe('projects/'); // arrastar não seleciona a etapa
  await page.screenshot({ path: 'test-results/etapas-ordem-d.png' });
  // cancelar com soltar no mesmo lugar não muda nada
  const g2 = page.locator('.gantt-row[data-id="s2"] .drag-grip');
  const b2 = await g2.boundingBox();
  await page.mouse.move(b2.x + 5, b2.y + 5); await page.mouse.down(); await page.mouse.move(b2.x + 5, b2.y + 9, { steps: 3 }); await page.mouse.up();
  expect(await page.evaluate(() => state.projects[0].stageOrder)).toEqual(['s1', 's2', 's3', 's4']);
  // etapa nova entra no fim, mesmo com data antiga
  await page.evaluate(() => { state.projects[0].stages.push({ id: 's5', name: 'Extra' }); state.tasks.push({ id: 'e1', title: 'X', done: false, status: 'nao_iniciado', priority: 'media', startDate: addDaysStr(todayStr(), -9), dueDate: addDaysStr(todayStr(), -8), dueTime: '', categoryId: state.categories[0].id, projectId: 'p1', stageId: 's5', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' }); render(); });
  expect(await nomes(page, heads)).toEqual(['Planejamento', 'Obra', 'Acabamento', 'Entrega', 'Extra']);
  // a ordem vale no resumo da lista e no relatório
  const rel = await page.evaluate(() => buildProjectReportData(state.projects[0]).stageBlocks.map(b => b.sg.name));
  expect(rel.slice(0, 4)).toEqual(['Planejamento', 'Obra', 'Acabamento', 'Entrega']);
  // teclado: Acabamento sobe uma casa
  await page.locator('.gantt-row[data-id="s3"] .drag-grip').focus();
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => state.projects[0].stageOrder.slice(0, 3))).toEqual(['s1', 's3', 's2']);
  // voltar à ordem por data
  await page.locator('#stageOrderReset').click();
  expect(await page.evaluate(() => state.projects[0].stageOrder)).toBeUndefined();
  expect((await nomes(page, heads)).slice(0, 4)).toEqual(['Planejamento', 'Extra', 'Acabamento', 'Obra']);
  await expect(page.locator('.stage-manual')).toHaveCount(0);
});

test('Etapas (celular): alça na lista de etapas reordena os cartões e a ordem vale na linha do tempo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed, 'etapas');
  const cards = '.pe-card[data-id] .pe-hl b';
  expect(await nomes(page, cards)).toEqual(['Planejamento', 'Acabamento', 'Obra', 'Entrega']);
  await page.screenshot({ path: 'test-results/etapas-lista-m.png' });
  const grip = page.locator('.pe-card[data-id="s3"] .drag-grip');
  await expect(grip).toBeVisible();
  await arrastar(page, grip, page.locator('.pe-card[data-id="s4"]'), -4);
  await page.screenshot({ path: 'test-results/etapas-arrastando-m.png' });
  await page.mouse.up();
  expect(await nomes(page, cards)).toEqual(['Planejamento', 'Obra', 'Acabamento', 'Entrega']);
  await expect(page.locator('.stage-manual')).toContainText('Ordem manual');
  // clicar na alça não recolhe o cartão
  await page.locator('.pe-card[data-id="s1"] .drag-grip').click();
  await expect(page.locator('.pe-card[data-id="s1"]')).not.toHaveClass(/closed/);
  // a linha do tempo no celular segue a mesma ordem
  await page.evaluate(() => { projectTab = 'timeline'; render(); });
  expect(await nomes(page, '.gantt-row[data-id] .gl b')).toEqual(['Planejamento', 'Obra', 'Acabamento', 'Entrega']);
  await page.screenshot({ path: 'test-results/etapas-ordem-m.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
