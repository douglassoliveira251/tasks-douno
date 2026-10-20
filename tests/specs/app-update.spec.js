import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Aviso de atualização', () => {
  test('compara versões', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => [versionIsNewer('1.10.143', '1.10.142'), versionIsNewer('1.10.142', '1.10.142'), versionIsNewer('1.9.999', '1.10.0'), versionIsNewer('2.0.0', '1.99.99')]);
    expect(r).toEqual([true, false, false, true]);
  });

  test('versão igual não mostra aviso', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => checkForAppUpdate(true));
    await expect(page.locator('#updateOverlay')).toHaveCount(0);
  });

  test('versão nova mostra aviso obrigatório e recarrega ao confirmar', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => {
      window.__reloaded = 0;
      reloadForUpdate = () => { window.__reloaded++; };
      fetchPublishedVersion = async () => '99.0.0';
    });
    await page.evaluate(() => checkForAppUpdate(true));
    const ov = page.locator('#updateOverlay');
    await expect(ov).toBeVisible();
    await expect(ov).toContainText('Nova versão disponível');
    // obrigatório: Esc e clique fora não fecham
    await page.keyboard.press('Escape');
    await ov.click({ position: { x: 5, y: 5 } });
    await expect(ov).toBeVisible();
    await page.locator('#updateNowBtn').click();
    await expect.poll(() => page.evaluate(() => window.__reloaded)).toBe(1);
  });
});
