import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Templates de tarefa', () => {
  test('criar um template no editor e aplicar gera tarefa, subtarefas e agenda', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => { state.tasks = []; state.events = []; state.taskTemplates = []; render(); openTemplateEditor(null); });

    await page.locator('#tplName').fill('Fechamento mensal');
    await page.locator('#tplTitle').fill('Fechar o mês');
    await page.locator('#tplDesc').fill('Conferir lançamentos');
    await page.locator('#tplPriority').selectOption('alta');
    await page.locator('#tplTime').fill('10:30');
    await page.locator('#tplSubtasks').fill('Conciliar banco\nEnviar relatório');
    await page.locator('#tplAddEvent').click();
    await page.locator('.tpl-ev-row [data-f="title"]').fill('Reunião de fechamento');
    await page.locator('.tpl-ev-row [data-f="offsetDays"]').fill('2');
    await page.locator('.tpl-ev-row [data-f="startTime"]').fill('15:00');
    await page.locator('#tplSave').click();

    const saved = await page.evaluate(() => state.taskTemplates[0]);
    expect(saved.name).toBe('Fechamento mensal');
    expect(saved.subtasks.map(s => s.title)).toEqual(['Conciliar banco', 'Enviar relatório']);
    expect(saved.events[0]).toMatchObject({ title: 'Reunião de fechamento', offsetDays: 2, startTime: '15:00' });

    // aplicar pelo botão Template
    await page.locator('#useTemplateBtn').click();
    await page.locator('[data-tpl]').first().click();

    const r = await page.evaluate(() => ({
      task: state.tasks[0], events: state.events, today: todayStr(), plus2: addDaysStr(todayStr(), 2),
    }));
    expect(r.task.title).toBe('Fechar o mês');
    expect(r.task.priority).toBe('alta');
    expect(r.task.dueTime).toBe('10:30');
    expect(r.task.dueDate).toBe(r.today);
    expect(r.task.subtasks.map(s => s.title)).toEqual(['Conciliar banco', 'Enviar relatório']);
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ title: 'Reunião de fechamento', date: r.plus2, startTime: '15:00', linkedTaskId: r.task.id });
  });

  test('"Salvar como template" no menu da tarefa abre o editor já preenchido', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.taskTemplates = [];
      state.tasks = [{
        id: 't1', title: 'Relatório semanal', done: false, status: 'nao_iniciado', priority: 'critica', dueDate: todayStr(), dueTime: '08:00',
        categoryId: cat, tagIds: [], description: 'Montar e enviar', recurrence: 'weekly', recurrenceInterval: 1,
        subtasks: [{ id: 's1', title: 'Coletar dados', done: false }], comments: [], attachments: [],
      }];
      state.events = [];
      currentView = 'tasks'; render();
    });
    await page.locator('.task-row .task-menu-btn').first().click();
    await page.locator('[data-action="template"]').click();
    await expect(page.locator('#tplName')).toHaveValue('Relatório semanal');
    await expect(page.locator('#tplPriority')).toHaveValue('critica');
    await expect(page.locator('#tplSpaces .tpl-tag-chip.on')).toHaveCount(1);
    await expect(page.locator('#tplRec')).toHaveValue('weekly');
    await expect(page.locator('#tplSubtasks')).toHaveValue('Coletar dados');
  });

  test('aba Templates em Configurações lista, duplica e exclui', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => {
      state.taskTemplates = [{ id: 'tp1', name: 'Modelo A', categoryId: '', title: 'A', description: '', priority: 'media', tagIds: [], dueTime: '', recurrence: 'none', recurrenceInterval: 1, subtasks: [], events: [] }];
      settingsTab = 'templates'; currentView = 'settings'; render();
    });
    await expect(page.locator('.tpl-card')).toHaveCount(1);
    await page.locator('[data-act="dup"]').click();
    await expect(page.locator('.tpl-card')).toHaveCount(2);
    page.once('dialog', d => d.accept());
    await page.locator('.tpl-card').nth(1).locator('[data-act="del"]').click();
    await expect(page.locator('.tpl-card')).toHaveCount(1);
  });
});

