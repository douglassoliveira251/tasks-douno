import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const dispararEvento = () => {
  window.__promptChamado = 0;
  const ev = new Event('beforeinstallprompt', { cancelable: true });
  ev.prompt = async () => { window.__promptChamado++; };
  ev.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(ev);
};

test('regra: aparece só no navegador, fora do prazo de "agora não" e antes de instalar', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  const r = await page.evaluate(() => {
    const now = Date.now(), dia = 86400000;
    return [
      installPromptAllowed({ standalone: false, installed: false, dismissedAt: 0, now }),
      installPromptAllowed({ standalone: true, installed: false, dismissedAt: 0, now }),
      installPromptAllowed({ standalone: false, installed: true, dismissedAt: 0, now }),
      installPromptAllowed({ standalone: false, installed: false, dismissedAt: now - 5 * dia, now }),
      installPromptAllowed({ standalone: false, installed: false, dismissedAt: now - 31 * dia, now }),
    ];
  });
  expect(r).toEqual([true, false, false, false, true]);
});

test('o aviso aparece quando o navegador permite instalar e "Instalar" abre a instalação', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { localStorage.removeItem('dounoInstallDismissedAt'); localStorage.removeItem('dounoAppInstalled'); });
  await page.evaluate(dispararEvento);
  const card = page.locator('#installCard');
  await expect(card).toBeVisible({ timeout: 8000 });
  await expect(card).toContainText('Instale o DOUNO Tasks');
  await page.locator('#installNow').click();
  await expect(card).toBeHidden();
  expect(await page.evaluate(() => window.__promptChamado)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('dounoAppInstalled'))).toBe('1');
});

test('"Agora não" some por 30 dias e depois volta', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { localStorage.removeItem('dounoInstallDismissedAt'); localStorage.removeItem('dounoAppInstalled'); });
  await page.evaluate(dispararEvento);
  await expect(page.locator('#installCard')).toBeVisible({ timeout: 8000 });
  await page.locator('#installLater').click();
  await expect(page.locator('#installCard')).toBeHidden();
  expect(await page.evaluate(() => Number(localStorage.getItem('dounoInstallDismissedAt')))).toBeGreaterThan(0);

  // dentro dos 30 dias: não mostra de novo
  await page.evaluate(dispararEvento);
  await page.waitForTimeout(3600);
  await expect(page.locator('#installCard')).toHaveCount(0);

  // passados 31 dias: volta a oferecer
  await page.evaluate(() => localStorage.setItem('dounoInstallDismissedAt', String(Date.now() - 31 * 86400000)));
  await page.evaluate(dispararEvento);
  await expect(page.locator('#installCard')).toBeVisible({ timeout: 8000 });
});

test('depois de instalado (appinstalled) o aviso some e não volta', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { localStorage.removeItem('dounoInstallDismissedAt'); localStorage.removeItem('dounoAppInstalled'); });
  await page.evaluate(dispararEvento);
  await expect(page.locator('#installCard')).toBeVisible({ timeout: 8000 });
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#installCard')).toBeHidden();
  await page.evaluate(dispararEvento);
  await page.waitForTimeout(3600);
  await expect(page.locator('#installCard')).toHaveCount(0);
});

test('o aviso espera a tela estar livre (janela aberta)', async ({ page }) => {
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { localStorage.removeItem('dounoInstallDismissedAt'); localStorage.removeItem('dounoAppInstalled'); document.getElementById('aboutOverlay').classList.add('show'); });
  await page.evaluate(dispararEvento);
  await page.waitForTimeout(3600);
  await expect(page.locator('#installCard')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('aboutOverlay').classList.remove('show'));
  await expect(page.locator('#installCard')).toBeVisible({ timeout: 9000 });
});

test('no celular o cartão fica acima da barra de baixo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await gotoApp(page, { view: 'dashboard' });
  await page.evaluate(() => { localStorage.removeItem('dounoInstallDismissedAt'); localStorage.removeItem('dounoAppInstalled'); });
  await page.evaluate(dispararEvento);
  await expect(page.locator('#installCard')).toBeVisible({ timeout: 8000 });
  const card = await page.locator('#installCard').boundingBox();
  const nav = await page.locator('.nav').boundingBox();
  expect(card.y + card.height).toBeLessThanOrEqual(nav.y);
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(390);
});
