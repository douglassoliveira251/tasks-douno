import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  state.libFolders = [
    { id: 'fa', name: 'Trabalho', parentId: null, categoryId: cat, createdAt: 1 },
    { id: 'fb', name: 'Sistemas', parentId: 'fa', categoryId: cat, createdAt: 1 },
    { id: 'fc', name: 'RH', parentId: 'fb', categoryId: cat, createdAt: 1 },
    { id: 'fd', name: 'Pessoal', parentId: null, categoryId: cat, createdAt: 1 },
  ];
  const it = (id, title, url, folderId, fav) => ({ id, type: 'link', title, url, description: '', folderId, categoryId: cat, favorite: !!fav, createdAt: 1, updatedAt: Number(id.slice(1)) });
  state.libItems = [
    it('i1', 'Portal do RH', 'https://rh.empresa.com.br/', 'fc', true),
    it('i2', 'Chamados', 'https://suporte.empresa.com.br/', 'fb'),
    it('i3', 'Banco', 'https://banco.com.br/', 'fd'),
    it('i4', 'Solto', 'https://solto.com.br/', null),
  ];
  currentView = 'library'; render();
};
const open = async (page, vp = { width: 1280, height: 800 }) => {
  await page.setViewportSize(vp);
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => { currentView = 'library'; render(); });
};

test('Biblioteca: abre pelo menu em /biblioteca e mostra o seletor de espaço', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.click('#navLibrary');
  await expect(page.locator('#libraryView')).toBeVisible();
  expect(await page.evaluate(() => location.pathname + location.hash)).toMatch(/biblioteca/);
  await expect(page.locator('#spaceSelectorWrap')).toBeVisible();
  await expect(page.locator('#viewTitle')).toHaveText('Biblioteca');
  await expect(page.locator('.lib-empty')).toContainText('vazia');
});

test('Biblioteca: colar um link e Enter guarda com https e título do site; endereço perigoso é recusado', async ({ page }) => {
  await open(page);
  await page.fill('#libQuick', 'rh.empresa.com.br/portal');
  await page.press('#libQuick', 'Enter');
  const it = await page.evaluate(() => state.libItems[0]);
  expect(it.url).toBe('https://rh.empresa.com.br/portal');
  expect(it.type).toBe('link');
  expect(it.folderId).toBeNull();
  await expect(page.locator('.lib-row .lib-tt')).toHaveText('rh.empresa.com.br');
  await expect(page.locator('.lib-row .lib-tt')).toHaveAttribute('target', '_blank');
  await expect(page.locator('.lib-row .lib-tt')).toHaveAttribute('rel', /noopener/);
  // recusa javascript:, data: e texto solto
  for (const ruim of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'isso nao e link']) {
    await page.fill('#libQuick', ruim);
    await page.press('#libQuick', 'Enter');
  }
  expect(await page.evaluate(() => state.libItems.length)).toBe(1);
});

test('Biblioteca: coleções em até 3 níveis; o 3º nível não tem "Nova subcoleção"', async ({ page }) => {
  await open(page);
  await page.evaluate(seed);
  await page.locator('[data-toggle="fa"]').click();
  await page.locator('[data-toggle="fb"]').click();
  await expect(page.locator('[data-folder="fc"]')).toBeVisible();
  await page.locator('[data-folder="fb"]').hover();
  await page.locator('[data-fmenu="fb"]').click();
  await expect(page.locator('#taskMenuPortal')).toContainText('Nova subcoleção');
  await page.keyboard.press('Escape');
  await page.mouse.click(700, 500);
  await page.locator('[data-folder="fc"]').hover();
  await page.locator('[data-fmenu="fc"]').click();
  await expect(page.locator('#taskMenuPortal')).not.toContainText('Nova subcoleção');
  await expect(page.locator('#taskMenuPortal')).toContainText('Renomear');
});

