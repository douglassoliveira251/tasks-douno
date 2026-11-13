import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const [w, h] of [[1280, 900], [390, 844]]) for (const th of ['light', 'dark']) {
  test(`Painel da tarefa: "Retomar em" tem o mesmo estilo do "Prazo" (${w}px, ${th})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate((th) => {
      const t = todayStr(), c = state.categories[0].id;
      state.tasks = [{ id: 't1', title: 'Renovar contrato', done: false, status: 'nao_iniciado', priority: 'media', dueDate: t, dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none', startDate: t, followUpDate: addDaysStr(t, 3) }];
      document.documentElement.setAttribute('data-theme', th);
      currentView = 'tasks'; activeTaskId = 't1'; render();
    }, th);
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const st = (e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, pad: cs.padding, radius: cs.borderRadius }; };
      const box = (s) => st(document.querySelector(s));
      const lab = (s) => getComputedStyle(document.querySelector(s + ' > .tp-label')).color;
      return {
        caixaRet: box('.tp-follow-box'), caixaPrazo: box('.tp-due-box'),
        campoRet: st(document.querySelector('.tp-follow-trigger')), campoPrazo: st(document.querySelector('.tp-due-box .tp-row2')),
        labRet: lab('.tp-follow-box'), labPrazo: lab('.tp-due-box'),
      };
    });
    expect(r.caixaRet.bg).toBe(r.caixaPrazo.bg);          // a caixa (com o título) não pode ter fundo diferente
    expect(r.caixaRet.pad).toBe(r.caixaPrazo.pad);
    expect(r.campoRet.bg).toBe(r.campoPrazo.bg);          // o campo tem o mesmo fundo
    expect(r.campoRet.radius).toBe(r.campoPrazo.radius);
    expect(r.labRet).toBe(r.labPrazo);                    // o título tem a mesma cor
    await page.screenshot({ path: `test-results/retomar-prazo-${w}-${th}.png` });
  });
}
