import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const c = state.categories[0].id, hoje = todayStr();
  const t = (id, short, title, o = {}) => Object.assign({ id, shortId: short, title, done: false, status: 'em_andamento', priority: 'media', dueDate: addDaysStr(hoje, 2), dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'none' }, o);
  state.tasks = [t('r1', '0001', 'Fechamento de novembro'), t('r2', '0042', 'Conciliação bancária - Matriz'), t('r3', '0057', 'Provisão de férias - ajuste'), t('r4', '0031', 'Conferir impostos retidos', { done: true, status: 'concluida' })];
  state.notes = [{ id: 'n1', title: 'Checklist do fechamento', linkedTaskId: 'r1', updatedAt: Date.now(), createdAt: 1, content: '', plainText: '' }, { id: 'n2', title: 'Nota solta', linkedTaskId: null, updatedAt: Date.now(), createdAt: 1, content: '', plainText: '' }];
  state.libItems = [{ id: 'li1', type: 'link', title: 'Manual do ERP', url: 'https://erp.exemplo.com/manual', createdAt: 1, updatedAt: 1 }];
  state.events = [{ id: 'e1', title: 'Reunião de fechamento', date: addDaysStr(hoje, 2), startTime: '10:00', endTime: '11:00', linkedTaskId: 'r1', recurrence: 'none', createdAt: 1 }];
  activeTaskId = 'r1'; creatingNewTask = false; render();
};

for (const [nome, vp] of [['desktop', { width: 1280, height: 800 }], ['celular', { width: 390, height: 844 }]]) {
  test(`abas do painel (${nome}): Detalhamento e Relacionados; lista de notas, agenda e tarefas com ×`, async ({ page }) => {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    const tabs = page.locator('#tpTabs');
    await expect(tabs.locator('[data-tab="det"]')).toHaveClass(/on/);
    await expect(page.locator('#tpPaneDet')).toBeVisible();
    await expect(page.locator('#tpPaneRel')).toBeHidden();
    await expect(tabs.locator('[data-tab="rel"] .n')).toHaveText('2'); // nota + agenda
    await tabs.locator('[data-tab="rel"]').click();
    await expect(page.locator('#tpPaneDet')).toBeHidden();
    await expect(page.locator('#tpRelTasks')).toBeVisible();
    await expect(page.locator('#tpRelTasks')).toContainText('Nenhuma tarefa relacionada');
    await expect(page.locator('#tpRelDocs .rl-row')).toHaveCount(1);
    await expect(page.locator('#tpAgendaField .rl-ag')).toHaveCount(1);
    // Vincular tarefas pelo seletor
    await page.locator('#tpAddRelTask').click();
    await page.locator('#trelQ').fill('conc');
    await page.locator('.pdoc-pr', { hasText: 'Conciliação bancária' }).locator('input').check();
    await page.locator('#trelOk').click();
    await expect(page.locator('#tpRelTasks .rl-row')).toHaveCount(1);
    await expect(page.locator('#tpPaneRel')).toBeVisible(); // continua na aba
    await expect(page.locator('#tpRelTasks .rl-row')).toContainText('#0042');
    await page.screenshot({ path: `test-results/relacionados-${nome}.png` });
    // sem overflow horizontal
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    // o vínculo é guardado só numa tarefa, mas aparece nas duas
    expect(await page.evaluate(() => state.tasks[1].relatedTaskIds)).toBeUndefined();
    await page.locator('#tpRelTasks .rl-row').click();
    await expect(page.locator('#tpName')).toHaveValue('Conciliação bancária - Matriz');
    await expect(page.locator('#tpTabs [data-tab="det"]')).toHaveClass(/on/); // outra tarefa abre em Detalhamento
    await page.locator('#tpTabs [data-tab="rel"]').click();
    await expect(page.locator('#tpRelTasks .rl-row')).toContainText('Fechamento de novembro');
    // × tira o vínculo dos dois lados e não apaga a tarefa
    await page.locator('#tpRelTasks .rl-x').click();
    await expect(page.locator('#tpRelTasks')).toContainText('Nenhuma tarefa relacionada');
    expect(await page.evaluate(() => state.tasks.length)).toBe(4);
    expect(await page.evaluate(() => state.tasks.every(t => !(t.relatedTaskIds || []).length))).toBe(true);
  });
}

