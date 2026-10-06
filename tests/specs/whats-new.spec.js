import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Painel de novidades', () => {
  test('abre sozinho na primeira vez e não repete depois de visto', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: null });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);
    await expect(page.locator('.whatsnew-entry').first()).toBeVisible();

    await page.locator('#whatsNewCloseBtn').click();
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);

    const seen = await page.evaluate(() => localStorage.getItem('dounoSeenVersion'));
    expect(seen).toBe(await page.evaluate(() => WHATS_NEW[0].version));

    await page.reload();
    await page.waitForFunction(() => typeof render === 'function');
    await page.evaluate(() => { closeLoginGate(); render(); });
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
  });

  test('só marca como NOVO o que veio depois da versão já vista', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.098' });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);

    const result = await page.evaluate(() => {
      const entries = [...document.querySelectorAll('.whatsnew-entry')];
      return entries.map((e) => ({
        version: e.querySelector('.whatsnew-version').textContent,
        isNew: !!e.querySelector('.whatsnew-new'),
      }));
    });
    const novos = result.filter((r) => r.isNew).map((r) => r.version);
    expect(novos).toEqual(expect.arrayContaining(['1.10.101', '1.10.100', '1.10.099']));
    expect(novos).not.toContain('1.10.097');
    expect(result.find((r) => r.version === '1.10.097').isNew).toBe(false);
  });

  test('versão já vista: não abre sozinho, bolinha some, e abre pelo menu', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard' });
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
    await expect(page.locator('#whatsNewDot')).toBeHidden();

    await page.locator('#topbarAvatarBtn').click();
    await page.locator('#avatarMenuWhatsNewBtn').click();
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
  });

  test('bolinha aparece no menu quando há novidade não vista', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.098' });
    await page.locator('#whatsNewCloseBtn').click();
    await expect(page.locator('#whatsNewDot')).toBeHidden();

    await page.evaluate(() => { localStorage.setItem('dounoSeenVersion', '1.10.098'); updateWhatsNewDot(); });
    await page.locator('#topbarAvatarBtn').click();
    await expect(page.locator('#whatsNewDot')).toBeVisible();
  });
});
