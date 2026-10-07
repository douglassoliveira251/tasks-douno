import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import { gotoApp } from './helpers.js';

const require = createRequire(import.meta.url);

test.describe('Outlook: categorias e convites', () => {
  const { eventToGraphPayload } = require('../../api/outlook/sync-event.js');
  const base = { title: 'Reunião', date: '2026-10-08', endDate: '2026-10-08', startTime: '10:00', endTime: '11:00', allDay: false };

  test('categorias seguem as tags; sem tag usa o espaço', () => {
    expect(eventToGraphPayload({ ...base, categoryNames: ['Cliente', 'Urgente'], categoryName: 'Geral' }).categories).toEqual(['Cliente', 'Urgente']);
    expect(eventToGraphPayload({ ...base, categoryNames: [], categoryName: 'Geral' }).categories).toEqual(['Geral']);
  });

  test('convidados só entram com "Enviar convite" ligado', () => {
    const attendees = ['ana@empresa.com', 'invalido'];
    const off = eventToGraphPayload({ ...base, attendees, sendInvite: false });
    expect(off.attendees).toBeUndefined();
    const on = eventToGraphPayload({ ...base, attendees, sendInvite: true });
    expect(on.attendees).toEqual([{ emailAddress: { address: 'ana@empresa.com' }, type: 'required' }]);
  });

  test('formulário valida e guarda convidados e o interruptor', async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => { state.events = []; render(); openEventComposer(null, todayStr()); });
    await page.locator('#evTitle').fill('Alinhamento');

    await page.locator('#evAttendees').fill('ana@empresa.com, errado');
    await page.locator('#evSaveBtn').click();
    await expect(page.locator('#evAttendeesError')).toContainText('errado');
    expect(await page.evaluate(() => state.events.length)).toBe(0);

    await page.locator('#evAttendees').fill('Ana@Empresa.com; bia@empresa.com');
    await page.locator('label[for="evSendInvite"]').click();
    await page.locator('#evSaveBtn').click();

    const ev = await page.evaluate(() => state.events[0]);
    expect(ev.attendees).toEqual(['ana@empresa.com', 'bia@empresa.com']);
    expect(ev.sendInvite).toBe(true);
  });
});
