import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

for (const th of ['light', 'dark']) {
  test(`Linha do tempo: o hover da tarefa pinta a linha inteira, inclusive o nome (${th})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page, { view: 'projects' });
    await page.evaluate((th) => {
      const t = todayStr(), c = state.categories[0].id;
      state.projects = [{ id: 'p1', name: 'Reforma', categoryId: c, stages: [{ id: 's1', name: 'Obra' }], startDate: t, endDate: addDaysStr(t, 20), createdAt: 1 }];
      state.tasks = [{ id: 'a', title: 'Demolição', done: false, status: 'nao_iniciado', priority: 'media', startDate: t, dueDate: addDaysStr(t, 9), dueTime: '', categoryId: c, projectId: 'p1', stageId: 's1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none' }];
      document.documentElement.setAttribute('data-theme', th);
      currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render();
    }, th);
    const row = page.locator('.gantt-task').first();
    const bg = (sel) => row.locator(sel).evaluate(e => getComputedStyle(e).backgroundColor);
    const antesNome = await bg('.gl');
    await row.hover();
    await page.waitForTimeout(150);
    const nome = await bg('.gl');
    const rowBg = await row.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(nome).not.toBe(antesNome);      // o nome também muda no hover
    expect(nome).toBe(rowBg);               // e fica igual ao resto da linha
    // hover sobre o próprio nome também vale
    await page.mouse.move(0, 0); await page.waitForTimeout(100);
    await row.locator('.gantt-task-name').hover();
    expect(await bg('.gl')).toBe(rowBg);
    await page.screenshot({ path: 'test-results/hover-linha-' + th + '.png' });
  });
}
