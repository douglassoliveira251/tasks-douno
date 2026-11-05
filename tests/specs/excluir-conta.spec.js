import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

async function abrirConta(page) {
  await gotoApp(page, { view: 'settings' });
  await page.evaluate(() => {
    cloudSession = { access_token: 'tk', user: { id: 'u1', email: 'Teste@Teste.com' } };
    settingsTab = 'perfil';
    render();
  });
}

test.describe('Excluir conta', () => {
  test('sem conta na nuvem a zona de perigo não aparece', async ({ page }) => {
    await gotoApp(page, { view: 'settings' });
    await page.evaluate(() => { settingsTab = 'perfil'; render(); });
    await expect(page.locator('#deleteAccountBtn')).toHaveCount(0);
  });

  test('só libera o botão com o e-mail certo e a senha preenchida', async ({ page }) => {
    await abrirConta(page);
    await page.locator('#deleteAccountBtn').click();
    const confirmar = page.locator('#delAccConfirmBtn');
    await expect(confirmar).toBeDisabled();
    await page.locator('#delAccEmail').fill('outro@email.com');
    await page.locator('#delAccPassword').fill('abc12345');
    await expect(confirmar).toBeDisabled();
    await page.locator('#delAccEmail').fill('teste@teste.com');
    await expect(confirmar).toBeEnabled();
    await page.locator('#delAccCancelBtn').click();
    await expect(page.locator('#deleteAccountOverlay')).not.toHaveClass(/show/);
  });

  test('erro do servidor (senha errada) mantém a janela aberta e mostra a mensagem', async ({ page }) => {
    await abrirConta(page);
    await page.route('**/api/account/delete', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Senha incorreta.' }) }));
    await page.locator('#deleteAccountBtn').click();
    await page.locator('#delAccEmail').fill('teste@teste.com');
    await page.locator('#delAccPassword').fill('errada');
    await page.locator('#delAccConfirmBtn').click();
    await expect(page.locator('#delAccError')).toHaveText('Senha incorreta.');
    await expect(page.locator('#deleteAccountOverlay')).toHaveClass(/show/);
    expect(await page.evaluate(() => !!cloudSession)).toBe(true);
  });

  test('exclusão concluída envia e-mail e senha, encerra a sessão e volta ao login', async ({ page }) => {
    await abrirConta(page);
    let corpo = null;
    let auth = null;
    await page.route('**/api/account/delete', (r) => {
      corpo = r.request().postDataJSON();
      auth = r.request().headers()['authorization'];
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.locator('#deleteAccountBtn').click();
    await page.locator('#delAccEmail').fill('teste@teste.com');
    await page.locator('#delAccPassword').fill('abc12345');
    await page.locator('#delAccConfirmBtn').click();
    await expect(page.locator('#loginOverlay')).toHaveClass(/show/);
    expect(corpo).toEqual({ email: 'teste@teste.com', password: 'abc12345' });
    expect(auth).toMatch(/^Bearer /);
    expect(await page.evaluate(() => cloudSession)).toBeNull();
    await expect(page.locator('#deleteAccountOverlay')).not.toHaveClass(/show/);
  });
});
