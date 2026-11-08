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
  });

  test('a nota ocupa a largura toda e os cadernos ficam numa gaveta fechada', async ({ page }) => {
    await expect(page.locator('.notebooks-col')).toBeHidden();
    const note = await page.locator('.note-detail-col').boundingBox();
    expect(note.width).toBeGreaterThan(320);
    expect(note.height).toBeGreaterThan(400);
    await expect(page.locator('#notesDrawerBtn')).toContainText('Reuniões');
    await expect(page.locator('#notesDrawerBtn')).toContainText('Alinhamento semanal');
  });

  test('gaveta abre pelo botão, troca de nota e fecha sozinha', async ({ page }) => {
    await page.locator('#notesDrawerBtn').click();
    await expect(page.locator('.notebooks-col')).toBeVisible();

    await page.locator('.notebook-note-item', { hasText: 'Redesenho do app' }).click();
    await expect(page.locator('.notebooks-col')).toBeHidden();
    await expect(page.locator('#notesDrawerBtn')).toContainText('Projetos');
    await expect(page.locator('#notesDrawerBtn')).toContainText('Redesenho do app');
  });

  test('gaveta fecha ao tocar fora e pelo botão de fechar', async ({ page }) => {
    await page.locator('#notesDrawerBtn').click();
    await expect(page.locator('.notebooks-col')).toBeVisible();
    await page.locator('#notebooksColCloseBtn').click();
    await expect(page.locator('.notebooks-col')).toBeHidden();

    await page.locator('#notesDrawerBtn').click();
    await page.locator('.notes-drawer-backdrop').click({ position: { x: 195, y: 40 } });
    await expect(page.locator('.notebooks-col')).toBeHidden();
  });

  test('abrir/fechar um caderno não fecha a gaveta', async ({ page }) => {
    await page.locator('#notesDrawerBtn').click();
    await page.locator('.notebook-row', { hasText: 'Projetos' }).click();
    await expect(page.locator('.notebooks-col')).toBeVisible();
  });

  test('modo foco esconde o cabeçalho e dá mais espaço à nota', async ({ page }) => {
    const before = await page.locator('.note-detail-col').boundingBox();
    await page.locator('#notesFocusBtn').click();
    await expect(page.locator('#topbarTitle')).toBeHidden();
    await expect(page.locator('.topbar')).toBeHidden();
    const after = await page.locator('.note-detail-col').boundingBox();
    expect(after.height).toBeGreaterThan(before.height + 40);

    await page.locator('#notesFocusBtn').click();
    await expect(page.locator('#topbarTitle')).toBeVisible();
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
    expect(topbar.height).toBeLessThan(110);
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
    await page.locator('input[name="notesSort"][value="title"]').check();
    const titulos = await page.locator('.notes-list-item .nli-top b').allTextContents();
    expect(titulos).toEqual(['Alinhamento semanal', 'Redesenho do app']);
  });
});
