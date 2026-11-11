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

async function dragGrip(page, from, to) {
  const a = await from.boundingBox(), b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, (a.y + b.y) / 2 + 4, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + (b.y < a.y ? -6 : 6), { steps: 6 });
  await page.mouse.up();
}

test.describe('Reordenar arrastando', () => {
  test('espaços: arrastar muda a ordem e passa para Personalizada; sem setas', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => {
      state.categories = [{ id: 'c1', name: 'Alfa', color: '#4A6FA5' }, { id: 'c2', name: 'Beta', color: '#9B5DE5' }, { id: 'c3', name: 'Gama', color: '#2F6F5E' }];
      state.categoryOrder = 'creation'; settingsTab = 'categorias'; currentView = 'settings'; render();
    });
    await expect(page.locator('.reorder-btn')).toHaveCount(0);
    const grips = page.locator('.cat-row-settings .drag-grip');
    await dragGrip(page, grips.nth(0), grips.nth(2));
    expect(await page.evaluate(() => state.categories.map(c => c.id))).toEqual(['c2', 'c3', 'c1']);
    expect(await page.evaluate(() => state.categoryOrder)).toBe('custom');
    await expect(page.locator('#catOrderSelect')).toHaveValue('custom');
    await expect(page.locator('.cat-row-settings .tag-name-input').first()).toHaveValue('Beta');
  });

  test('espaços: teclado (seta para baixo na alça) move uma posição', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => {
      state.categories = [{ id: 'c1', name: 'Alfa', color: '#4A6FA5' }, { id: 'c2', name: 'Beta', color: '#9B5DE5' }];
      state.categoryOrder = 'creation'; settingsTab = 'categorias'; currentView = 'settings'; render();
    });
    await page.locator('.cat-row-settings .drag-grip').first().focus();
    await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => state.categories.map(c => c.id))).toEqual(['c2', 'c1']);
  });

  test('tags: arrasta só dentro do espaço e mantém as tags dos outros espaços', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => {
      state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
      state.tags = [
        { id: 'a', name: 'A', color: '#2F5F9E', categoryId: 'c1' }, { id: 'x', name: 'X', color: '#2F5F9E', categoryId: 'c2' },
        { id: 'b', name: 'B', color: '#2F5F9E', categoryId: 'c1' }, { id: 'c', name: 'C', color: '#2F5F9E', categoryId: 'c1' },
      ];
      state.tagOrder = 'creation'; activeCategoryFilter = null; tagSpaceFilter = ''; settingsTab = 'tags'; currentView = 'settings'; render();
    });
    const grips = page.locator('.tag-row-settings .drag-grip');
    await dragGrip(page, grips.nth(2), grips.nth(0));
    const ids = await page.evaluate(() => state.tags.map(t => t.id));
    expect(ids).toEqual(['c', 'x', 'a', 'b']);
    expect(await page.evaluate(() => state.tagOrder)).toBe('custom');
  });

  test('subtarefas: só as pendentes têm alça; arrastar reordena e concluídas ficam no fim', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      state.tasks = [{ id: 't1', title: 'Tarefa', categoryId: state.categories[0].id, done: false, status: 'nao_iniciado', dueDate: null, dueTime: null,
        startDate: todayStr(), followUpDate: todayStr(), priority: 'media', description: '', tagIds: [], recurrence: 'none',
        subtasks: [{ id: 'a', title: 'A', done: false }, { id: 'b', title: 'B', done: false }, { id: 'c', title: 'C', done: false }, { id: 'd', title: 'D', done: true }],
        comments: [], attachments: [], createdAt: Date.now() }];
      render(); openTaskPanel('t1');
    });
    await expect(page.locator('.tp-subtask-row .drag-grip')).toHaveCount(3);
    await expect(page.locator('.tp-subtask-row.done .drag-grip')).toHaveCount(0);
    await expect(page.locator('.tp-subtask-move')).toHaveCount(0);
    const grips = page.locator('.tp-subtask-row .drag-grip');
    await dragGrip(page, grips.nth(0), grips.nth(2));
    expect(await page.evaluate(() => state.tasks[0].subtasks.map(s => s.id))).toEqual(['b', 'c', 'a', 'd']);
    await expect(page.locator('.tp-subtask-title')).toHaveText(['B', 'C', 'A', 'D']);
  });
});

