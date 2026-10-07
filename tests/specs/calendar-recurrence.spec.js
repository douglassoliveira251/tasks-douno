import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Agendas recorrentes', () => {
  test('calcula as ocorrências por dia, semana, mês e ano', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    const r = await page.evaluate(() => {
      const base = { id: 'e', date: '2026-01-31', recurrenceInterval: 1 };
      const on = (ev, d) => eventOccursOn(ev, d);
      return {
        none: on({ ...base, recurrence: 'none' }, '2026-02-01'),
        start: on({ ...base, recurrence: 'daily' }, '2026-01-31'),
        before: on({ ...base, recurrence: 'daily' }, '2026-01-30'),
        daily: on({ ...base, recurrence: 'daily' }, '2026-02-03'),
        every2days: [on({ ...base, recurrence: 'daily', recurrenceInterval: 2 }, '2026-02-02'), on({ ...base, recurrence: 'daily', recurrenceInterval: 2 }, '2026-02-03')],
        weekly: [on({ ...base, recurrence: 'weekly' }, '2026-02-07'), on({ ...base, recurrence: 'weekly' }, '2026-02-08')],
        // dia 31 em mês curto cai no último dia
        monthlyShort: on({ ...base, recurrence: 'monthly' }, '2026-02-28'),
        monthlyLong: on({ ...base, recurrence: 'monthly' }, '2026-03-31'),
        monthlyOther: on({ ...base, recurrence: 'monthly' }, '2026-03-30'),
        yearly: [on({ ...base, recurrence: 'yearly' }, '2027-01-31'), on({ ...base, recurrence: 'yearly' }, '2027-02-28')],
        ended: on({ ...base, recurrence: 'daily', recurrenceEndDate: '2026-02-05' }, '2026-02-06'),
        endedInside: on({ ...base, recurrence: 'daily', recurrenceEndDate: '2026-02-05' }, '2026-02-05'),
      };
    });
    expect(r.none).toBe(false);
    expect(r.start).toBe(true);
    expect(r.before).toBe(false);
    expect(r.daily).toBe(true);
    expect(r.every2days).toEqual([true, false]);
    expect(r.weekly).toEqual([true, false]);
    expect(r.monthlyShort).toBe(true);
    expect(r.monthlyLong).toBe(true);
    expect(r.monthlyOther).toBe(false);
    expect(r.yearly).toEqual([true, false]);
    expect(r.ended).toBe(false);
    expect(r.endedInside).toBe(true);
  });

  test('agenda semanal aparece nos dias seguintes do calendário (modo Dia)', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      const today = todayStr();
      state.events = [{
        id: 'e1', title: 'Reunião semanal', date: addDaysStr(today, -14), endDate: addDaysStr(today, -14),
        startTime: '10:00', endTime: '11:00', allDay: false, categoryId: cat, tagIds: [],
        recurrence: 'weekly', recurrenceInterval: 1, recurrenceBaseDate: addDaysStr(today, -14),
        linkedTaskId: null, description: '', createdAt: Date.now(),
      }];
      currentView = 'calendar';
      calendarView = 'day';
      calendarFocusDate = today;
      render();
    });
    // passou 2 semanas: hoje é uma ocorrência
    await expect(page.locator('.cal-day-row')).toHaveCount(1);
    await expect(page.locator('.cal-day-row')).toContainText('Reunião semanal');

    // amanhã não tem
    await page.evaluate(() => { calendarFocusDate = addDaysStr(todayStr(), 1); render(); });
    await expect(page.locator('.cal-day-row')).toHaveCount(0);

    // daqui a 7 dias tem de novo
    await page.evaluate(() => { calendarFocusDate = addDaysStr(todayStr(), 7); render(); });
    await expect(page.locator('.cal-day-row')).toHaveCount(1);
  });

  test('criar agenda recorrente pelo formulário gera as próximas ocorrências', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => { state.events = []; calendarView = 'day'; calendarFocusDate = todayStr(); render(); });

    await page.evaluate(() => openEventComposer(null, todayStr()));
    await page.locator('#evTitle').fill('Corrida');
    await page.locator('#evRecurrenceTrigger').click();
    await page.locator('.recurrence-toggle-row').click();
    await page.locator('#evSaveBtn').click();

    const saved = await page.evaluate(() => state.events[0]);
    expect(saved.recurrence).toBe('daily');
    expect(saved.recurrenceBaseDate).toBe(saved.date);

    await page.evaluate(() => { calendarFocusDate = addDaysStr(todayStr(), 3); render(); });
    await expect(page.locator('.cal-day-row')).toContainText('Corrida');
  });
});

test.describe('Notificações por espaço', () => {
  test('o sino só conta tarefas e agendas do espaço selecionado', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const counts = await page.evaluate(() => {
      if(state.categories.length < 2) state.categories.push({ id: 'cat_b', name: 'Outro', color: '#9B5DE5' });
      const [a, b] = [state.categories[0].id, state.categories[1].id];
      const today = todayStr();
      const t = (id, cat, due) => ({ id, title: id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: due, dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '' });
      const ev = (id, cat) => ({ id, title: id, date: today, endDate: today, startTime: '10:00', endTime: '11:00', allDay: false, categoryId: cat, tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: Date.now() });
      state.tasks = [t('a1', a, today), t('a2', a, addDaysStr(today, -1)), t('b1', b, today)];
      state.events = [ev('ea', a), ev('eb', b)];
      activeCategoryFilter = null;
      const all = computeNotifItems();
      activeCategoryFilter = a;
      const onlyA = computeNotifItems();
      activeCategoryFilter = b;
      const onlyB = computeNotifItems();
      const n = x => x.overdueTasks.length + x.todayTasks.length + x.todayEvents.length;
      return { hasSecondSpace: !!b, all: n(all), onlyA: n(onlyA), onlyB: n(onlyB) };
    });
    expect(counts.hasSecondSpace).toBe(true);
    expect(counts.all).toBe(5);
    expect(counts.onlyA).toBe(3);
    expect(counts.onlyB).toBe(2);
  });
});
