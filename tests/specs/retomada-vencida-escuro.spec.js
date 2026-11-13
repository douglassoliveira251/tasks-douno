import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('Retomada vencida no escuro: fundo translúcido e letra rosa; o prazo vencido continua sólido; no claro não muda', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const t = todayStr(), c = state.categories[0].id;
    state.tasks = [{ id: 't1', title: 'Renovar contrato', done: false, status: 'nao_iniciado', priority: 'media', dueDate: addDaysStr(t, -1), dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5001, recurrence: 'none', startDate: addDaysStr(t, -9), followUpDate: addDaysStr(t, -3) }];
    document.documentElement.setAttribute('data-theme', 'dark');
    currentView = 'tasks'; activeTaskId = null; render();
  });
  const cor = (sel) => page.evaluate((s) => { const e = document.querySelector(s); const cs = getComputedStyle(e); return [cs.backgroundColor, cs.color]; }, sel);
  const ret = await cor('.task-alert-ret.over');
  expect(ret[0]).toBe('rgba(255, 107, 129, 0.16)');
  expect(ret[1]).toBe('rgb(255, 154, 170)');
  const prazo = await cor('.task-status-pill.overdue');
  expect(prazo[0]).toBe('rgb(168, 54, 74)'); // sólido, diferente da retomada
  await page.screenshot({ path: 'test-results/retomada-escuro.png', clip: { x: 20, y: 120, width: 1000, height: 200 } });
  // modo claro: continua o esquema antigo (fundo rosa claro, letra vermelha)
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); render(); });
  const claro = await cor('.task-alert-ret.over');
  expect(claro[0]).not.toBe('rgba(255, 107, 129, 0.16)');
});
