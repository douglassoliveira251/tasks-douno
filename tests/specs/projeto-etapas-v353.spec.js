import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const t = todayStr(), c = state.categories[0].id;
  const mk = (id, title, stage, a, b, d, tot, done) => ({ id, title, done: !!done, status: done ? 'concluida' : 'em_andamento', priority: 'media', startDate: addDaysStr(t, a), dueDate: addDaysStr(t, b), dueTime: '', categoryId: c, projectId: 'p1', stageId: stage, tagIds: [], subtasks: Array.from({ length: tot }, (_, i) => ({ id: id + i, title: 'I', done: i < d })), comments: [], attachments: [], description: '', createdAt: 5001, completedAt: done ? new Date(2026, 10, 12, 10).getTime() : null, recurrence: 'none' });
  state.projects = [{ id: 'p1', name: 'Reforma', categoryId: c, stages: [{ id: 's1', name: 'Planejamento' }, { id: 's2', name: 'Obra' }, { id: 's3', name: 'Entrega' }], startDate: addDaysStr(t, -20), endDate: addDaysStr(t, 40), createdAt: 1 }];
  state.tasks = [
    mk('a1', 'Orçamento', 's1', -20, -12, 0, 0, true), mk('a2', 'Planta', 's1', -14, -6, 0, 0, true),
    mk('b1', 'Demolição', 's2', 1, 9, 1, 4, false), mk('b2', 'Elétrica', 's2', 8, 16, 0, 0, false),
    mk('c1', 'Vistoria', 's3', 30, 34, 0, 0, false),
  ];
  currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render();
};

for (const [w, h, n] of [[1280, 900, 'd'], [390, 844, 'm']]) {
  test(`Etapas: % no medidor, Concluído, check, recolhida só com o nome e estado salvo (${n})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(seed);
    const row = (id) => page.locator(`.gantt-row[data-id="${id}"]`);
    // % no medidor; 100% vira "Concluído"
    await expect(row('s1').locator('.gantt-pct')).toHaveText('100%');
    await expect(row('s2').locator('.gantt-pct')).toHaveText('13%'); // (0% + 25%) / 2 tarefas = 12,5 arredonda para 13
    await expect(row('s3').locator('.gantt-pct')).toHaveText('0%');
    // concluída: sem check nem linha esverdeada; 100% do lado de fora da barra
    await expect(row('s1').locator('.stage-okc')).toHaveCount(0);
    await expect(row('s1').locator('.gantt-pct')).toHaveClass(/out/);
    const bg = (id) => row(id).evaluate(e => getComputedStyle(e).backgroundColor);
    expect(await bg('s1')).toBe(await bg('s2'));
    await expect(row('s1').locator('small')).toContainText('Concluída em 12/11/26');
    if (w > 768) {
      // detalhe numa linha só e fonte menor
      const sm = await row('s2').locator('small').evaluate(e => ({ fs: parseFloat(getComputedStyle(e).fontSize), h: e.getBoundingClientRect().height, ws: getComputedStyle(e).whiteSpace }));
      expect(sm.fs).toBeLessThanOrEqual(10.6);
      expect(sm.ws).toBe('nowrap');
      expect(sm.h).toBeLessThan(16);
      const gl = await page.locator('.gantt-wrap').evaluate(e => getComputedStyle(e).getPropertyValue('--gl').trim());
      expect(gl).toBe('250px');
    }
    // recolher: só o nome (sem detalhe) e linha mais baixa
    const hAberta = await row('s2').evaluate(e => e.getBoundingClientRect().height);
    await row('s2').locator('.gantt-toggle').click();
    await expect(row('s2')).toHaveClass(/collapsed/);
    if (w > 768) await expect(row('s2').locator('small')).toBeHidden();
    expect(await row('s2').evaluate(e => e.getBoundingClientRect().height)).toBeLessThanOrEqual(hAberta);
    await expect(page.locator('.gantt-task[data-task-id="b1"]')).toHaveCount(0);
    // estado salvo no projeto e mantido ao sair e voltar
    expect(await page.evaluate(() => state.projects[0].collapsedStages)).toEqual(['s2']);
    await page.evaluate(() => { activeProjectId = null; render(); });
    await page.evaluate(() => { activeProjectId = 'p1'; render(); });
    await expect(row('s2')).toHaveClass(/collapsed/);
    // e depois de recarregar a página
    await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
    await page.reload();
    await page.waitForFunction(() => typeof render === 'function');
    await page.evaluate(() => { closeLoginGate(); currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render(); });
    await expect(row('s2')).toHaveClass(/collapsed/);
    // reabrir
    await row('s2').locator('.gantt-toggle').click();
    await expect(page.locator('.gantt-task[data-task-id="b1"]')).toHaveCount(1);
    expect(await page.evaluate(() => state.projects[0].collapsedStages)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
    await row('s3').locator('.gantt-toggle').click();
    await page.screenshot({ path: `test-results/etapas-v353-${n}.png` });
  });
}
