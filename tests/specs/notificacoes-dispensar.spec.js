import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const t = todayStr();
  state.categories = [{ id: 'c1', name: 'Geral', color: '#2F7D5B' }];
  const ev = (id, title, s) => ({ id, title, date: t, endDate: t, startTime: s, endTime: '23:00', categoryId: 'c1', description: '', attendees: [], recurrence: 'none', createdAt: 1, updatedAt: 1 });
  state.events = [ev('e1', 'Reunião A', '09:00'), ev('e2', 'Almoço B', '12:30')];
  state.tasks = [
    { id: 't1', title: 'Atrasada', done: false, status: 'nao_iniciado', priority: 'media', dueDate: addDaysStr(t, -2), categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 },
    { id: 't2', title: 'De hoje', done: false, status: 'nao_iniciado', priority: 'media', dueDate: t, categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 },
  ];
  state.notifDismissed = undefined;
  currentView = 'tasks'; render();
};

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`notificações (${vp.width}px): só a agenda de hoje tem "x"; some por hoje, desfaz e volta no dia seguinte`, async ({ page }) => {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.click('#notificationBtn');
    const dd = page.locator('#notifDropdown');
    await expect(dd).toContainText('Reunião A');
    // tarefas (atrasada e de hoje) ficam fixas: sem "x"
    await expect(dd.locator('.search-result-row[data-kind="tasks"] .notif-x')).toHaveCount(0);
    await expect(dd.locator('.search-result-row[data-kind="calendar"] .notif-x')).toHaveCount(2);
    await expect(page.locator('#notifBadge')).toHaveText('4');
    // dispensar uma agenda
    await dd.locator('.notif-x[data-dismiss="e1"]').click();
    await expect(dd).not.toContainText('Reunião A');
    await expect(dd).toContainText('Almoço B');
    await expect(page.locator('#notifBadge')).toHaveText('3');
    expect(await page.evaluate(() => state.events.some(e => e.id === 'e1'))).toBe(true); // só esconde o aviso
    expect(await page.evaluate(() => state.notifDismissed[todayStr()])).toEqual(['e1']);
    // desfazer
    await page.locator('.toast, #toast, [class*="toast"]').getByText('Desfazer').first().click();
    await expect(dd).toContainText('Reunião A');
    await expect(page.locator('#notifBadge')).toHaveText('4');
    // clicar em Desfazer (fora do menu) pode fechar o menu: reabre se preciso
    if (!(await dd.isVisible())) await page.click('#notificationBtn');
    // dispensar todas
    await dd.locator('.notif-clear').click();
    await expect(dd).not.toContainText('Almoço B');
    await expect(page.locator('#notifBadge')).toHaveText('2');
    await expect(dd).toContainText('Atrasada');
    await expect(dd).toContainText('De hoje');
    // dia seguinte: o que foi dispensado em outro dia não vale mais
    await page.evaluate(() => { const y = addDaysStr(todayStr(), -1); state.notifDismissed = { [y]: ['e1', 'e2'] }; updateNotifBadge(); });
    await expect(page.locator('#notifBadge')).toHaveText('4');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
  });
}
