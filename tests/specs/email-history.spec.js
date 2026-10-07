import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Agenda: histórico de e-mails no campo Para', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, { view: 'calendar' });
    await page.evaluate(() => {
      state.events = [];
      state.emailHistory = ['ana@empresa.com', 'bruno@outra.com', 'ana.silva@teste.com'];
      render();
      openEventComposer(null, todayStr());
    });
  });

  test('sugere ao digitar e insere o e-mail escolhido', async ({ page }) => {
    await page.locator('#evAttendees').click();
    await expect(page.locator('.ev-suggest-item')).toHaveCount(3);

    await page.locator('#evAttendees').fill('an');
    await expect(page.locator('.ev-suggest-item')).toHaveCount(2);

    await page.locator('.ev-suggest-item', { hasText: 'ana@empresa.com' }).click({ position: { x: 20, y: 10 } });
    await expect(page.locator('#evAttendees')).toHaveValue('ana@empresa.com, ');
  });

  test('o "×" remove o e-mail do histórico', async ({ page }) => {
    await page.locator('#evAttendees').click();
    await page.locator('.ev-suggest-item', { hasText: 'bruno@outra.com' }).locator('.ev-suggest-del').click();
    await expect(page.locator('.ev-suggest-item')).toHaveCount(2);
    expect(await page.evaluate(() => state.emailHistory)).toEqual(['ana@empresa.com', 'ana.silva@teste.com']);
  });

  test('salvar guarda os e-mails no histórico, os mais recentes primeiro', async ({ page }) => {
    await page.locator('#evTitle').fill('Reunião');
    await page.locator('#evAttendees').fill('novo@cliente.com, ana@empresa.com');
    await page.locator('#evSaveBtn').click();
    expect(await page.evaluate(() => state.emailHistory)).toEqual(['novo@cliente.com', 'ana@empresa.com', 'bruno@outra.com', 'ana.silva@teste.com']);
  });
});

test('anexo da tarefa tem botão para baixar', async ({ page }) => {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    state.tasks = [{
      id: 't1', title: 'Com anexo', done: false, status: 'nao_iniciado', priority: 'media', dueDate: todayStr(), dueTime: '09:00',
      categoryId: cat, tagIds: [], subtasks: [], comments: [], description: '',
      attachments: [{ id: 'a1', name: 'contrato.txt', type: 'text/plain', dataUrl: 'data:text/plain;base64,T2zDoQ==' }],
    }];
    currentView = 'tasks';
    render();
  });
  await page.locator('.task-row .task-title').first().click();
  const download = page.waitForEvent('download');
  await page.locator('.tp-attach-dl').click();
  expect((await download).suggestedFilename()).toBe('contrato.txt');
});