test.describe('Enviar comentários', () => {
  test('envia o tipo e a mensagem para a função send-feedback', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      cloudSession = { user: { id: 'u1', email: 't@t.com' } };
      window.__fb = null;
      Object.defineProperty(sbClient, 'functions', { configurable: true, value: { invoke: async (name, opts) => { window.__fb = { name, body: opts.body }; return { data: { ok: true }, error: null }; } } });
    });
    await page.locator('#helpBtn').click();
    await page.locator('#helpFeedbackBtn').click();
    await page.locator('.fb-kind.bad').click();
    await page.locator('#fbMessage').fill('A lista poderia ter atalhos');
    await page.locator('#fbSend').click();

    await expect.poll(() => page.evaluate(() => window.__fb && window.__fb.name)).toBe('send-feedback');
    const body = await page.evaluate(() => window.__fb.body);
    expect(body).toMatchObject({ kind: 'bad', message: 'A lista poderia ter atalhos' });
    expect(body.version).toMatch(/^1\./);
    await expect(page.locator('#feedbackOverlay')).not.toHaveClass(/show/);
    await page.evaluate(() => { cloudSession = null; });
  });

  test('sem mensagem ou sem login mostra aviso e não envia', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.locator('#helpBtn').click();
    await page.locator('#helpFeedbackBtn').click();
    await page.locator('#fbSend').click();
    await expect(page.locator('#fbError')).toContainText('Escreva');
    await page.locator('#fbMessage').fill('Teste');
    await page.locator('#fbSend').click();
    await expect(page.locator('#fbError')).toContainText('Entre na sua conta');
  });
});

test('Nova tarefa: seletor de template cria a tarefa preenchida', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    state.tasks = []; state.events = [];
    state.taskTemplates = [{ id: 'tp1', name: 'Modelo', categoryId: '', title: 'Tarefa do modelo', description: 'x', priority: 'alta', tagIds: [], dueTime: '11:00', recurrence: 'none', recurrenceInterval: 1, subtasks: [{ title: 'Passo 1' }], events: [] }];
    currentView = 'tasks'; render();
    openNewTaskPanel();
  });
  await page.locator('#tpMenuBtn').click();
  await page.locator('[data-m="use"]').click();
  await page.locator('[data-tpl="tp1"]').click();
  const t = await page.evaluate(() => state.tasks[0]);
  expect(t.title).toBe('Tarefa do modelo');
  expect(t.subtasks.map(s => s.title)).toEqual(['Passo 1']);
  await expect(page.locator('#tpMenuBtn')).toBeVisible();
});

test('template só aparece nos espaços escolhidos', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  const r = await page.evaluate(() => {
    if(state.categories.length < 2) state.categories.push({ id: 'cat_b', name: 'Outro', color: '#9B5DE5' });
    const [a, b] = [state.categories[0].id, state.categories[1].id];
    const mk = (id, ids, legacy) => Object.assign({ id, name: id, title: id, description: '', priority: 'media', tagIds: [], dueTime: '', recurrence: 'none', recurrenceInterval: 1, subtasks: [], events: [] }, legacy ? { categoryId: '' } : { categoryIds: ids });
    state.taskTemplates = [mk('so-a', [a]), mk('so-b', [b]), mk('ambos', [a, b]), mk('antigo', [], true)];
    const ids = c => templatesForSpace(c).map(t => t.id).sort();
    return { a: ids(a), b: ids(b), todos: ids(null) };
  });
  expect(r.a).toEqual(['ambos', 'antigo', 'so-a']);
  expect(r.b).toEqual(['ambos', 'antigo', 'so-b']);
  expect(r.todos).toHaveLength(4);
});

test('menu ⋮ do painel: tarefa nova só tem as opções de template; existente tem duplicar/mover/excluir', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => { state.tasks = []; state.taskTemplates = []; currentView = 'tasks'; render(); openNewTaskPanel(); });
  await page.locator('#tpMenuBtn').click();
  await expect(page.locator('[data-m="use"]')).toBeVisible();
  await expect(page.locator('[data-m="manage"]')).toBeVisible();
  await expect(page.locator('[data-m="dup"]')).toHaveCount(0);
  await expect(page.locator('[data-m="del"]')).toHaveCount(0);
  await expect(page.locator('[data-m="save"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    state.tasks = [{ id: 't9', title: 'Existente', done: false, status: 'nao_iniciado', priority: 'media', dueDate: todayStr(), dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
    activeTaskId = 't9'; creatingNewTask = false; currentView = 'tasks'; render();
  });
  await page.locator('#tpMenuBtn').click();
  for (const k of ['use', 'save', 'manage', 'dup', 'move', 'del']) await expect(page.locator('[data-m="' + k + '"]')).toBeVisible();
  await page.locator('[data-m="dup"]').click();
  expect(await page.evaluate(() => state.tasks.length)).toBe(2);
});
