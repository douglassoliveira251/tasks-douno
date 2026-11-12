import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const c = state.categories[0].id;
  state.libFolders = [
    { id: 'f1', name: 'Trabalho', parentId: null, categoryId: c, createdAt: 1 },
    { id: 'f2', name: 'Clientes', parentId: 'f1', categoryId: c, createdAt: 1 },
    { id: 'f3', name: 'Receitas', parentId: null, categoryId: c, createdAt: 1 },
  ];
  state.libItems = [];
  currentView = 'library'; render();
};
const abrirNovoLink = async (page) => {
  await page.click('#newBtn');
  await page.click('#libPickOverlay [data-new="link"]');
};

for (const [w, n] of [[1280, 'd'], [390, 'm']]) {
  test('Novo link: coleção com busca e criação na hora (' + n + ')', async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await gotoApp(page, { view: 'library' });
    await page.evaluate(seed);
    await abrirNovoLink(page);
    const btn = page.locator('[data-combo="libIFolder"] .lib-combo-btn');
    await btn.click();
    // sem busca: "Sem coleção" + as 3
    await expect(page.locator('.lib-combo-opt')).toHaveCount(4);
    // filtra por parte do caminho, sem acento e sem diferenciar maiúsculas
    await page.fill('.lib-combo-q', 'CLIEN');
    await expect(page.locator('.lib-combo-opt:not(.new)')).toHaveCount(1);
    await expect(page.locator('.lib-combo-opt:not(.new)')).toHaveText('Trabalho › Clientes');
    await page.locator('.lib-combo-opt:not(.new)').click();
    await expect(page.locator('#libIFolder')).toHaveValue('f2');
    await expect(btn).toContainText('Trabalho › Clientes');
    // criar uma nova na raiz pelo campo
    await btn.click();
    await page.fill('.lib-combo-q', 'Estudos');
    await expect(page.locator('.lib-combo-opt.new')).toHaveCount(2); // na raiz e dentro de Clientes
    await page.screenshot({ path: 'test-results/colecao-combo-' + n + '.png' });
    await page.locator('.lib-combo-opt.new', { hasText: 'Criar coleção' }).click();
    const nova = await page.evaluate(() => state.libFolders.find(f => f.name === 'Estudos'));
    expect(nova.parentId).toBeNull();
    await expect(page.locator('#libIFolder')).toHaveValue(nova.id);
    // criar dentro da escolhida (Enter cria na raiz quando nada combina)
    await btn.click();
    await page.fill('.lib-combo-q', 'Ano 1');
    await page.locator('.lib-combo-opt.new', { hasText: 'dentro de' }).click();
    const filha = await page.evaluate(() => state.libFolders.find(f => f.name === 'Ano 1'));
    expect(filha.parentId).toBe(nova.id);
    // salvar o link usa a coleção criada
    await page.fill('#libIUrl', 'exemplo.com.br');
    await page.click('#libISave');
    const it = await page.evaluate(() => state.libItems[0]);
    expect(it.folderId).toBe(filha.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
  });
}

test('Novo link: Enter no campo cria na raiz quando nada combina; Esc fecha só a lista', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(seed);
  await abrirNovoLink(page);
  await page.locator('[data-combo="libIFolder"] .lib-combo-btn').click();
  await page.fill('.lib-combo-q', 'Zzz');
  await page.press('.lib-combo-q', 'Enter');
  expect(await page.evaluate(() => state.libFolders.some(f => f.name === 'Zzz' && !f.parentId))).toBe(true);
  await expect(page.locator('#libItemOverlay')).toHaveClass(/show/); // o Enter não salvou o link
  await page.locator('[data-combo="libIFolder"] .lib-combo-btn').click();
  await page.press('.lib-combo-q', 'Escape');
  await expect(page.locator('.lib-combo-pop')).toBeHidden();
});

test('linha do link: globo junto do endereço e botão Abrir no fim', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(() => { state.libItems = [{ id: 'l1', type: 'link', title: 'GitHub', url: 'https://github.com', favorite: false, folderId: null, categoryId: state.categories[0].id, createdAt: 1 }]; render(); });
  await expect(page.locator('.lib-row .lib-dm .lib-dm-g svg')).toBeVisible();
  await expect(page.locator('.lib-row .lib-open')).toContainText('Abrir');
  await page.screenshot({ path: 'test-results/link-linha-d.png' });
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator('.lib-row .lib-open span')).toBeHidden();
  await page.screenshot({ path: 'test-results/link-linha-m.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
