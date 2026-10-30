import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const open = async (page, path) => {
  await page.goto(path);
  await page.waitForFunction(() => typeof render === 'function');
  await page.evaluate(() => { closeLoginGate(); render(); });
};
const view = (page) => page.evaluate(() => currentView);
const pathOf = (page) => new URL(page.url()).pathname;

test.describe('Rotas: um endereço por tela', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('dounoSeenVersion', '999.0.0'); } catch (e) {} });
  });

  test('cada endereço abre a sua tela', async ({ page }) => {
    for (const [path, v] of [['/app/tarefas', 'tasks'], ['/app/notas', 'notes'], ['/app/calendario', 'calendar'], ['/app/projetos', 'projects'], ['/app/configuracoes', 'settings'], ['/app', 'dashboard']]) {
      await open(page, path);
      expect(await view(page)).toBe(v);
      expect(pathOf(page)).toBe(path);
    }
  });

  test('trocar de tela muda o endereço e o voltar do navegador acompanha', async ({ page }) => {
    await open(page, '/app/tarefas');
    await page.locator('.nav-item[data-view="notes"]').click();
    expect(pathOf(page)).toBe('/app/notas');
    await page.locator('.nav-item[data-view="calendar"]').click();
    expect(pathOf(page)).toBe('/app/calendario');
    expect(await page.title()).toBe('Calendário · DOUNO Tasks');

    await page.goBack();
    await expect.poll(() => view(page)).toBe('notes');
    expect(pathOf(page)).toBe('/app/notas');
    await expect(page.locator('.nav-item[data-view="notes"]')).toHaveClass(/active/);
    await page.goBack();
    await expect.poll(() => view(page)).toBe('tasks');
    await page.goForward();
    await expect.poll(() => view(page)).toBe('notes');
  });

  test('recarregar mantém a tela', async ({ page }) => {
    await open(page, '/app/projetos');
    await page.reload();
    await page.waitForFunction(() => typeof render === 'function');
    expect(await view(page)).toBe('projects');
    expect(pathOf(page)).toBe('/app/projetos');
  });

  test('o Resumo é a página inicial: / e /app abrem em /app', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof render === 'function');
    expect(await view(page)).toBe('dashboard');
    expect(pathOf(page)).toBe('/app');
    expect(await page.title()).toBe('DOUNO Tasks');

    await open(page, '/app/calendario');
    await page.goto('/app');
    await page.waitForFunction(() => typeof render === 'function');
    expect(await view(page)).toBe('dashboard');
    expect(pathOf(page)).toBe('/app');
  });

  test('a raiz não deixa entrada extra no histórico e mantém a query', async ({ page }) => {
    await page.goto('/index.html?outlook=connected');
    await page.waitForFunction(() => typeof render === 'function');
    expect(new URL(page.url()).search).toBe('?outlook=connected');
    expect(pathOf(page)).toBe('/app');
    expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(2);
  });

  test('aberto como arquivo (sem servidor), usa # no lugar do caminho', async ({ page }) => {
    const url = pathToFileURL(resolve('..', 'index.html')).href;
    await page.goto(url + '#/notas');
    await page.waitForFunction(() => typeof render === 'function');
    expect(await view(page)).toBe('notes');
    await page.evaluate(() => { closeLoginGate(); });
    await page.locator('.nav-item[data-view="calendar"]').click();
    expect(await page.evaluate(() => location.hash)).toBe('#/calendario');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('notes');
  });

  test('endereços desconhecidos (/app/xyz, /app/resumo) viram /app; os arquivos carregam de qualquer profundidade', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) errors.push(r.status() + ' ' + r.url()); });
    for (const path of ['/app/inexistente', '/app/resumo']) {
      await page.goto(path);
      await page.waitForFunction(() => typeof render === 'function');
      expect(await view(page)).toBe('dashboard');
      expect(pathOf(page)).toBe('/app');
    }
    await page.goto('/app/notas/qualquer/coisa');
    await page.waitForFunction(() => typeof render === 'function');
    expect(await view(page)).toBe('notes');
    expect(errors).toEqual([]);
  });
});
