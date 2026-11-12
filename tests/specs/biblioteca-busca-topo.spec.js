import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
for (const [w,h,n] of [[1280,800,'d'],[390,800,'m']]) test('busca topo '+n, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(() => { state.libItems = [{id:'a',type:'link',title:'GitHub',url:'https://github.com',favorite:false,folderId:null,categoryId:null,createdAt:1}]; render(); });
  const s = page.locator('.lib-topsearch #libSearch');
  await expect(s).toBeVisible();
  await s.fill('git');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await s.fill('zzz');
  await expect(page.locator('.lib-row')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/busca-'+n+'.png' });
  await page.evaluate(() => { currentView='tasks'; render(); });
  await expect(page.locator('.lib-topsearch')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
});
