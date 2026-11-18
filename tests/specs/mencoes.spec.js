import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const c = state.categories[0].id, hoje = todayStr();
  const t = (id, short, title, o = {}) => Object.assign({ id, shortId: short, title, done: false, status: 'em_andamento', priority: 'media', dueDate: addDaysStr(hoje, 2), dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1, recurrence: 'none' }, o);
  state.tasks = [t('m1', '0001', 'Fechamento de novembro'), t('m2', '0042', 'Conciliação bancária - Matriz'), t('m3', '0057', 'Provisão de férias - ajuste'), t('m4', '0031', 'Conferir impostos retidos', { done: true, status: 'concluida' })];
  activeTaskId = 'm1'; creatingNewTask = false; render();
};

for (const [nome, vp] of [['desktop', { width: 1280, height: 800 }], ['celular', { width: 390, height: 844 }]]) {
  test(`@ na descrição (${nome}): lista filtra por nome e número, escolher vira chip que abre a tarefa`, async ({ page }) => {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    const desc = page.locator('#tpDesc');
    await desc.click();
    await desc.pressSequentially('Depende de @conc');
    const pop = page.locator('.men-pop');
    await expect(pop).toBeVisible();
    await expect(pop.locator('.men-r')).toHaveCount(1);
    await expect(pop.locator('.men-r').first()).toContainText('#0042');
    await page.screenshot({ path: `test-results/mencoes-pop-${nome}.png` });
    // pelo número: 0057; a tarefa aberta (0001) não aparece
    await desc.fill('Ver @0');
    await expect(pop.locator('.men-r')).toHaveCount(3); // 0042, 0057, 0031 (a própria 0001 fica de fora)
    await desc.fill('Ver @0057');
    await expect(pop.locator('.men-r')).toHaveCount(1);
    await desc.press('Enter');
    await expect(pop).toHaveCount(0);
    expect(await desc.inputValue()).toBe('Ver @[#0057 Provisão de férias - ajuste] ');
    // sair do campo: aparece o texto com o chip, e a descrição foi salva
    await page.locator('#tpName').evaluate(el => el.blur());
    await page.locator('.tp-label', { hasText: 'Descrição' }).click();
    const view = page.locator('#tpDescView');
    await expect(view).toBeVisible();
    await expect(view.locator('.men')).toContainText('Provisão de férias - ajuste');
    await page.screenshot({ path: `test-results/mencoes-chip-${nome}.png` });
    expect(await page.evaluate(() => state.tasks[0].description)).toContain('@[#0057 ');
    // clicar fora do chip volta a editar
    await view.click({ position: { x: 4, y: 4 } });
    await expect(page.locator('#tpDesc')).toBeVisible();
    await page.locator('#tpName').evaluate(el => el.blur());
    await page.locator('#tpDesc').evaluate(el => el.blur());
    // clicar no chip abre a tarefa citada
    await page.locator('#tpDescView .men').click();
    await expect(page.locator('#tpName')).toHaveValue('Provisão de férias - ajuste');
  });
}

test('@ no comentário: Enter escolhe da lista (não envia), depois envia e o chip abre a tarefa; Esc fecha a lista', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  const ta = page.locator('#tpNewComment');
  await ta.click();
  await ta.pressSequentially('Aguardando @conc');
  await expect(page.locator('.men-pop')).toBeVisible();
  await ta.press('Escape');
  await expect(page.locator('.men-pop')).toHaveCount(0);
  await ta.press('Backspace');
  await ta.pressSequentially('c');
  await expect(page.locator('.men-pop .men-r')).toHaveCount(1);
  await ta.press('Enter');
  expect(await page.evaluate(() => state.tasks[0].comments.length)).toBe(0); // só escolheu o item
  expect(await ta.inputValue()).toBe('Aguardando @[#0042 Conciliação bancária - Matriz] ');
  await ta.press('Enter');
  await expect(page.locator('#tpCommentList .men')).toContainText('Conciliação bancária - Matriz');
  expect(await page.evaluate(() => state.tasks[0].comments[0].text)).toContain('@[#0042 ');
  await page.screenshot({ path: 'test-results/mencoes-comentario.png' });
  // editar o comentário mostra o texto cru; salvar volta ao chip
  await page.locator('.tp-comment-edit').click();
  await expect(page.locator('.tp-comment-text')).toContainText('@[#0042');
  await page.locator('.tp-comment-edit').click();
  await expect(page.locator('#tpCommentList .men')).toHaveCount(1);
  await page.locator('#tpCommentList .men').click();
  await expect(page.locator('#tpName')).toHaveValue('Conciliação bancária - Matriz');
});

test('@ cita tarefa que foi removida: chip fica cinza e não abre nada', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  await page.evaluate(() => { state.tasks[0].description = 'Veja @[#0099 Tarefa que sumiu] e @[#0042 nome antigo]'; render(); });
  const view = page.locator('#tpDescView');
  await expect(view.locator('.men.gone')).toContainText('Tarefa que sumiu');
  await expect(view.locator('.men:not(.gone)')).toContainText('Conciliação bancária - Matriz'); // mostra o nome atual
});
