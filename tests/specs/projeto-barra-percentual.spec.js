import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const [w, h, n] of [[1280, 900, 'd'], [390, 844, 'm']]) for (const th of ['light', 'dark']) {
  test(`Linha do tempo: a barra da tarefa mostra o % de avanço (${n}, ${th})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate((th) => {
      const t = todayStr(), c = state.categories[0].id;
      const sub = (d, tot) => Array.from({ length: tot }, (_, i) => ({ id: 'x' + i + Math.random(), title: 'I' + i, done: i < d }));
      const mk = (id, title, a, b, d, tot, st, done) => ({ id, title, done: !!done, status: st, priority: 'media', startDate: addDaysStr(t, a), dueDate: addDaysStr(t, b), dueTime: '', categoryId: c, projectId: 'p1', stageId: 's1', tagIds: [], subtasks: sub(d, tot), comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' });
      state.projects = [{ id: 'p1', name: 'Reforma', categoryId: c, stages: [{ id: 's1', name: 'Obra', start: addDaysStr(t, -8), end: addDaysStr(t, 24) }], startDate: addDaysStr(t, -8), endDate: addDaysStr(t, 24), createdAt: 1 }];
      state.tasks = [
        mk('a', 'Concluída', -8, -1, 4, 4, 'concluida', true),
        mk('b', 'Três de quatro', -5, 10, 3, 4, 'em_andamento'),
        mk('c', 'Uma de cinco', -2, 12, 1, 5, 'em_andamento'),
        mk('d', 'Nada feito', 2, 14, 0, 3, 'nao_iniciado'),
        mk('e', 'Sem subtarefas', 6, 20, 0, 0, 'nao_iniciado'),
        mk('f', 'Barra curta', 3, 3, 1, 4, 'em_andamento'),
      ];
      document.documentElement.setAttribute('data-theme', th);
      currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render();
    }, th);
    await page.waitForTimeout(300);
    const pcts = await page.locator('.gantt-task').evaluateAll(rows => rows.map(r => ({
      id: r.dataset.taskId,
      txt: r.querySelector('.gantt-pct').textContent,
      fill: r.querySelector('.gantt-fill').style.width,
    })));
    const m = Object.fromEntries(pcts.map(p => [p.id, p]));
    expect(m.a.txt).toBe('100%'); expect(m.a.fill).toBe('100%');
    expect(m.b.txt).toBe('75%'); expect(m.b.fill).toBe('75%');
    expect(m.c.txt).toBe('20%');
    expect(m.d.txt).toBe('0%'); expect(m.d.fill).toBe('0%');
    expect(m.e.txt).toBe('0%');
    expect(m.f.txt).toBe('25%');
    // o número não passa por cima do preenchimento escuro quando é pequeno: fica depois dele
    const sobre = await page.evaluate(() => {
      const r = document.querySelector('.gantt-task[data-task-id="c"]');
      const f = r.querySelector('.gantt-fill').getBoundingClientRect(), l = r.querySelector('.gantt-pct');
      const rg = document.createRange(); rg.selectNodeContents(l);
      return rg.getBoundingClientRect().left - f.right;
    });
    expect(sobre).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
    await page.screenshot({ path: `test-results/barra-pct-${n}-${th}.png` });
  });
}
