import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Backup (modo nuvem)', () => {
  test('importar backup substitui o state e agenda a gravação na nuvem', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });

    await page.evaluate(() => {
      cloudSession = { user: { id: 'fake-id', email: 'teste@teste.com' } };
      window.__cloudWrites = 0;
      writeStateToCloud = async () => { window.__cloudWrites++; };
      state.tasks = [];
      settingsTab = 'arquivo';
      render();
    });

    await expect(page.locator('#importBackupBtn')).toBeVisible();
    await expect(page.locator('#downloadBackupBtn')).toBeVisible();

    page.on('dialog', (d) => d.accept());
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importBackupBtn').click();
    const chooser = await chooserPromise;

    const backup = await page.evaluate(() => {
      const s = JSON.parse(JSON.stringify(state));
      s.tasks = [{ id: 'imp1', title: 'Tarefa importada', done: false, status: 'nao_iniciado', categoryId: s.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [] }];
      return JSON.stringify(s);
    });
    await chooser.setFiles({ name: 'douno-tasks.json', mimeType: 'application/json', buffer: Buffer.from(backup) });

    await page.waitForFunction(() => state.tasks.length === 1 && window.__cloudWrites > 0);
    const title = await page.evaluate(() => state.tasks[0].title);
    expect(title).toBe('Tarefa importada');
  });

  test('importar arquivo inválido não altera o state', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => {
      cloudSession = { user: { id: 'fake-id', email: 'teste@teste.com' } };
      state.tasks = [{ id: 'keep', title: 'Mantida', done: false, status: 'nao_iniciado', categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [] }];
      settingsTab = 'arquivo';
      render();
    });

    let alertMsg = null;
    page.on('dialog', (d) => { alertMsg = d.message(); d.accept(); });
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importBackupBtn').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });

    await page.waitForTimeout(300);
    const title = await page.evaluate(() => state.tasks[0].title);
    expect(title).toBe('Mantida');
    expect(alertMsg).toContain('inválido');
  });
});