test.describe('Correções', () => {
  test('tag criada pelo painel da tarefa já nasce no estilo suave, igual ao de depois de salvar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.tags = [];
      state.tasks = [{ id: 't1', title: 'T', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: 1 }];
      render(); openTaskPanel('t1');
    });
    await page.locator('#tpTagsToggleBtn').click();
    await page.locator('.tags-picker-portal input').first().fill('Nova tag');
    await page.locator('[data-create]').click();
    const chip = page.locator('#tpTagsSelected .tp-tag-chip.active').first();
    await expect(chip).toHaveText('Nova tag');
    const dyn = await chip.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, inline: el.style.background }));
    expect(dyn.inline).toBe('');
    // redesenho completo do painel (como ao salvar): mesma aparência
    await page.evaluate(() => { render(); openTaskPanel('t1'); });
    const after = await page.locator('#tpTagsSelected .tp-tag-chip.active').first().evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    expect(dyn.bg).toBe(after.bg);
    expect(dyn.color).toBe(after.color);
  });

  test('confirmação de exclusão fica dentro da tela, fecha ao clicar fora e com Esc', async ({ page }) => {
    for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 800 }]) {
      await page.setViewportSize(vp);
      await gotoApp(page, { view: 'settings' });
      await page.evaluate(() => {
        state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }];
        settingsTab = 'categorias'; currentView = 'settings'; render();
      });
      await page.locator('.cat-del').last().click();
      const portal = page.locator('#confirmActionPortal');
      await expect(portal).toBeVisible();
      const b = await portal.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
      expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
      await page.mouse.click(vp.width - 6, 70); // fora da confirmação
      await expect(portal).toBeHidden();
      await page.locator('.cat-del').last().click();
      await expect(portal).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(portal).toBeHidden();
    }
  });
});

