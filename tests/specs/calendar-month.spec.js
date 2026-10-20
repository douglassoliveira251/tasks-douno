import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Calendário — mês com painel do dia', () => {
  test('clicar num dia mostra agendas e tarefas dele; duplo clique cria agenda', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => {
      const t = todayStr();
      state.categories = [{ id: 'c1', name: 'Geral', color: '#2F7D5B' }];
      const ev = (id, title, d, s, e) => ({ id, title, date: d, endDate: d, startTime: s, endTime: e, categoryId: 'c1', description: '', attendees: ['a@b.com'], recurrence: 'none', createdAt: 1, updatedAt: 1 });
      state.events = [ev('e1', 'Reunião A', t, '09:00', '10:00'), ev('e2', 'Almoço B', t, '12:30', '13:30'), ev('e3', 'Outro dia', addDaysStr(t, 1), '08:00', '09:00')];
      state.tasks = [{ id: 't1', title: 'Tarefa do dia', done: false, status: 'nao_iniciado', priority: 'media', dueDate: t, dueTime: '17:00', categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
      calendarView = 'month'; calendarFocusDate = t; calSelectedDate = null; render();
    });
    const panel = page.locator('.cal-day-panel');
    await expect(panel.locator('.cal-day-item')).toHaveCount(3);
    await expect(panel).toContainText('2 agendas · 1 tarefa');
    await expect(page.locator('.cal-month-cell.today .cal-month-dots i')).toHaveCount(2);

    // dia seguinte: 1 agenda, sem tarefas
    const next = await page.evaluate(() => addDaysStr(todayStr(), 1));
    const cell = page.locator(`.cal-month-cell[data-date="${next}"]`);
    if (await cell.count() && (await page.evaluate(n => n.slice(0, 7) === todayStr().slice(0, 7), next))) {
      await cell.click();
      await expect(panel.locator('.cal-day-item')).toHaveCount(1);
      await expect(panel).toContainText('Outro dia');
    }

    // clicar na agenda abre o editor
    await page.evaluate(() => { calSelectedDate = todayStr(); render(); });
    await panel.locator('[data-event-id="e1"]').click();
    await expect(page.locator('#evTitle')).toHaveValue('Reunião A');
  });
});
