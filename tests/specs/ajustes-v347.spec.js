import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* ---------- Calendário: horário clicado e início/fim ---------- */
test('Agenda (semana): clicar numa faixa abre o cadastro com o horário clicado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => { state.events = []; calendarView = 'week'; calendarFocusDate = todayStr(); render(); });
  const col = page.locator('.cal-week-daycol.today');
  await col.scrollIntoViewIfNeeded();
  const bb = await col.boundingBox();
  const hh = bb.height / 24;
  const alvoMin = 10 * 60 + 37; // clica em 10:37 → 10:30
  await page.evaluate(() => window.scrollTo(0, 0));
  const bb2 = await col.boundingBox();
  const vis = bb2.y + alvoMin / 60 * hh;
  await page.mouse.click(bb2.x + bb2.width / 2, vis);
  await expect(page.locator('#evStartTime')).toHaveValue('10:30');
  await expect(page.locator('#evEndTime')).toHaveValue('11:30');
});

test('Agenda (dia): clique na grade preenche o início e o fim (+1 h)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => { state.events = []; calendarView = 'day'; calendarFocusDate = todayStr(); render(); });
  const grid = page.locator('.cal-dayA-grid');
  const bb = await grid.boundingBox();
  // 56 px por hora: y = 14h37 => 14*56 + 37/60*56
  const y = bb.y + 14 * 56 + Math.round(37 / 60 * 56);
  await page.mouse.click(bb.x + bb.width / 2, y);
  await expect(page.locator('#evStartTime')).toHaveValue('14:30');
  await expect(page.locator('#evEndTime')).toHaveValue('15:30');
});

test('Agenda: mudar o início desloca o fim na mesma duração; o fim não fica antes do início', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => document.getElementById('calNewBtn') && document.getElementById('calNewBtn').click());
  await page.fill('#evStartTime', '09:00');
  await page.locator('#evStartTime').dispatchEvent('change');
  await page.fill('#evEndTime', '10:30');
  await page.locator('#evEndTime').dispatchEvent('change');
  // início 09:00 → 11:00: o fim vai para 12:30 (mesma duração de 1h30)
  await page.fill('#evStartTime', '11:00');
  await page.locator('#evStartTime').dispatchEvent('change');
  await expect(page.locator('#evEndTime')).toHaveValue('12:30');
  // início depois da meia-noite: passa para o dia seguinte
  await page.fill('#evStartTime', '23:30');
  await page.locator('#evStartTime').dispatchEvent('change');
  expect(await page.locator('#evEndDate').inputValue()).not.toBe(await page.locator('#evDate').inputValue());
  await expect(page.locator('#evEndTime')).toHaveValue('01:00');
  // fim antes do início é corrigido para o início
  await page.fill('#evStartTime', '15:00');
  await page.locator('#evStartTime').dispatchEvent('change');
  await page.fill('#evEndDate', await page.locator('#evDate').inputValue());
  await page.locator('#evEndDate').dispatchEvent('change');
  await page.fill('#evEndTime', '08:00');
  await page.locator('#evEndTime').dispatchEvent('change');
  await expect(page.locator('#evEndTime')).toHaveValue('15:00');
  // os campos de fim têm mínimo
  expect(await page.locator('#evEndDate').getAttribute('min')).toBe(await page.locator('#evDate').inputValue());
});

/* ---------- Notas: Ordenar persistente e sem bolinha ---------- */
test('Notas: Ordenar escolhe pela linha (sem seletor) e fica salvo depois de atualizar a página', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'notes' });
  await page.locator('.notes-filters [data-pop="sort"]').click();
  await expect(page.locator('.notes-filters input[name="notesSort"]')).toHaveCount(0);
  await expect(page.locator('.notes-filters [data-sort="updated"]')).toHaveClass(/on/);
  await page.locator('.notes-filters [data-sort="title"]').click();
  await expect(page.locator('.notes-filters [data-pop="sort"] b')).toHaveText('Título');
  expect(await page.evaluate(() => state.notesSort)).toBe('title');
  // grava no armazenamento local (o teste não tem nuvem) e recarrega
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  await page.reload();
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); currentView = 'notes'; render(); });
  await expect(page.locator('.notes-filters [data-pop="sort"] b')).toHaveText('Título');
});