test('× em nota e agenda só desfaz o vínculo; vincular item da Biblioteca e nota solta', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  await page.locator('#tpTabs [data-tab="rel"]').click();
  await page.locator('#tpAddDocBtn').click();
  await page.locator('.pdoc-pr', { hasText: 'Manual do ERP' }).locator('input').check();
  await page.locator('#trelOk').click();
  await expect(page.locator('#tpRelDocs .rl-row')).toHaveCount(2);
  await expect(page.locator('#tpRelDocs')).toContainText('Link · erp.exemplo.com');
  await page.locator('#tpAddDocBtn').click();
  await page.locator('.pdoc-tabs [data-t="note"]').click();
  await page.locator('.pdoc-pr', { hasText: 'Nota solta' }).locator('input').check();
  await page.locator('#trelOk').click();
  await expect(page.locator('#tpRelDocs .rl-row')).toHaveCount(3);
  // × na nota ligada pela própria nota: limpa linkedTaskId, a nota continua existindo
  await page.locator('#tpRelDocs .rl-row', { hasText: 'Checklist do fechamento' }).locator('.rl-x').click();
  await expect(page.locator('#tpRelDocs .rl-row')).toHaveCount(2);
  expect(await page.evaluate(() => state.notes.find(n => n.id === 'n1').linkedTaskId)).toBeNull();
  // × no item da Biblioteca: remove só da lista da tarefa
  await page.locator('#tpRelDocs .rl-row', { hasText: 'Manual do ERP' }).locator('.rl-x').click();
  expect(await page.evaluate(() => state.libItems.length)).toBe(1);
  // × na agenda
  await page.locator('#tpAgendaField .rl-x').click();
  await expect(page.locator('#tpAgendaField')).toContainText('Nenhuma agenda relacionada');
  expect(await page.evaluate(() => state.events.length)).toBe(1);
  expect(await page.evaluate(() => state.events[0].linkedTaskId)).toBeNull();
});

test('@ na descrição e no comentário vira tarefa relacionada ao salvar, e o @ aparece como link simples', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  const desc = page.locator('#tpDesc');
  await desc.click();
  await desc.pressSequentially('Depende de @0042');
  await desc.press('Enter');
  await page.locator('#tpDesc').evaluate(el => el.blur());
  await expect(page.locator('#tpTabs [data-tab="rel"] .n')).toHaveText('3');
  const ta = page.locator('#tpNewComment');
  await ta.click();
  await ta.pressSequentially('Ver @0057');
  await ta.press('Enter'); await ta.press('Enter');
  await expect(page.locator('#tpTabs [data-tab="rel"] .n')).toHaveText('4');
  await page.locator('#tpTabs [data-tab="rel"]').click();
  await expect(page.locator('#tpRelTasks .rl-row')).toHaveCount(2);
  // link simples: sem borda e sem fundo
  await page.locator('#tpTabs [data-tab="det"]').click();
  const men = page.locator('#tpCommentList .men');
  await expect(men).toHaveText('@Provisão de férias - ajuste');
  const css = await men.evaluate(el => { const s = getComputedStyle(el); return { b: s.borderTopWidth, bg: s.backgroundColor }; });
  expect(css.b).toBe('0px');
  expect(css.bg).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({ path: 'test-results/relacionados-arroba.png' });
  // tirar o vínculo
  await page.locator('#tpTabs [data-tab="rel"]').click();
  await page.locator('#tpRelTasks .rl-x').first().click();
  await expect(page.locator('#tpRelTasks .rl-row')).toHaveCount(1);
});
