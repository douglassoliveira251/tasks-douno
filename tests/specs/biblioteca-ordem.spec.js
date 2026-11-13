import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const c = state.categories[0].id;
  const l = (id, title, url, fav, u) => ({ id, type: 'link', title, url, favorite: fav, folderId: null, categoryId: c, createdAt: 1, updatedAt: u });
  state.libFolders = [
    { id: 'f1', name: 'Trabalho', parentId: null, categoryId: c, createdAt: 1 },
    { id: 'f2', name: 'Clientes', parentId: 'f1', categoryId: c, createdAt: 1 },
    { id: 'f3', name: 'Pessoal', parentId: null, categoryId: c, createdAt: 1 },
  ];
  state.libItems = [
    l('l1', 'GitHub', 'https://github.com', true, 10), l('l2', 'Vercel', 'https://vercel.com', true, 20), l('l3', 'Supabase', 'https://supabase.com', true, 30),
    { id: 's1', type: 'skill', title: 'Skill A', content: '# a', favorite: false, folderId: null, categoryId: c, createdAt: 1, updatedAt: 5 },
  ];
  state.libQuickOrder = undefined;
  render();
};
const arrastar = async (page, de, para) => {
  const a = await de.boundingBox(), b = await para.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  return b;
};

test('Biblioteca: arrastar a linha (pela alça) até uma coleção move o item; Esc cancela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(seed);
  // expande Trabalho para ver Clientes
  await page.locator('[data-toggle="f1"]').click();
  const grip = page.locator('.lib-row[data-item="l1"] .lib-rgrip');
  await expect(grip).toBeVisible();
  // cancelar com Esc
  await arrastar(page, grip, page.locator('#libTree [data-folder="f3"]'));
  await expect(page.locator('#libTree [data-folder="f3"]')).toHaveClass(/drop-on/);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'l1').folderId)).toBeNull();
  // soltar em Clientes (subcoleção)
  await arrastar(page, grip, page.locator('#libTree [data-folder="f2"]'));
  await page.screenshot({ path: 'test-results/ordem-arrastando.png' });
  await page.mouse.up();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'l1').folderId)).toBe('f2');
  await page.locator('#libTree [data-pick="f2"]').click();
  await expect(page.locator('.lib-row[data-item="l1"]')).toBeVisible();
  // clicar na alça não abre o item
  await expect(page.locator('#libBack')).toHaveCount(0);
  // soltar fora não muda nada
  const g2 = page.locator('.lib-row[data-item="l1"] .lib-rgrip');
  const b = await g2.boundingBox();
  await page.mouse.move(b.x + 5, b.y + 5); await page.mouse.down(); await page.mouse.move(700, 600, { steps: 5 }); await page.mouse.up();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'l1').folderId)).toBe('f2');
});

test('Biblioteca: "Mover para…" no menu da linha (link, skill) e no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(seed);
  await expect(page.locator('.lib-rgrip').first()).toBeHidden(); // no celular a alça não aparece
  await page.locator('[data-imenu="s1"]').click();
  await page.locator('#taskMenuPortal [data-m="move"]').click();
  await expect(page.locator('#libMoveOverlay')).toHaveClass(/show/);
  await page.screenshot({ path: 'test-results/ordem-mover-m.png' });
  await page.locator('#libMoveOverlay [data-fo="f2"]').click();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 's1').folderId)).toBe('f2');
  await page.locator('[data-imenu="l2"]').click();
  await page.locator('#taskMenuPortal [data-m="move"]').click();
  await page.locator('#libMoveOverlay [data-fo="f3"]').click();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'l2').folderId)).toBe('f3');
  // voltar para sem coleção
  await page.locator('[data-imenu="l2"]').click();
  await page.locator('#taskMenuPortal [data-m="move"]').click();
  await page.locator('#libMoveOverlay .lib-mv-sp').first().click();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'l2').folderId)).toBeNull();
});

test('Atalhos: Ordenar liga o modo de organizar; arrastar muda a ordem e fica salva; setas movem', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(seed);
  const nomes = () => page.locator('.lib-qchip span').allTextContents();
  expect(await nomes()).toEqual(['Supabase', 'Vercel', 'GitHub']); // padrão: mais recentes primeiro
  await page.click('#libQOrder');
  await expect(page.locator('.lib-qrow')).toHaveClass(/org/);
  await expect(page.locator('#libQOrder')).toContainText('Concluir');
  // clicar num chip no modo organizar não abre nada
  await page.locator('[data-quick="l1"]').click({ force: true });
  await expect(page.locator('.lib-qchip')).toHaveCount(3);
  // arrastar GitHub para antes de Supabase
  const gh = page.locator('[data-quick="l1"]'), sup = page.locator('[data-quick="l3"]');
  const a = await gh.boundingBox(), b = await sup.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 6, b.y + b.height / 2, { steps: 10 });
  await page.screenshot({ path: 'test-results/ordem-atalhos.png' });
  await page.mouse.up();
  expect(await nomes()).toEqual(['GitHub', 'Supabase', 'Vercel']);
  expect(await page.evaluate(() => state.libQuickOrder)).toEqual(['l1', 'l3', 'l2']);
  // setas: GitHub uma casa para a direita
  await page.locator('[data-quick="l1"]').focus();
  await page.keyboard.press('ArrowRight');
  expect(await nomes()).toEqual(['Supabase', 'GitHub', 'Vercel']);
  await page.click('#libQOrder');
  await expect(page.locator('.lib-qrow')).not.toHaveClass(/org/);
  // a ordem vale na faixa normal e depois de recarregar
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  await page.reload();
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); currentView = 'library'; render(); });
  expect(await nomes()).toEqual(['Supabase', 'GitHub', 'Vercel']);
  // favorito novo entra depois dos ordenados
  await page.evaluate(() => { state.libItems.find(i => i.id === 's1').favorite = true; render(); });
  expect((await nomes()).slice(-1)[0]).toBe('Skill A');
});
