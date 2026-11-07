import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('a página declara o manifesto e a cor do tema (app instalável)', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#2F5F9E');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test.describe('arquivos do app instalável (só no build)', () => {
  test.skip(!process.env.TEST_DIST, 'os arquivos de public/ só existem no build');

  test('manifesto válido, ícones e service worker são servidos', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBe('DOUNO Tasks');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/app');
    expect(m.icons.some(i => i.sizes === '192x192')).toBe(true);
    expect(m.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
    for (const icon of m.icons) {
      const r = await request.get(icon.src);
      expect(r.ok(), icon.src).toBe(true);
      expect(r.headers()['content-type']).toContain('image/png');
    }
    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBe(true);
    expect(await sw.text()).toContain("addEventListener('fetch'");
  });
});
