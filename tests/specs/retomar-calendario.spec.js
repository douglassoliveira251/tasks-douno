import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = (off) => {
  const c = state.categories[0].id, hoje = todayStr(), follow = addDaysStr(hoje, off);
  state.tasks = [{ id: 'rc1', title: 'Pesquisar mão de obra', done: false, status: 'em_andamento', priority: 'media', dueDate: addDaysStr(hoje, 3), dueTime: '08:00', startDate: hoje, followUpDate: follow, categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'none' }];
  activeTaskId = 'rc1'; render();
};

/* o dia pode cair no mês seguinte e não aparecer na grade aberta: avança o mês antes de clicar */
async function escolherDia(page, ymd) {
  const dia = page.locator(`.modal.tp-fcal button[data-d="${ymd}"]`);
  if (!(await dia.count())) await page.locator('.modal.tp-fcal [data-nav="1"]').click();
  await dia.click();
}

test('Retomar em: menu tem 30 dias; Personalizada abre o calendário do app (Cancelar / OK); Remover retomada limpa', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed, 2);
  await page.locator('#tpFollowTrigger').click();
  await expect(page.locator('.tp-follow-opt[data-days="30"]')).toContainText('30 dias');
  await page.locator('#tpFollowCustom').click();
  const cal = page.locator('.modal.tp-fcal');
  await expect(cal).toBeVisible();
  await page.screenshot({ path: 'test-results/retomar-calendario-m.png' });
  await expect(page.locator('input[type="date"]#tpFollowDate')).toHaveCount(1); // campo escondido segue no DOM
  // Cancelar não muda nada
  await page.locator('.tp-fcal-day').nth(20).click();
  await page.locator('#tpFcalCancel').click();
  await expect(cal).toBeHidden();
  expect(await page.evaluate(() => state.tasks[0].followUpDate)).toBe(await page.evaluate(() => addDaysStr(todayStr(), 2)));
  // escolhe um dia e OK salva
  await page.locator('#tpFollowTrigger').click();
  await page.locator('#tpFollowCustom').click();
  const alvo = await page.evaluate(() => addDaysStr(todayStr(), 10));
  await escolherDia(page, alvo);
  await page.locator('#tpFcalOk').click();
  await expect(cal).toBeHidden();
  expect(await page.evaluate(() => state.tasks[0].followUpDate)).toBe(alvo);
  await page.screenshot({ path: 'test-results/retomar-cal-m.png' });
  // 30 dias pelo menu
  await page.locator('#tpFollowTrigger').click();
  await page.locator('.tp-follow-opt[data-days="30"]').click();
  expect(await page.evaluate(() => state.tasks[0].followUpDate)).toBe(await page.evaluate(() => addDaysStr(todayStr(), 30)));
  // limpar fica no menu
  await page.locator('#tpFollowTrigger').click();
  await page.locator('.tp-follow-opt[data-clear="1"]').click();
  expect(await page.evaluate(() => state.tasks[0].followUpDate)).toBeNull();
});

test('Prazo no celular: a data cabe no campo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed, 10);
  const tr = page.locator('#tpFollowTrigger .tp-follow-trigger-label');
  expect(await tr.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true); // 'em 10 dias' sem cortar
  const d = page.locator('#tpDate');
  await expect(d).toBeVisible();
  const fits = await d.evaluate(e => e.scrollWidth <= e.clientWidth + 1);
  expect(fits).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/prazo-cabe-m.png' });
});

test('Prazo: abre o calendário do app (Cancelar / OK / Remover prazo), sem o nativo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed, 2);
  const antes = await page.evaluate(() => state.tasks[0].dueDate);
  await page.locator('#tpDate').locator('..').click({ position: { x: 20, y: 8 } });
  const cal = page.locator('.modal.tp-fcal');
  await expect(cal).toBeVisible();
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).not.toBe('tpDate'); // nada de seletor nativo
  await expect(cal.locator('.tp-fcal-t')).toHaveText('Prazo');
  await expect(cal.locator('#tpFcalClear')).toHaveText('Remover prazo');
  // Cancelar não muda
  await page.locator('#tpFcalCancel').click();
  await expect(cal).toBeHidden();
  expect(await page.evaluate(() => state.tasks[0].dueDate)).toBe(antes);
  // escolhe um dia e OK
  await page.locator('#tpDate').locator('..').click({ position: { x: 20, y: 8 } });
  const alvo = await page.evaluate(() => addDaysStr(todayStr(), 9));
  await escolherDia(page, alvo);
  await page.locator('#tpFcalOk').click();
  await expect(cal).toBeHidden();
  expect(await page.evaluate(() => state.tasks[0].dueDate)).toBe(alvo);
  // remover prazo pelo próprio calendário
  await page.locator('#tpDate').locator('..').click({ position: { x: 20, y: 8 } });
  await page.locator('#tpFcalClear').click();
  expect(await page.evaluate(() => state.tasks[0].dueDate)).toBeNull();
  // a hora sai junto com a data, no dado e nos campos
  expect(await page.evaluate(() => state.tasks[0].dueTime)).toBe('');
  await expect(page.locator('#tpDate')).toHaveValue('');
  await expect(page.locator('#tpTime')).toHaveValue('');
});

test('Calendário: dias do mês vizinho aparecem claros; clicar escolhe a data e abre aquele mês', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed, 2);
  await page.locator('#tpFollowTrigger').click();
  await page.locator('#tpFollowCustom').click();
  const cal = page.locator('.modal.tp-fcal');
  // abre em um mês cujo fim não fecha a semana: 30/11/2026 cai numa segunda, então sobram dias de dezembro
  await page.evaluate(() => document.querySelector('#tpFcalOv'));
  const total = await cal.locator('.tp-fcal-day, .tp-fcal-oth').count();
  expect(total % 7).toBe(0);
  const outros = await cal.locator('.tp-fcal-oth').count();
  if (outros) {
    const viewAntes = await cal.locator('.tp-fcal-h b').innerText();
    const alvo = cal.locator('.tp-fcal-oth:not([disabled])').last();
    const ymd = await alvo.getAttribute('data-d');
    await page.screenshot({ path: 'test-results/calendario-vizinho-m.png' });
    await alvo.click();
    await expect(cal.locator('.tp-fcal-h b')).not.toHaveText(viewAntes);
    await expect(cal.locator(`.tp-fcal-day.sel[data-d="${ymd}"]`)).toHaveCount(1);
    await page.locator('#tpFcalOk').click();
    expect(await page.evaluate(() => state.tasks[0].followUpDate)).toBe(ymd);
    // reabrir: abre no mês da data escolhida
    await page.locator('#tpFollowTrigger').click();
    await page.locator('#tpFollowCustom').click();
    await expect(cal.locator(`.tp-fcal-day.sel[data-d="${ymd}"]`)).toHaveCount(1);
  }
});
