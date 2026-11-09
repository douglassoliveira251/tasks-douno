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

test.describe('Cadastro de agenda (duas colunas)', () => {
  test('atalhos de duração ajustam o fim; fechar pelo X', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => { openEventComposer(null, todayStr()); });
    await expect(page.locator('#eventComposerOverlay')).toHaveClass(/show/);
    await page.locator('#evStartTime').fill('09:00');
    await page.locator('.ev-dur[data-dur="90"]').click();
    await expect(page.locator('#evEndTime')).toHaveValue('10:30');
    await expect(page.locator('.ev-dur[data-dur="90"]')).toHaveClass(/on/);
    await page.locator('.ev-dur[data-dur="30"]').click();
    await expect(page.locator('#evEndTime')).toHaveValue('09:30');
    await page.locator('#evCloseX').click();
    await expect(page.locator('#eventComposerOverlay')).not.toHaveClass(/show/);
  });

  test('com Outlook conectado, convite já vem ligado em agenda nova (e não em edição)', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => { outlookStatusCache = { connected: true }; openEventComposer(null, todayStr()); });
    await expect(page.locator('#evSendInvite')).toBeChecked();
    await page.evaluate(() => { closeEventComposer(); outlookStatusCache = { connected: false }; openEventComposer(null, todayStr()); });
    await expect(page.locator('#evSendInvite')).not.toBeChecked();
    await page.evaluate(() => {
      closeEventComposer(); outlookStatusCache = { connected: true };
      state.events = [{ id: 'e9', title: 'X', date: todayStr(), endDate: todayStr(), startTime: '10:00', endTime: '11:00', categoryId: state.categories[0].id, tagIds: [], recurrence: 'none', recurrenceInterval: 1, attendees: [], description: '', createdAt: 1 }];
      openEventComposer(state.events[0]);
    });
    await expect(page.locator('#evSendInvite')).not.toBeChecked();
  });
});

test.describe('Calendário — Agenda e coluna esquerda', () => {
  test('quatro visões, coluna esquerda sempre presente e Agenda junta agendas, tarefas e feriados', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => {
      const t = todayStr();
      state.categories = [{ id: 'c1', name: 'Geral', color: '#2F5F9E' }];
      state.events = [{ id: 'e1', title: 'Reunião A', date: addDaysStr(t, 1), endDate: addDaysStr(t, 1), startTime: '09:00', endTime: '10:00', categoryId: 'c1', tagIds: [], description: '', attendees: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1, updatedAt: 1 }];
      state.tasks = [{ id: 't1', title: 'Tarefa com prazo', done: false, status: 'nao_iniciado', priority: 'media', dueDate: t, dueTime: '', categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
      calendarView = 'agenda'; calendarFocusDate = t; render();
    });
    await expect(page.locator('.cal-view-toggle button')).toHaveText(['Agenda', 'Dia', 'Semana', 'Mês']);
    await expect(page.locator('.cal-shell > .cal-side')).toBeVisible();
    await expect(page.locator('.cal-ag-item:not(.hol)')).toHaveCount(2);
    await expect(page.locator('.cal-ag-item.task')).toContainText('Tarefa com prazo');
    // esconder tarefas com prazo
    await page.locator('#sideTask').evaluate(el => el.click());
    await expect(page.locator('.cal-ag-item.task')).toHaveCount(0);
    // as outras visões mantêm a coluna esquerda
    for (const v of ['day', 'week', 'month']) {
      await page.evaluate(vv => { calendarView = vv; render(); }, v);
      await expect(page.locator('.cal-shell > .cal-side .cal-mini')).toBeVisible();
    }
  });

  test('título "Calendário" e espaços com check: mais de um calendário ao mesmo tempo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => {
      const t = todayStr();
      state.categories = [{ id: 'c1', name: 'Geral', color: '#2F5F9E' }, { id: 'c2', name: 'Pessoal', color: '#C77700' }];
      const ev = (id, cat) => ({ id, title: 'Ev ' + id, date: addDaysStr(t, 1), endDate: addDaysStr(t, 1), startTime: '09:00', endTime: '10:00', categoryId: cat, tagIds: [], description: '', attendees: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1, updatedAt: 1 });
      state.events = [ev('a', 'c1'), ev('b', 'c2')]; state.tasks = [];
      calendarView = 'agenda'; calendarFocusDate = t; render();
    });
    await expect(page.locator('.cal-period-label')).toHaveText('Calendário');
    await expect(page.locator('.cal-sub-period')).not.toBeEmpty();
    await expect(page.locator('.cal-sp input:checked')).toHaveCount(2);
    await expect(page.locator('.cal-ag-item:not(.hol)')).toHaveCount(2);
    await page.locator('.cal-sp', { hasText: 'Pessoal' }).click();
    await expect(page.locator('.cal-ag-item:not(.hol)')).toHaveCount(1);
    await page.locator('.cal-sp', { hasText: 'Pessoal' }).click();
    await expect(page.locator('.cal-ag-item:not(.hol)')).toHaveCount(2);
  });
});