/* ---------- Biblioteca: skill ---------- */
const SK = '# Skill de teste\n\nPrimeira linha sobre relatório.\nSegunda linha com Relatório de novo.\n\n## Outra parte\n\nO relatório final.\n';
const abrirSkill = async (page, w = 1280) => {
  await page.setViewportSize({ width: w, height: 900 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate((c) => { const cat = state.categories[0].id; state.libFolders = []; state.libItems = [{ id: 's1', type: 'skill', title: 'Minha skill', content: c, description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 }]; render(); }, SK);
  await page.locator('.lib-row .lib-tt').click();
};

test('Skill: busca dentro do texto marca os resultados, conta e anda entre eles (código e visualização)', async ({ page }) => {
  await abrirSkill(page);
  await expect(page.locator('#skCopy')).toHaveCount(0);
  // a busca vem antes do botão Excluir
  const ordem = await page.evaluate(() => { const bar = document.querySelector('.lib-dbar'); const kids = Array.from(bar.children).map(e => e.id || e.className); return [kids.findIndex(k => String(k).includes('lib-find')), kids.indexOf('skDel')]; });
  expect(ordem[0]).toBeGreaterThan(-1);
  expect(ordem[0]).toBeLessThan(ordem[1]);
  await page.fill('#skFind', 'relatório');
  await expect(page.locator('#skFindN')).toHaveText('1 de 3');
  await expect(page.locator('mark.lib-hit')).toHaveCount(3);
  await page.press('#skFind', 'Enter');
  await expect(page.locator('#skFindN')).toHaveText('2 de 3');
  await page.click('#skFindPrev');
  await expect(page.locator('#skFindN')).toHaveText('1 de 3');
  await page.screenshot({ path: 'test-results/skill-busca-d.png' });
  // troca de modo mantém a busca
  await page.locator('.lib-seg [data-mode="code"]').click();
  await expect(page.locator('#skFind')).toHaveValue('relatório');
  await expect(page.locator('mark.lib-hit')).toHaveCount(3);
  await page.fill('#skFind', 'zzzz');
  await expect(page.locator('#skFindN')).toHaveText('Nada');
  await page.fill('#skFind', '');
  await expect(page.locator('mark.lib-hit')).toHaveCount(0);
});

test('Skill: Excluir tem fundo vermelho e letra clara; menu da lista sem Copiar texto', async ({ page }) => {
  await abrirSkill(page);
  const cores = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('skDel')); return [s.backgroundColor, s.color]; });
  expect(cores[0]).toBe('rgb(192, 69, 58)');
  expect(cores[1]).toBe('rgb(255, 255, 255)');
  await page.locator('#libBack').click();
  await page.locator('[data-imenu="s1"]').click();
  await expect(page.locator('#taskMenuPortal [data-m="copy"]')).toHaveCount(0);
});

test('Biblioteca: trocar de espaço fecha a skill aberta de outro espaço', async ({ page }) => {
  await abrirSkill(page);
  await expect(page.locator('#skDel')).toBeVisible();
  const outro = await page.evaluate(() => { state.categories = state.categories.length > 1 ? state.categories : state.categories.concat([{ id: 'c9', name: 'Outro', color: '#B04A6F' }]); return state.categories.find(c => c.id !== state.libItems[0].categoryId).id; });
  await page.evaluate((id) => { currentView = 'tasks'; render(); activeCategoryFilter = id; currentView = 'library'; render(); }, outro);
  await expect(page.locator('#skDel')).toHaveCount(0);
  await expect(page.locator('.lib-row')).toHaveCount(0);
});
