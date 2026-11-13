import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  const now = Date.now();
  state.notebooks = [
    { id: 'nb1', name: 'Reuniões', categoryId: cat, createdAt: now - 2 },
    { id: 'nb2', name: 'Projetos', categoryId: cat, createdAt: now - 1 },
  ];
  const mk = (id, nb, title) => ({
    id, title, body: '<div>Texto da nota</div>', notebookId: nb, categoryId: cat,
    createdAt: now, updatedAt: now, archived: false, pinned: false, tagIds: [], attachments: [],
  });
  state.notes = [mk('n1', 'nb1', 'Alinhamento semanal'), mk('n2', 'nb2', 'Redesenho do app')];
  state.tasks = [];
  state.events = [];
  expandedNotebookIds.add('nb1');
  expandedNotebookIds.add('nb2');
  activeNoteId = 'n1';
  notesDrawerOpen = false;
  notesFocusMode = false;
  currentView = 'notes';
  render();
};

test.describe('Notas no celular', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'notes' });
    await page.evaluate(seed);
    await page.evaluate(() => { activeNoteId = null; render(); }); // abre na lista, sem nota aberta
  });

  test('abre na lista: chips de cadernos e notas com prévia, sem gaveta', async ({ page }) => {
    await expect(page.locator('.notes-mchips')).toBeVisible();
    await expect(page.locator('.notes-list-item')).toHaveCount(2);
    await expect(page.locator('.notebooks-col')).toBeHidden();
    await expect(page.locator('.note-detail-col')).toBeHidden();
    await page.locator('.notes-mchips [data-nbf="nb2"]').click();
    await expect(page.locator('.notes-list-item')).toHaveCount(1);
    await expect(page.locator('.notes-list-item')).toContainText('Redesenho do app');
  });

  test('tocar numa nota abre em tela cheia, com Voltar e a barra do editor acima do menu de baixo', async ({ page }) => {
    await page.locator('.notes-list-item', { hasText: 'Alinhamento semanal' }).click();
    await expect(page.locator('.note-detail-col')).toBeVisible();
    await expect(page.locator('.notes-mlist')).toHaveCount(0);
    const topo = await page.evaluate(() => !!document.elementFromPoint(100, 24).closest('.topnav'));
    const baixo = await page.evaluate(() => !!document.elementFromPoint(195, 785).closest('.nav'));
    expect(topo).toBe(true);
    expect(baixo).toBe(true);
    await page.locator('#notesMobileBack').click();
    await expect(page.locator('.notes-list-item')).toHaveCount(2);
    expect(await page.evaluate(() => activeNoteId)).toBeNull();
  });
});

test.describe('Notas no desktop', () => {
  test('mantém a coluna de cadernos ao lado e esconde os controles do celular', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'notes' });
    await page.evaluate(seed);
    await expect(page.locator('.notebooks-col')).toBeVisible();
    await expect(page.locator('.notes-mbar')).toBeHidden();
    await expect(page.locator('#notebooksColCloseBtn')).toBeHidden();
  });
});

test.describe('Cabeçalho das páginas no celular', () => {
  test('menu de telas vai para a barra fixa de baixo e a faixa de título cabe na tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    const nav = await page.locator('.nav').boundingBox();
    expect(nav.y + nav.height).toBeGreaterThan(790); // colado no rodapé
    expect(nav.width).toBeGreaterThan(380);
    await expect(page.locator('.nav-item[data-view="notes"] .nav-label')).toBeVisible();
    const topbar = await page.locator('.topbar').boundingBox();
    expect(topbar.height).toBeLessThan(130);
    const chip = await page.locator('#spaceSelectorBtn').boundingBox();
    expect(chip.x + chip.width).toBeLessThanOrEqual(390);
    expect(chip.y).toBeLessThan(60); // o espaço fica na barra do topo
  });
});

test.describe('Notas no computador largo', () => {
  test('cadernos | lista de notas com prévia | editor, com filtros no topo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 820 });
    await gotoApp(page, { view: 'notes' });
    await page.evaluate(seed);
    await expect(page.locator('.notes-list-col .notes-list-item')).toHaveCount(2);
    await expect(page.locator('.notes-filters')).toBeVisible();
    await page.locator('.notebook-row[data-nb-id="nb2"]').click();
    await expect(page.locator('.notes-list-col .notes-list-item')).toHaveCount(1);
    await expect(page.locator('.notes-list-col')).toContainText('Redesenho do app');
    await page.locator('#nbAllRow').click();
    await expect(page.locator('.notes-list-col .notes-list-item')).toHaveCount(2);
    await page.locator('.notes-list-item', { hasText: 'Redesenho do app' }).click();
    expect(await page.evaluate(() => activeNoteId)).toBe('n2');
    await page.locator('.notes-filters [data-pop="sort"]').click();
    await page.locator('.notes-filters [data-sort="title"]').click();
    const titulos = await page.locator('.notes-list-item .nli-top b').allTextContents();
    expect(titulos).toEqual(['Alinhamento semanal', 'Redesenho do app']);
  });
});

test('celular: a lista de notas rola quando há muitas notas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await gotoApp(page, { view: 'notes' });
  await page.evaluate(() => {
    const cat = state.categories[0].id, now = Date.now();
    state.notebooks = [{ id: 'nb1', name: 'Reuniões', categoryId: cat, createdAt: now }];
    state.notes = Array.from({ length: 25 }, (_, i) => ({ id: 'n' + i, title: 'Nota ' + i, body: '<div>Conteúdo da nota ' + i + ' com um texto para a prévia.</div>', notebookId: 'nb1', categoryId: cat, createdAt: now - i, updatedAt: now - i, archived: false, pinned: false, tagIds: [], attachments: [] }));
    state.tasks = []; state.events = []; activeNoteId = null; currentView = 'notes'; render();
  });
  const rolagem = await page.locator('#notesView').evaluate(el => ({ sh: el.scrollHeight, ch: el.clientHeight, ov: getComputedStyle(el).overflowY }));
  expect(rolagem.ov).toBe('auto');
  expect(rolagem.sh).toBeGreaterThan(rolagem.ch + 200);
  await page.locator('#notesView').evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await page.locator('#notesView').evaluate(el => el.scrollTop)).toBeGreaterThan(200);
  await expect(page.locator('.notes-list-item', { hasText: 'Nota 24' })).toBeInViewport();
});
