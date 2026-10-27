import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const today = todayStr();
  state.tasks = [];
  state.events = [{
    id: 'r1', title: 'Viagem de trabalho', date: addDaysStr(today, -12), endDate: addDaysStr(today, -10), allDay: true, startTime: '', endTime: '',
    categoryId: state.categories[0].id, tagIds: [], recurrence: 'weekly', recurrenceInterval: 2, recurrenceBaseDate: addDaysStr(today, -12),
    remindBefore: 0, linkedTaskId: null, description: '', createdAt: Date.now(),
  }];
  currentView = 'dashboard';
  render();
};

test('Avisar antes: chips, prévia das próximas repetições e aviso no sino e na visão geral', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(seed);

  // sem aviso: nada aparece
  expect(await page.evaluate(() => eventReminders(state.events, todayStr()).length)).toBe(0);

  // abre a janela Repetir e escolhe 2 dias
  await page.evaluate(() => {
    const b = document.createElement('button'); b.id = 'fakeAnchor'; document.body.appendChild(b);
    openRecurrencePortal(b, state.events[0], () => {});
  });
  await expect(page.locator('.rec-remind')).toBeVisible();
  await page.locator('.rec-chip[data-rb="2"]').click();
  await expect(page.locator('.rec-occ')).toHaveCount(3);
  expect(await page.evaluate(() => state.events[0].remindBefore)).toBe(2);

  // a repetição mais próxima começa em 2 dias (12 dias atrás + 14)
  const r = await page.evaluate(() => {
    const t = todayStr();
    const at = n => eventReminders(state.events, addDaysStr(t, n)).length;
    return { hoje: at(0), antes: at(-1), noDia: at(2), seguinte: at(1) };
  });
  expect(r.hoje).toBe(1);   // início daqui a 2 dias, aviso já ativo
  expect(r.noDia).toBe(0);  // no dia da repetição vira "Agenda de hoje"
  expect(r.antes).toBe(0); // ainda a 3 dias: fora da janela
  expect(r.seguinte).toBe(1);

  await page.evaluate(() => { currentView = 'dashboard'; render(); });
  await expect(page.locator('.rs-card', { hasText: 'Retomar hoje' }).first()).toContainText('Viagem de trabalho');
  await page.evaluate(() => { updateNotifBadge(); renderNotifDropdown(); });
  await expect(page.locator('#notifDropdown')).toContainText('Avisos de agenda');
});
