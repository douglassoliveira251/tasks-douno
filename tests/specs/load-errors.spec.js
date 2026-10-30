import { test, expect } from '@playwright/test';

// Rede de segurança dos módulos: um erro ao carregar qualquer arquivo (importação que falta, uso de
// algo antes de existir) quebra aqui, e não em um teste qualquer sem pista.
test('a página carrega todos os arquivos sem erro', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) errors.push(r.status() + ' ' + r.url()); });
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof render === 'function' && typeof boot === 'function');
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  const entry = await page.evaluate(() => Array.from(document.querySelectorAll('script[type="module"][src]')).length);
  expect(entry).toBe(1);
});
