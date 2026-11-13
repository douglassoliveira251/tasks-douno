import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = (tab) => {
  const t = todayStr(), c = state.categories[0].id;
  const mk = (id, title, stage, a, b) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', startDate: addDaysStr(t, a), dueDate: addDaysStr(t, b), dueTime: '', categoryId: c, projectId: 'p1', stageId: stage, tagIds: [], subtasks: [], comments: [], attachments: id === 'b1' ? [{ id: 'at1', name: 'orcamento.pdf', type: 'application/pdf', dataUrl: 'data:application/pdf;base64,AA==' }] : [], description: '', createdAt: 5001, recurrence: 'none' });
  state.projects = [{ id: 'p1', name: 'Reforma', categoryId: c, stages: [{ id: 's1', name: 'Planejamento' }, { id: 's2', name: 'Obra' }], startDate: addDaysStr(t, -5), endDate: addDaysStr(t, 40), createdAt: 1 }];
  state.tasks = [mk('a1', 'Orçamento', 's1', -4, 2), mk('b1', 'Demolição', 's2', 3, 9)];
  state.libItems = [
    { id: 'l1', type: 'link', title: 'Normas da ABNT', url: 'https://abnt.org.br/normas', categoryId: c, favorite: false, createdAt: 1, updatedAt: 30 },
    { id: 'l2', type: 'skill', title: 'Skill de orçamento', content: '# x', categoryId: c, createdAt: 1, updatedAt: 20 },
  ];
  state.notes = [
    { id: 'n1', title: 'Reunião com o arquiteto', content: 'x', categoryId: c, notebookId: (state.notebooks[0] || {}).id, updatedAt: 40, createdAt: 1 },
    { id: 'n2', title: 'Medidas da cozinha', content: 'x', categoryId: c, notebookId: (state.notebooks[0] || {}).id, linkedTaskId: 'a1', updatedAt: 50, createdAt: 1 },
  ];
  currentView = 'projects'; activeProjectId = 'p1'; projectTab = tab; render();
};

test('Documentação (computador): abas no painel, associar do seletor, filtrar, vindo das tarefas e desassociar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed, 'timeline');
  const tabs = page.locator('.pside-tabs');
  await expect(tabs.locator('button.on')).toHaveText('Resumo');
  await expect(tabs.locator('[data-stab="docs"]')).toContainText('2'); // 1 nota ligada a tarefa + 1 anexo
  await tabs.locator('[data-stab="docs"]').click();
  await expect(page.locator('.pdoc-empty').first()).toContainText('Nada associado ainda');
  // só leitura: nota ligada e anexo da tarefa, com a tarefa de origem
  const ro = page.locator('.pdoc-from');
  await expect(ro).toHaveCount(2);
  await expect(page.locator('.pdoc-it:has(.pdoc-from)').first().locator('.pdoc-x')).toHaveCount(0);
  // associar: biblioteca (link) e nota
  await page.locator('#pdocAdd').click();
  await expect(page.locator('.pdoc-pick')).toBeVisible();
  await expect(page.locator('#pdocOk')).toBeDisabled();
  await page.locator('[data-pk="lib:l1"]').check();
  await page.locator('.pdoc-tabs [data-t="note"]').click();
  await page.locator('#pdocQ').fill('arquit');
  await expect(page.locator('.pdoc-pr')).toHaveCount(1);
  await page.locator('[data-pk="note:n1"]').check();
  await expect(page.locator('#pdocOk')).toHaveText('Associar 2');
  await page.screenshot({ path: 'test-results/docs-picker-d.png' });
  await page.locator('#pdocOk').click();
  expect(await page.evaluate(() => state.projects[0].docs)).toEqual([{ k: 'lib', id: 'l1' }, { k: 'note', id: 'n1' }]);
  await expect(page.locator('.pside-tabs button.on')).toContainText('Documentação');
  await expect(page.locator('.pdoc-it:not(:has(.pdoc-from))')).toHaveCount(2);
  await expect(page.locator('.pdoc-it', { hasText: 'Normas da ABNT' })).toContainText('abnt.org.br');
  // filtro
  await page.locator('.pdoc-chip[data-f="note"]').click();
  await expect(page.locator('.pdoc-it:not(:has(.pdoc-from))')).toHaveCount(1);
  await page.locator('.pdoc-chip[data-f="all"]').click();
  await page.screenshot({ path: 'test-results/docs-aba-d.png' });
  // abrir item da biblioteca leva ao detalhe
  await page.locator('.pdoc-it', { hasText: 'Normas da ABNT' }).click();
  expect(await page.evaluate(() => currentView)).toBe('library');
  await expect(page.locator('#libraryView')).toContainText('Normas da ABNT');
  // desassociar; item apagado some sozinho
  await page.evaluate(() => { currentView = 'projects'; activeProjectId = 'p1'; render(); });
  await page.locator('.pside-tabs [data-stab="docs"]').click();
  await page.locator('.pdoc-it', { hasText: 'Reunião com o arquiteto' }).locator('.pdoc-x').click();
  expect(await page.evaluate(() => state.projects[0].docs)).toEqual([{ k: 'lib', id: 'l1' }]);
  await page.evaluate(() => { state.libItems = []; render(); });
  await expect(page.locator('.pdoc-it:not(:has(.pdoc-from))')).toHaveCount(0);
  // voltar para o resumo
  await page.locator('.pside-tabs [data-stab="resumo"]').click();
  await expect(page.locator('.proj-ring')).toBeVisible();
});

test('Documentação (celular): aba Docs no projeto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'projects' });
  await page.evaluate(seed, 'timeline');
  await page.evaluate(() => { state.projects[0].docs = [{ k: 'lib', id: 'l1' }, { k: 'note', id: 'n1' }]; render(); });
  const tab = page.locator('.pd-tabs .pd-tab-docs');
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveClass(/on/);
  await expect(page.locator('#prjBody .pdoc-it:not(:has(.pdoc-from))')).toHaveCount(2);
  await expect(page.locator('#prjBody .pdoc-from')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/docs-aba-m.png' });
  await page.locator('#pdocAdd').click();
  await expect(page.locator('.pdoc-pick')).toBeVisible();
  await page.screenshot({ path: 'test-results/docs-picker-m.png' });
  const box = await page.locator('.pdoc-pick').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
