import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
  state.tags = [
    { id: 'a', name: 'Financeiro', color: '#2F5F9E', categoryId: 'c1' },
    { id: 'b', name: 'Cliente A', color: '#9B5DE5', categoryId: 'c1' },
    { id: 'c', name: 'Casa', color: '#2F6F5E', categoryId: 'c2' },
    { id: 'g', name: 'Urgente', color: '#C0453A', categoryId: null },
  ];
  state.tasks = [{ id: 't1', title: 'X', done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', categoryId: 'c1', tagIds: ['a'], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
  activeCategoryFilter = null;
  settingsTab = 'tags'; tagSpaceFilter = '';
  currentView = 'settings';
  render();
};

test.describe('Configurações', () => {
  test('menu em grupos com contagem', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seed);
    await expect(page.locator('.settings-gt')).toHaveText(['Conta', 'Organização', 'Sistema']);
    await expect(page.locator('.settings-nav-item[data-tab="tags"] .settings-nav-count')).toHaveText('4');
    await expect(page.locator('.settings-nav-item[data-tab="categorias"] .settings-nav-count')).toHaveText('2');
    await expect(page.locator('.settings-nav-item[data-tab="perfil"] .settings-nav-count')).toHaveCount(0);
  });

  test('tags: combo de espaço filtra, sem texto explicativo e sem cor personalizada', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seed);
    await expect(page.locator('#tagSpaceHost .sp-combo-text')).toHaveText('Trabalho');
    await expect(page.locator('.tag-row-settings')).toHaveCount(2);
    await expect(page.locator('#settingsPanel')).not.toContainText('Você está editando');
    await expect(page.locator('.tag-row-settings').first().locator('.tag-row-use')).toHaveText('1 tarefa');
    await page.locator('#tagSpaceHost .sp-combo-btn').click();
    await expect(page.locator('.sp-opt')).toHaveText(['Trabalho', 'Pessoal', 'Gerais']);
    await page.locator('.sp-opt', { hasText: 'Gerais' }).click();
    await expect(page.locator('.tag-row-settings')).toHaveCount(1);
    await expect(page.locator('.tag-name-input')).toHaveValue('Urgente');
    await page.locator('#tagSpaceHost .sp-combo-btn').click();
    await page.locator('.sp-opt', { hasText: 'Pessoal' }).click();
    await expect(page.locator('.tag-name-input')).toHaveValue('Casa');
    await expect(page.locator('input[type=color]')).toHaveCount(0);
  });

  test('tags: paleta troca a cor, sem campo de cor personalizada', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seed);
    await page.locator('.tag-row-settings').first().locator('.tag-swatch').click();
    await expect(page.locator('.tag-pal-dot')).toHaveCount(16);
    await expect(page.locator('.tag-pal-pop input')).toHaveCount(0);
    await expect(page.locator('.tag-pal-dot.sel')).toHaveAttribute('data-c', '#2F5F9E');
    await page.locator('.tag-pal-dot[data-c="#E11D48"]').click();
    await expect(page.locator('.tag-pal-pop')).toHaveCount(0);
    expect(await page.evaluate(() => state.tags.find(t => t.id === 'a').color)).toBe('#E11D48');
    await expect(page.locator('.tag-row-settings').first().locator('.tag-row-preview')).toHaveAttribute('style', /--tg:\s*#E11D48/i);
  });

  test('tags: adiciona no espaço escolhido com a cor da paleta', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seed);
    await page.locator('#tagSpaceHost .sp-combo-btn').click();
    await page.locator('.sp-opt', { hasText: 'Pessoal' }).click();
    await page.locator('#tagNewColor').click();
    await page.locator('.tag-pal-dot[data-c="#0EA5E9"]').click();
    await page.locator('#tagNewName').fill('Saúde');
    await page.locator('#addTagBtn').click();
    const t = await page.evaluate(() => state.tags.find(x => x.name === 'Saúde'));
    expect(t.categoryId).toBe('c2');
    expect(t.color).toBe('#0EA5E9');
    await expect(page.locator('.tag-row-settings')).toHaveCount(2);
  });
});

test.describe('Configurações · Espaços', () => {
  const seedCat = () => {
    state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
    const t = (id, c) => ({ id, title: id, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 });
    state.tasks = [t('a', 'c1'), t('b', 'c1')];
    state.events = [{ id: 'e1', title: 'Ev', date: todayStr(), endDate: todayStr(), startTime: '10:00', endTime: '11:00', allDay: false, categoryId: 'c1', tagIds: [], recurrence: 'none', recurrenceInterval: 1, linkedTaskId: null, description: '', createdAt: 1 }];
    state.notes = [];
    state.projects = [{ id: 'p1', name: 'P', categoryId: 'c1', createdAt: 1, stages: [] }];
    state.defaultCategoryFilter = null;
    settingsTab = 'categorias'; currentView = 'settings'; render();
  };
  test('lista com uso por tipo, paleta e estrela', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seedCat);
    await expect(page.locator('.cat-row-settings').first().locator('.cat-row-use')).toHaveText('2 tarefas · 1 agenda · 1 projeto');
    await expect(page.locator('.cat-row-settings').nth(1).locator('.cat-row-use')).toHaveText('Sem uso');
    await expect(page.locator('input[type=color]')).toHaveCount(0);
    await page.locator('.cat-row-settings').nth(1).locator('.tag-swatch').click();
    await expect(page.locator('.tag-pal-title')).toHaveText('Cor do espaço');
    await page.locator('.tag-pal-dot[data-c="#E11D48"]').click();
    expect(await page.evaluate(() => state.categories[1].color)).toBe('#E11D48');
    await page.locator('.cat-row-settings').nth(1).locator('.cat-star').click();
    expect(await page.evaluate(() => state.defaultCategoryFilter)).toBe('c2');
    await expect(page.locator('.cat-star.active')).toHaveCount(1);
  });
  test('adicionar pelo topo e remover move agendas e projetos', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(seedCat);
    await page.locator('#catNewName').fill('Estudos');
    await page.locator('#addCatBtn').click();
    await expect(page.locator('.cat-row-settings')).toHaveCount(3);
    await page.locator('.cat-row-settings').first().locator('.cat-del').click();
    await page.locator('#confirmActionOk').click();
    const r = await page.evaluate(() => ({ ev: state.events[0].categoryId, pj: state.projects[0].categoryId, n: state.categories.length }));
    expect(r.n).toBe(2);
    expect(r.ev).toBe('c2');
    expect(r.pj).toBe('c2');
  });
});

test('templates: mesmo seletor de espaço, sem numeração', async ({ page }) => {
  await gotoApp(page, { view: 'settings' });
  await page.evaluate(() => {
    state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
    state.taskTemplates = [{ id: 'x', name: 'Só trabalho', categoryIds: ['c1'], subtasks: [], events: [] }, { id: 'y', name: 'Só pessoal', categoryIds: ['c2'], subtasks: [], events: [] }];
    activeCategoryFilter = null; templateSpaceFilter = ''; settingsTab = 'templates'; currentView = 'settings'; render();
  });
  await expect(page.locator('#tplSpaceHost .sp-combo-text')).toHaveText('Trabalho');
  await expect(page.locator('.tpl-card')).toHaveCount(1);
  await page.locator('#tplSpaceHost .sp-combo-btn').click();
  await expect(page.locator('.sp-opt')).toHaveText(['Trabalho', 'Pessoal']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tplSpaceHost .sp-combo-text')).toHaveText('Pessoal');
  await expect(page.locator('.tpl-card')).toContainText('Só pessoal');
});