test('Biblioteca: criar coleção e subcoleção pela janela; a profundidade máxima é respeitada', async ({ page }) => {
  await open(page);
  await page.click('[data-newcol]');
  await page.fill('#libFName', 'Trabalho');
  await page.click('#libFSave');
  let fs = await page.evaluate(() => state.libFolders);
  expect(fs).toHaveLength(1);
  expect(fs[0].parentId).toBeNull();
  // subcoleção pelo menu
  await page.locator('[data-folder]').first().hover();
  await page.locator('[data-fmenu]').first().click();
  await page.locator('#taskMenuPortal [data-m="sub"]').click();
  await page.fill('#libFName', 'Sistemas');
  await page.click('#libFSave');
  fs = await page.evaluate(() => state.libFolders);
  expect(fs).toHaveLength(2);
  expect(fs.find(f => f.name === 'Sistemas').parentId).toBe(fs.find(f => f.name === 'Trabalho').id);
  // nome vazio não salva
  await page.click('[data-newcol]');
  await page.click('#libFSave');
  await expect(page.locator('#libFErr')).toBeVisible();
  expect(await page.evaluate(() => state.libFolders.length)).toBe(2);
});

test('Biblioteca: escolher coleção filtra a lista (inclui subcoleções), com caminho e contagens; Favoritos e tipos', async ({ page }) => {
  await open(page);
  await page.evaluate(seed);
  await expect(page.locator('.lib-row')).toHaveCount(4);
  await expect(page.locator('[data-folder="fa"] > i')).toHaveText('2'); // Sistemas (1) + RH (1)
  await page.locator('[data-pick="fa"]').click();
  await expect(page.locator('.lib-row')).toHaveCount(2);
  await expect(page.locator('.lib-crumb')).toContainText('Trabalho');
  // Favoritos
  await page.locator('[data-kind="fav"]').click();
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('.lib-row .lib-tt')).toHaveText('Portal do RH');
  // tipos: só Links está pronto; os outros ficam desativados
  await page.locator('[data-kind="all"]').click();
  await expect(page.locator('.lib-types .lib-type:not(.soon)')).toHaveCount(1);
  await expect(page.locator('.lib-types .lib-type.soon').first()).toBeDisabled();
});

test('Biblioteca: tipos fixos no rodapé da lateral mesmo com muitas coleções', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    state.libFolders = Array.from({ length: 40 }, (_, i) => ({ id: 'z' + i, name: 'Coleção ' + i, parentId: null, categoryId: cat, createdAt: 1 }));
    currentView = 'library'; render();
  });
  const r = await page.evaluate(() => {
    const side = document.querySelector('.lib-side').getBoundingClientRect();
    const types = document.querySelector('.lib-types').getBoundingClientRect();
    const tree = document.querySelector('.lib-tree');
    return { sideBottom: side.bottom, typesBottom: types.bottom, typesTop: types.top, vh: innerHeight, scroll: tree.scrollHeight > tree.clientHeight };
  });
  expect(r.scroll).toBe(true); // a árvore rola por dentro
  expect(r.typesBottom).toBeLessThanOrEqual(r.sideBottom + 1);
  expect(r.typesBottom).toBeLessThanOrEqual(r.vh);
  await expect(page.locator('.lib-types .lib-type').first()).toBeVisible();
});

test('Biblioteca: favoritar, editar (mover de coleção) e excluir item', async ({ page }) => {
  await open(page);
  await page.evaluate(seed);
  await page.locator('[data-fav="i4"]').click();
  expect(await page.evaluate(() => state.libItems.find(i => i.id === 'i4').favorite)).toBe(true);
  // editar: mover "Solto" para a coleção Pessoal
  await page.locator('[data-imenu="i4"]').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await page.selectOption('#libIFolder', 'fd');
  await page.fill('#libITitle', 'Solto agora em Pessoal');
  await page.click('#libISave');
  const it = await page.evaluate(() => state.libItems.find(i => i.id === 'i4'));
  expect(it.folderId).toBe('fd');
  expect(it.title).toBe('Solto agora em Pessoal');
  // excluir com confirmação
  await page.locator('[data-imenu="i4"]').click();
  await page.locator('#taskMenuPortal [data-m="del"]').click();
  await page.click('#confirmActionOk');
  expect(await page.evaluate(() => state.libItems.some(i => i.id === 'i4'))).toBe(false);
});