test.describe('Detalhe da tarefa: duplicar, excluir e progresso', () => {
  const seedT = () => {
    const cat = state.categories[0].id;
    state.tasks = [{ id: 't1', title: 'Relatório', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', description: '', tagIds: [], recurrence: 'none',
      subtasks: [{ id: 'a', title: 'A', done: true }, { id: 'b', title: 'B', done: false }], comments: [], attachments: [], createdAt: 1 }];
    currentView = 'tasks'; render(); openTaskPanel('t1');
  };
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`ícones depois do favorito, excluir com confirmação e barra mais grossa (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize(vp);
      await gotoApp(page, { view: 'tasks' });
      await page.evaluate(seedT);
      const order = await page.locator('.tp-name-row').first().evaluate(el => [...el.querySelectorAll('button')].map(b => b.id).filter(Boolean));
      expect(order.slice(order.indexOf('tpPinBtn'))).toEqual(['tpPinBtn', 'tpDupBtn', 'tpDelBtn', 'tpMenuBtn']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(vp.width);
      expect(await page.locator('.tp-subtask-progress-bar').evaluate(el => el.getBoundingClientRect().height)).toBe(9);
      await page.locator('#tpDupBtn').click();
      expect(await page.evaluate(() => state.tasks.map(t => t.title))).toEqual(['Relatório', 'Relatório (cópia)']);
      await page.locator('#tpDelBtn').click();
      const portal = page.locator('#confirmActionPortal');
      await expect(portal).toContainText('não pode ser desfeita');
      const b = await portal.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
      await page.locator('#confirmActionOk').click();
      expect(await page.evaluate(() => state.tasks.map(t => t.title))).toEqual(['Relatório']);
    });
  }
});

test('modo escuro: barra da prioridade no início da tarefa aparece, no computador e no celular', async ({ page }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const cat = state.categories[0].id;
      const t = (id, pr) => ({ id, title: 'T ' + pr, categoryId: cat, done: false, status: 'nao_iniciado', priority: pr, dueDate: '', description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: 1 });
      state.tasks = [t('a', 'baixa'), t('b', 'media'), t('c', 'alta'), t('d', 'critica')];
      activeTaskId = null; render();
    });
    for (const pr of ['baixa', 'media', 'alta', 'critica']) {
      const r = await page.locator('.task-row.pri-' + pr).first().evaluate((el, pr) => {
        const cs = getComputedStyle(el), v = getComputedStyle(document.documentElement).getPropertyValue('--priority-' + pr).trim();
        const probe = document.createElement('i'); probe.style.color = v; document.body.appendChild(probe);
        const want = getComputedStyle(probe).color; probe.remove();
        return { w: cs.borderLeftWidth, c: cs.borderLeftColor, want };
      }, pr);
      expect(parseFloat(r.w)).toBeGreaterThanOrEqual(3);
      expect(r.c).toBe(r.want);
    }
  }
});

test('calendário: espaços marcados ficam salvos até desmarcar (mesmo trocando de tela e de espaço no menu)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'calendar' });
  await page.evaluate(() => {
    state.categories = [{ id: 'c1', name: 'Trabalho', color: '#4A6FA5' }, { id: 'c2', name: 'Pessoal', color: '#9B5DE5' }, { id: 'c3', name: 'Estudos', color: '#2F6F5E' }];
    state.calSpaces = null; activeCategoryFilter = null; currentView = 'calendar'; render();
  });
  await expect(page.locator('input[data-space]:checked')).toHaveCount(3);
  await page.locator('.cal-sp:has(input[data-space="c3"])').click();
  await page.locator('.cal-sp:has(input[data-space="c2"])').click();
  expect(await page.evaluate(() => state.calSpaces)).toEqual(['c1']);
  // sai da tela, muda o espaço do menu e volta: a marcação é a mesma
  await page.evaluate(() => { currentView = 'tasks'; render(); activeCategoryFilter = 'c2'; currentView = 'calendar'; render(); });
  await expect(page.locator('input[data-space]:checked')).toHaveCount(1);
  await expect(page.locator('input[data-space="c1"]')).toBeChecked();
  // vai junto com os dados salvos (estado)
  expect(await page.evaluate(() => JSON.parse(JSON.stringify(state)).calSpaces)).toEqual(['c1']);
  // marcar de novo só muda quando a pessoa marca
  await page.locator('.cal-sp:has(input[data-space="c2"])').click();
  expect(await page.evaluate(() => state.calSpaces)).toEqual(['c1', 'c2']);
});

test('menu: Biblioteca existe com ícone de livros, desativada e sem abrir tela', async ({ page }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    const b = page.locator('#navLibrary');
    await expect(b).toBeVisible();
    await expect(b).toBeDisabled();
    await expect(b).toHaveAttribute('title', /em breve/i);
    await expect(b.locator('svg rect')).toHaveCount(2);
    await b.click({ force: true });
    expect(await page.evaluate(() => currentView)).toBe('tasks');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(vp.width);
  }
});

test('detalhe da tarefa (computador): a barra de prioridade encosta no topo do painel', async ({ page }) => {
  for (const vp of [{ width: 1440, height: 800 }, { width: 1100, height: 700 }]) {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.tasks = [{ id: 't1', title: 'T', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: 1 }];
      currentView = 'tasks'; render(); openTaskPanel('t1');
    });
    const d = await page.evaluate(() => document.querySelector('.tp-top-flag').getBoundingClientRect().top - document.querySelector('.task-panel').getBoundingClientRect().top);
    expect(Math.abs(d)).toBeLessThanOrEqual(1);
  }
});

test('modo escuro: hover do menu só muda a cor (sem fundo); menu de Configurações mais quadrado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'settings' });
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); settingsTab = 'tags'; render(); });
  const it = page.locator('.settings-nav-item[data-tab="templates"]');
  const before = await it.evaluate(el => getComputedStyle(el).color);
  await it.hover();
  await page.waitForTimeout(400); // espera a transição de cor
  const after = await it.evaluate(el => ({ c: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, r: getComputedStyle(el).borderRadius }));
  expect(after.c).toBe('rgb(255, 255, 255)');
  expect(after.c).not.toBe(before);
  expect(after.bg).toBe('rgba(0, 0, 0, 0)');
  expect(parseFloat(after.r)).toBeLessThanOrEqual(4);
  expect(parseFloat(await page.locator('.settings-nav').evaluate(el => getComputedStyle(el).borderTopLeftRadius))).toBeLessThanOrEqual(8);
  await page.getByText('Notas', { exact: true }).first().hover();
  await page.waitForTimeout(400);
  const top = await page.evaluate(() => { const b = [...document.querySelectorAll('.nav-item')].find(x => x.dataset.view === 'notes'); const cs = getComputedStyle(b); return { c: cs.color, bg: cs.backgroundColor }; });
  expect(top.c).toBe('rgb(255, 255, 255)');
  expect(top.bg).toBe('rgba(0, 0, 0, 0)');
});

test('celular: Configurações abre em lista de opções; tocar abre a tela da opção; voltar leva à lista; computador não muda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { document.getElementById('avatarMenuSettingsBtn').click(); });
  await expect(page.locator('.settings-m-item')).toHaveCount(6);
  await expect(page.locator('.settings-m-group')).toHaveText(['Conta', 'Organização', 'Sistema']);
  await expect(page.locator('.settings-panel')).toHaveCount(0);
  await page.locator('.settings-m-item[data-tab="tags"]').click();
  await expect(page.locator('.settings-panel')).toBeVisible();
  await expect(page.locator('.settings-nav')).toBeHidden();
  await expect(page.locator('#settingsMBack')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator('#settingsMBack').click();
  await expect(page.locator('.settings-m-item')).toHaveCount(6);
  // outros caminhos (ex.: Gerenciar espaços) abrem direto a tela da opção
  await page.evaluate(() => { openSettingsView('categorias'); });
  await expect(page.locator('.settings-panel')).toBeVisible();
  await expect(page.locator('.settings-m-item')).toHaveCount(0);
  // computador: menu lateral, sem lista nem botão de voltar
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { openSettingsView('personalizacao', { list: true }); });
  await expect(page.locator('.settings-nav')).toBeVisible();
  await expect(page.locator('.settings-m-item')).toHaveCount(0);
  await expect(page.locator('#settingsMBack')).toBeHidden();
});

test('detalhe da tarefa: a linha do topo tem a cor da prioridade', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  for (const p of ['baixa', 'media', 'alta', 'critica']) {
    const r = await page.evaluate((p) => {
      const cat = state.categories[0].id;
      state.tasks = [{ id: 't1', title: 'T', categoryId: cat, done: false, status: 'nao_iniciado', priority: p, dueDate: '2000-01-01', description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: 1 }];
      currentView = 'tasks'; render(); openTaskPanel('t1');
      const flag = getComputedStyle(document.querySelector('.tp-top-flag')).backgroundColor;
      const probe = document.createElement('i'); probe.style.background = 'var(--priority-' + p + ')'; document.body.appendChild(probe);
      const want = getComputedStyle(probe).backgroundColor; probe.remove();
      return { flag, want };
    }, p);
    expect(r.flag).toBe(r.want);
  }
});

test('modo escuro: campo de buscar tags segue o tema (não fica branco)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  const bg = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const i = document.createElement('input'); i.className = 'tag-picker-search'; document.body.appendChild(i);
    const c = getComputedStyle(i).backgroundColor; i.remove(); return c;
  });
  expect(bg).not.toBe('rgb(255, 255, 255)');
  expect(bg).toBe('rgb(28, 31, 36)');
});

test('modo escuro: texto digitado em campos do detalhe da tarefa é legível', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  const r = await page.evaluate(() => {
    const cat = state.categories[0].id;
    state.tasks = [{ id: 't1', title: 'T', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '', description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: 1 }];
    document.documentElement.setAttribute('data-theme', 'dark');
    currentView = 'tasks'; render(); openTaskPanel('t1');
    const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
    const out = {};
    for (const sel of ['#tpNewSubtask', '#tpNewComment']) {
      const el = document.querySelector(sel); if (!el) continue;
      out[sel] = lum(getComputedStyle(el).color);
    }
    return out;
  });
  expect(Object.keys(r).length).toBeGreaterThan(0);
  for (const k of Object.keys(r)) expect(r[k], k).toBeGreaterThan(150);
});

test('recorrência: ao escolher "No dia" (anual) a janela continua junto do botão', async ({ page }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.tasks = [{ id: 't1', title: 'T', categoryId: cat, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '2026-11-20', description: '', tagIds: [], recurrence: 'yearly', recurrenceInterval: 1, recurrenceBaseDate: '2026-11-20', subtasks: [], comments: [], attachments: [], createdAt: 1 }];
      currentView = 'tasks'; render(); openTaskPanel('t1');
    });
    await page.click('#tpRecurrenceTrigger');
    await page.evaluate(() => render()); /* o painel é redesenhado e o botão antigo sai da tela */
    await page.click('#recurrencePortal .rec-chip[data-rb="0"]');
    await page.click('#recurrencePortal .rec-chip[data-rb="7"]');
    const d = await page.evaluate(() => {
      const p = document.getElementById('recurrencePortal').getBoundingClientRect();
      const b = document.getElementById('tpRecurrenceTrigger').getBoundingClientRect();
      return { pt: p.top, pl: p.left, bt: b.top, bb: b.bottom, vw: innerWidth, sw: document.documentElement.scrollWidth, show: document.getElementById('recurrencePortal').classList.contains('show') };
    });
    expect(d.show).toBe(true);
    expect(d.pt).toBeGreaterThan(20);
    expect(d.pl > 8 || d.pt > 20).toBe(true); /* o defeito jogava a janela em top=6, left=8 */
    expect(d.pt === 6 && d.pl === 8).toBe(false);
    expect(d.sw).toBeLessThanOrEqual(d.vw);
  }
});
