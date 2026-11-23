import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Nomes acessíveis dos controles que só têm ícone, rótulos dos campos de prazo e título de nível 1. */
test.describe('Acessibilidade básica', () => {
  test('botões só de ícone e campos de prazo têm nome; a tela tem um título de nível 1', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.tasks = [{ id: 't1', shortId: '0001', title: 'Tarefa', status: 'nao_iniciado', priority: 'media', categoryId: cat, tagIds: [], subtasks: [{ id: 's1', title: 'sub', done: false }], comments: [], attachments: [], createdAt: 1, dueDate: '2026-11-25' }];
      render(); openTaskPanel('t1');
    });
    await expect(page.locator('#tpDate')).toHaveAttribute('aria-label', /prazo/i);
    await expect(page.locator('#tpTime')).toHaveAttribute('aria-label', /prazo/i);
    await expect(page.locator('.task-row .task-menu-btn').first()).toHaveAttribute('aria-label', /opções/i);
    await expect(page.locator('.tp-subtask-del').first()).toHaveAttribute('aria-label', /subtarefa/i);
    await expect(page.locator('#helpCloseBtn')).toHaveAttribute('aria-label', 'Fechar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('Biblioteca: linha clicável não é "botão" com botões dentro', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      const cat = state.categories[0].id;
      state.libItems = [{ id: 'l1', type: 'link', title: 'Link', url: 'https://exemplo.com', description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 }];
      currentView = 'library'; render();
    });
    const linha = page.locator('.lib-row[data-item="l1"]');
    await expect(linha).toHaveCount(1);
    await expect(linha).not.toHaveAttribute('role', 'button');
  });
});