test('Biblioteca: excluir coleção sobe itens e subcoleções para o nível de cima', async ({ page }) => {
  await open(page);
  await page.evaluate(seed);
  await page.locator('[data-toggle="fa"]').click();
  await page.locator('[data-folder="fb"]').hover();
  await page.locator('[data-fmenu="fb"]').click();
  await page.locator('#taskMenuPortal [data-m="del"]').click();
  await page.click('#confirmActionOk');
  const r = await page.evaluate(() => ({ fs: state.libFolders.map(f => f.id), rh: state.libFolders.find(f => f.id === 'fc'), i2: state.libItems.find(i => i.id === 'i2'), n: state.libItems.length }));
  expect(r.fs).not.toContain('fb');
  expect(r.rh.parentId).toBe('fa'); // RH sobe para Trabalho
  expect(r.i2.folderId).toBe('fa'); // item de Sistemas sobe para Trabalho
  expect(r.n).toBe(4); // nenhum item apagado
});

test('Biblioteca: busca filtra por título, endereço e descrição', async ({ page }) => {
  await open(page);
  await page.evaluate(seed);
  await page.fill('#libSearch', 'suporte');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('.lib-row .lib-tt')).toHaveText('Chamados');
  await page.fill('#libSearch', 'zzzz');
  await expect(page.locator('.lib-empty')).toContainText('Nada encontrado');
  await page.fill('#libSearch', '');
  await expect(page.locator('.lib-row')).toHaveCount(4);
});

test('Biblioteca: com espaço em "Todos" os espaços viram grupos; cada espaço tem a sua estrutura', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    state.categories = [{ id: 'c1', name: 'Trabalho', color: '#2F7D5B' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
    state.libFolders = [{ id: 'f1', name: 'Sistemas', parentId: null, categoryId: 'c1', createdAt: 1 }, { id: 'f2', name: 'Receitas', parentId: null, categoryId: 'c2', createdAt: 1 }];
    state.libItems = [];
    activeCategoryFilter = null; currentView = 'library'; render();
  });
  await expect(page.locator('.lib-space')).toHaveCount(2);
  await expect(page.locator('[data-folder="f1"]')).toBeVisible();
  await expect(page.locator('[data-folder="f2"]')).toBeVisible();
  // escolhendo um espaço específico, só aparecem as coleções dele
  await page.evaluate(() => { activeCategoryFilter = 'c2'; render(); });
  await expect(page.locator('[data-folder="f2"]')).toBeVisible();
  await expect(page.locator('[data-folder="f1"]')).toHaveCount(0);
  await expect(page.locator('.lib-space')).toHaveCount(0);
  // novo link: o espaço vem do filtro e a janela lista só as coleções dele
  await page.click('#newBtn');
  await expect(page.locator('#libISpace')).toHaveValue('c2');
  await expect(page.locator('#libIFolder option')).toHaveCount(2); // "Sem coleção" + Receitas
});

test('Biblioteca (celular): sem rolagem lateral, árvore numa janela, tipos em faixa e botão + do topo', async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await page.evaluate(seed);
  await expect(page.locator('.lib-side')).toBeHidden();
  await expect(page.locator('#libMFolder')).toBeVisible();
  await expect(page.locator('.lib-mtypes')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  // a janela de coleções
  await page.click('#libMFolder');
  await expect(page.locator('#libSheetOverlay')).toHaveClass(/show/);
  await page.locator('#libSheetOverlay [data-toggle="fa"]').click();
  await page.locator('#libSheetOverlay [data-pick="fb"]').click();
  await expect(page.locator('#libSheetOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('.lib-row')).toHaveCount(2); // Sistemas + RH
  await expect(page.locator('#libMFolder')).toContainText('Sistemas');
  // botão "+" do topo abre o novo link
  await page.click('#newBtn');
  await expect(page.locator('#libItemOverlay')).toHaveClass(/show/);
  await expect(page.locator('#libIUrl')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('Biblioteca: no modo escuro os campos seguem o tema', async ({ page }) => {
  await open(page);
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await page.evaluate(seed);
  const cores = await page.evaluate(() => ['#libQuick', '#libSearch'].map(s => getComputedStyle(document.querySelector(s).parentElement).backgroundColor));
  for (const c of cores) expect(c).not.toBe('rgb(255, 255, 255)');
});
