import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const seed = () => {
  const cat = state.categories[0].id;
  state.tasks = [{ id: 't1', title: 'Tarefa', done: false, status: 'nao_iniciado', priority: 'media', dueDate: todayStr(), dueTime: '09:00', categoryId: cat, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
  activeTaskId = 't1'; creatingNewTask = false; currentView = 'tasks'; render();
};

test.describe('Rascunho de comentário', () => {
  test('mudar um campo da tarefa não apaga o comentário em digitação', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#tpNewComment').fill('Preciso ligar para o fornecedor');
    // altera a prioridade (redesenha o painel)
    await page.locator('.tp-priority-btn[data-p="alta"]').click();
    await expect(page.locator('#tpNewComment')).toHaveValue('Preciso ligar para o fornecedor');
    expect(await page.evaluate(() => state.tasks[0].priority)).toBe('alta');
  });

  test('o rascunho volta ao reabrir a tarefa e some depois de enviado', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#tpNewComment').fill('rascunho');
    await page.evaluate(() => { activeTaskId = null; render(); activeTaskId = 't1'; render(); });
    await expect(page.locator('#tpNewComment')).toHaveValue('rascunho');
    await page.locator('#tpAddCommentBtn').click();
    await expect(page.locator('#tpNewComment')).toHaveValue('');
    expect(await page.evaluate(() => state.tasks[0].comments.map(c => c.text))).toEqual(['rascunho']);
  });

  test('fechar com comentário não enviado pergunta; descartar fecha sem enviar', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#tpNewComment').fill('talvez');
    await page.evaluate(() => closeTaskPanel());
    await expect(page.locator('#unsentCommentOverlay')).toHaveClass(/show/);
    await page.locator('#unsentBack').click();
    expect(await page.evaluate(() => activeTaskId)).toBe('t1'); // continua aberta

    await page.evaluate(() => closeTaskPanel());
    await page.locator('#unsentDiscard').click();
    expect(await page.evaluate(() => activeTaskId)).toBeNull();
    expect(await page.evaluate(() => state.tasks[0].comments.length)).toBe(0);
  });

  test('enviar e fechar grava o comentário', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.locator('#tpNewComment').fill('vai salvar');
    await page.evaluate(() => closeTaskPanel());
    await page.locator('#unsentSend').click();
    expect(await page.evaluate(() => activeTaskId)).toBeNull();
    expect(await page.evaluate(() => state.tasks[0].comments.map(c => c.text))).toEqual(['vai salvar']);
  });

  test('sem comentário digitado, fecha direto', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => closeTaskPanel());
    await expect(page.locator('#unsentCommentOverlay')).toHaveCount(0);
    expect(await page.evaluate(() => activeTaskId)).toBeNull();
  });
});

test('esconder a aba não envia o comentário; o rascunho sobrevive ao recarregar', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(seed);
  await page.locator('#tpNewComment').fill('só rascunho');
  await page.evaluate(() => { commitOpenEditors(); });
  expect(await page.evaluate(() => state.tasks[0].comments.length)).toBe(0);
  const saved = await page.evaluate(() => sessionStorage.getItem('dounoCommentDrafts'));
  expect(JSON.parse(saved)).toEqual({ t1: 'só rascunho' });
});
