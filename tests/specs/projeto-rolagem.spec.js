import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const [w, h] of [[1280, 700], [390, 844]]) {
  test(`Projeto: abrir uma tarefa não faz a tela voltar ao topo (${w}px)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate(() => {
      const t = todayStr(), c = state.categories[0].id;
      const stages = [], tasks = [];
      for (let s = 1; s <= 6; s++) {
        stages.push({ id: 's' + s, name: 'Etapa ' + s, start: addDaysStr(t, s * 5), end: addDaysStr(t, s * 5 + 4) });
        for (let k = 1; k <= 5; k++) tasks.push({ id: `t${s}_${k}`, title: `Tarefa ${s}.${k}`, done: false, status: 'nao_iniciado', priority: 'media', dueDate: addDaysStr(t, s * 5 + k % 4), dueTime: '', categoryId: c, projectId: 'p1', stageId: 's' + s, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' });
      }
      state.projects = [{ id: 'p1', name: 'Reforma grande', categoryId: c, stages, startDate: t, endDate: addDaysStr(t, 40), createdAt: 1 }];
      state.tasks = tasks;
      currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render();
    });
    const scroller = () => page.evaluate(() => {
      const v = document.getElementById('projectsView');
      return { el: v.scrollTop, win: window.scrollY, max: v.scrollHeight - v.clientHeight };
    });
    const antes0 = await scroller();
    // rola até o fim da tela (o que rolar: a tela do projeto ou a janela)
    await page.evaluate(() => { const v = document.getElementById('projectsView'); v.scrollTop = 99999; window.scrollTo(0, 99999); });
    const antes = await scroller();
    expect(antes.el + antes.win).toBeGreaterThan(100);
    // abre uma tarefa pela linha (a última é a mais baixa)
    const linhas = page.locator('.gantt-task');
    const n = await linhas.count();
    expect(n).toBeGreaterThan(5);
    await linhas.nth(n - 1).click();
    await expect(page.locator('.task-panel')).toBeVisible();
    const depois = await scroller();
    expect(Math.abs(depois.el - antes.el)).toBeLessThan(4);
    expect(Math.abs(depois.win - antes.win)).toBeLessThan(4);
    if (w > 768) {
      // e a seguinte, sem precisar descer de novo
      await page.locator('.gantt-task').nth(n - 2).click();
      const depois2 = await scroller();
      expect(Math.abs(depois2.el - antes.el)).toBeLessThan(4);
    } else {
      // celular: o painel cobre a tela; ao fechar, a lista está onde estava
      await page.evaluate(() => closeTaskPanel(true));
      const depois2 = await scroller();
      expect(Math.abs(depois2.el - antes.el)).toBeLessThan(4);
      expect(Math.abs(depois2.win - antes.win)).toBeLessThan(4);
    }
    await page.screenshot({ path: 'test-results/projeto-rolagem-' + w + '.png' });
    void antes0;
  });
}
