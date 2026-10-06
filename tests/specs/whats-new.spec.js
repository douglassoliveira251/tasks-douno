import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

test.describe('Painel de novidades', () => {
  test('abre sozinho na primeira vez e não repete depois de visto', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: null });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);
    await expect(page.locator('.whatsnew-title')).toBeVisible();

    await page.locator('#whatsNewOkBtn').click();
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);

    const seen = await page.evaluate(() => localStorage.getItem('dounoSeenVersion'));
    expect(seen).toBe(await page.evaluate(() => WHATS_NEW[0].version));

    await page.reload();
    await page.waitForFunction(() => typeof render === 'function');
    await page.evaluate(() => { closeLoginGate(); render(); });
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
  });

  test('não abre por cima da tela de login', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.removeItem('dounoSeenVersion'); } catch (e) {} });
    await page.goto('/index.html');
    await expect(page.locator('#loginOverlay')).toHaveClass(/show/);
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
  });

  test('mostra só a última novidade, com a versão atual', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.050' });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);

    await expect(page.locator('.whatsnew-title')).toHaveCount(1);
    const latest = await page.evaluate(() => WHATS_NEW[0]);
    await expect(page.locator('.whatsnew-title')).toHaveText(latest.title);
    await expect(page.locator('.whatsnew-version')).toContainText(latest.version);
    expect(latest.version).toBe(await page.evaluate(() => APP_VERSION));
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

  test('link "Ver histórico completo" lista todas as versões e volta', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.050' });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);

    await page.locator('#whatsNewHistoryBtn').click();
    const total = await page.evaluate(() => WHATS_NEW.length);
    await expect(page.locator('.whatsnew-item')).toHaveCount(total);
    await expect(page.locator('.whatsnew-item').first()).toContainText(await page.evaluate(() => WHATS_NEW[0].version));
    await expect(page.locator('.whatsnew-item').last()).toContainText(await page.evaluate(() => WHATS_NEW[WHATS_NEW.length - 1].version));

    await page.locator('#whatsNewBackBtn').click();
    await expect(page.locator('.whatsnew-title')).toHaveText(await page.evaluate(() => WHATS_NEW[0].title));
    await page.locator('#whatsNewOkBtn').click();
    await expect(page.locator('#whatsNewOverlay')).not.toHaveClass(/show/);
  });

  test('acumula as novidades não vistas abaixo da mais recente', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.103' });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);

    const expected = await page.evaluate(() => WHATS_NEW.slice(1).filter(w => compareVersions(w.version, '1.10.103') > 0).length);
    expect(expected).toBeGreaterThan(1);
    await expect(page.locator('.whatsnew-title')).toHaveText(await page.evaluate(() => WHATS_NEW[0].title));
    await expect(page.locator('.whatsnew-prev-label')).toBeVisible();
    await expect(page.locator('.whatsnew-prev-list li')).toHaveCount(expected);

    // a lista continua ao ir ao histórico e voltar, mesmo com a versão já gravada como vista
    await page.locator('#whatsNewHistoryBtn').click();
    await page.locator('#whatsNewBackBtn').click();
    await expect(page.locator('.whatsnew-prev-list li')).toHaveCount(expected);

    // reaberto depois de visto: só a mais recente
    await page.locator('#whatsNewOkBtn').click();
    await page.locator('#topbarAvatarBtn').click();
    await page.locator('#avatarMenuWhatsNewBtn').click();
    await expect(page.locator('.whatsnew-prev')).toHaveCount(0);
  });

  test('quem nunca abriu o sistema vê só a mais recente', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: null });
    await expect(page.locator('#whatsNewOverlay')).toHaveClass(/show/);
    await expect(page.locator('.whatsnew-prev')).toHaveCount(0);
  });

  test('bolinha aparece no menu quando há novidade não vista', async ({ page }) => {
    await gotoApp(page, { view: 'dashboard', seenVersion: '1.10.050' });
    await page.locator('#whatsNewOkBtn').click();

    await page.evaluate(() => { localStorage.setItem('dounoSeenVersion', '1.10.050'); updateWhatsNewDot(); });
    await page.locator('#topbarAvatarBtn').click();
    await expect(page.locator('#whatsNewDot')).toBeVisible();
  });
});
