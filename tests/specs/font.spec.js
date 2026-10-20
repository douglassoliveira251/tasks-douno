import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test('usa a Open Sans hospedada no app, sem fontes externas', async ({ page }) => {
  const external = [];
  page.on('request', r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await gotoApp(page, { view: 'dashboard' });
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return { ok: document.fonts.check("600 16px 'Open Sans Variable'"), family: getComputedStyle(document.body).fontFamily };
  });
  expect(loaded.ok).toBe(true);
  expect(loaded.family).toContain('Open Sans');
  expect(external).toEqual([]);
});
