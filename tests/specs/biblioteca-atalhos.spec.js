import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const c = state.categories[0].id;
  const l = (id, title, url, fav, u) => ({ id, type: 'link', title, url, favorite: fav, folderId: null, categoryId: c, createdAt: 1, updatedAt: u });
  state.libFolders = [];
  state.libItems = [
    l('l1', 'GitHub', 'https://github.com', true, 10), l('l2', 'Vercel', 'https://vercel.com', true, 20), l('l3', 'Supabase', 'https://supabase.com', true, 30),
    l('l4', 'Portal RH', 'https://rh.exemplo.com.br', true, 40), l('l5', 'Docs', 'https://docs.exemplo.com', false, 50),
    { id: 's1', type: 'skill', title: 'Skill relatório', content: '# a', favorite: true, folderId: null, categoryId: c, createdAt: 1, updatedAt: 60 },
    { id: 'h1', type: 'html', title: 'Relatório de vendas', html: '<b>oi</b>', fileName: 'r.html', size: 10, favorite: true, folderId: null, categoryId: c, createdAt: 1, updatedAt: 5 },
    l('l6', 'Extra um', 'https://um.exemplo.com', true, 1), l('l7', 'Extra dois', 'https://dois.exemplo.com', true, 2),
  ];
  render();
};

for (const [w, n] of [[1280, 'd'], [390, 'm']]) {
  test('Biblioteca: faixa de atalhos com os favoritos, links primeiro, até 6 e "Ver todos" (' + n + ')', async ({ page, context }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await gotoApp(page, { view: 'library' });
    await page.evaluate(seed);
    const chips = page.locator('.lib-qchip');
    await expect(chips).toHaveCount(6);
    // links primeiro (do mais recente); skill e HTML depois
    const nomes = await chips.locator('span').allTextContents();
    expect(nomes.slice(0, 4)).toEqual(['Portal RH', 'Supabase', 'Vercel', 'GitHub']);
    await expect(page.locator('#libQAll')).toContainText('Ver todos (8)');
    await page.screenshot({ path: 'test-results/atalhos-' + n + '.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
    // link abre o site em outra aba
    const [nova] = await Promise.all([context.waitForEvent('page'), page.locator('[data-quick="l2"]').click()]);
    expect(nova.url()).toContain('vercel.com');
    await nova.close();
    // Ver todos mostra o filtro Favoritos
    await page.click('#libQAll');
    await expect(page.locator('.lib-crumb')).toContainText('Favoritos');
    await expect(page.locator('.lib-row')).toHaveCount(8);
  });
}

test('Biblioteca: atalho de skill abre a skill; some quando não há favoritos ou com um item aberto; respeita o espaço', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(seed);
  await page.evaluate(() => { state.libItems.filter(i => i.id === 'l6' || i.id === 'l7').forEach(i => { i.favorite = false; }); render(); });
  await page.locator('[data-quick="s1"]').click();
  await expect(page.locator('#skDel')).toBeVisible();
  await expect(page.locator('.lib-quick')).toHaveCount(0); // com um item aberto, a faixa não aparece
  await page.locator('#libBack').click();
  await page.evaluate(() => { state.libItems.forEach(i => { i.favorite = false; }); render(); });
  await expect(page.locator('.lib-quick')).toHaveCount(0);
  await page.evaluate(() => { const c = state.categories[0].id; state.libItems[0].favorite = true; state.categories = state.categories.concat([{ id: 'c9', name: 'Outro', color: '#B04A6F' }]); activeCategoryFilter = 'c9'; render(); });
  await expect(page.locator('.lib-quick')).toHaveCount(0); // o favorito é de outro espaço
});

test('Atalho de página HTML abre direto em nova aba (/app/pagina/<id>), sem passar pela tela da Biblioteca', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(() => {
    const c = state.categories[0].id;
    state.libFolders = [];
    state.libItems = [{ id: 'h1', type: 'html', title: 'Relatório de vendas', html: '<html><body><b id="x">Olá</b></body></html>', fileName: 'r.html', size: 40, favorite: true, folderId: null, categoryId: c, createdAt: 1, updatedAt: 1 }];
    localStorage.setItem('tyvraTasksState', JSON.stringify(state));
    render();
  });
  const [nova] = await Promise.all([context.waitForEvent('page'), page.locator('[data-quick="h1"]').click()]);
  await nova.waitForLoadState();
  expect(new URL(nova.url()).pathname).toBe('/app/pagina/h1');
  await expect(nova.frameLocator('#pageOnly iframe').locator('#x')).toHaveText('Olá');
  await expect(page.locator('#hFrame')).toHaveCount(0); // a Biblioteca continua na lista
});
