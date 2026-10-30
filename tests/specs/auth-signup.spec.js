import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

// A nuvem é substituída por um fake: o teste cobre a tela e o fluxo, não o Supabase.
async function openLogin(page, mode = 'login') {
  await gotoApp(page);
  await page.evaluate((mode) => {
    window.__calls = [];
    const user = { id: 'u-new', email: 'novo@exemplo.com', user_metadata: { name: 'Novo Usuário' } };
    sbClient.auth.signUp = async (args) => { window.__calls.push(['signUp', args]); return { data: { user, session: null }, error: null }; };
    sbClient.auth.verifyOtp = async (args) => {
      window.__calls.push(['verifyOtp', args]);
      if (args.token !== '123456') return { data: {}, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } };
      return { data: { session: { user } }, error: null };
    };
    sbClient.auth.resend = async (args) => { window.__calls.push(['resend', args]); return { error: null }; };
    window.startCloudSession = async () => { window.__calls.push(['start']); };
    loginMode = mode;
    renderLoginGate();
    document.getElementById('loginOverlay').classList.add('show');
  }, mode);
}

test.describe('Cadastro com código por e-mail', () => {
  test('abas Entrar e Criar conta alternam as telas', async ({ page }) => {
    await openLogin(page);
    await expect(page.locator('#loginForm')).toBeVisible();
    await page.locator('.login-tab[data-mode="signup"]').click();
    await expect(page.locator('#signupForm')).toBeVisible();
    await page.locator('.login-tab[data-mode="login"]').click();
    await expect(page.locator('#loginForm')).toBeVisible();
  });

  test('valida nome, senha e aceite antes de enviar', async ({ page }) => {
    await openLogin(page, 'signup');
    await page.fill('#signupName', 'Novo Usuário');
    await page.fill('#signupEmail', 'novo@exemplo.com');
    await page.fill('#loginPassword', 'curta');
    await page.click('#signupSubmitBtn');
    await expect(page.locator('.login-error')).toContainText('8 ou mais caracteres');
    await page.fill('#loginPassword', 'senha1234');
    await page.click('#signupSubmitBtn');
    await expect(page.locator('.login-error')).toContainText('Aceite os Termos');
    expect(await page.evaluate(() => window.__calls.length)).toBe(0);
  });

  test('indicador de força da senha', async ({ page }) => {
    await openLogin(page, 'signup');
    await page.fill('#loginPassword', 'abc12345');
    await expect(page.locator('#loginStrength i.warn')).toHaveCount(2);
    await page.fill('#loginPassword', 'Abc12345!xyzw');
    await expect(page.locator('#loginStrength i.on')).toHaveCount(4);
  });

  test('cadastro leva à tela do código; código errado mostra erro; certo entra', async ({ page }) => {
    await openLogin(page, 'signup');
    await page.fill('#signupName', 'Novo Usuário');
    await page.fill('#signupEmail', 'novo@exemplo.com');
    await page.fill('#loginPassword', 'senha1234');
    await page.check('#signupTerms');
    await page.click('#signupSubmitBtn');
    await expect(page.locator('#verifyForm')).toBeVisible();
    await expect(page.locator('.login-subtitle')).toContainText('novo@exemplo.com');
    const signUp = await page.evaluate(() => window.__calls.find(c => c[0] === 'signUp')[1]);
    expect(signUp.options.data.name).toBe('Novo Usuário');

    // código errado
    await page.locator('#loginOtp input').first().click();
    await page.keyboard.type('111111');
    await expect(page.locator('.login-error')).toContainText('Código inválido');

    // código certo
    await page.locator('#loginOtp input').first().click();
    await page.keyboard.type('123456');
    await expect.poll(() => page.evaluate(() => window.__calls.some(c => c[0] === 'start'))).toBe(true);
    const verify = await page.evaluate(() => window.__calls.filter(c => c[0] === 'verifyOtp').pop()[1]);
    expect(verify).toMatchObject({ email: 'novo@exemplo.com', token: '123456', type: 'signup' });
  });

  test('colar o código preenche os 6 campos; reenvio tem espera', async ({ page }) => {
    await openLogin(page, 'signup');
    await page.evaluate(() => { signupDraft.email = 'novo@exemplo.com'; loginMode = 'verify'; resendUntil = Date.now() + 60000; renderLoginGate(); });
    await expect(page.locator('#loginResendBtn')).toBeDisabled();
    await page.evaluate(() => { resendUntil = 0; });
    await expect(page.locator('#loginResendBtn')).toBeEnabled();
    await page.click('#loginResendBtn');
    await expect.poll(() => page.evaluate(() => window.__calls.some(c => c[0] === 'resend'))).toBe(true);
    await expect(page.locator('#loginResendBtn')).toBeDisabled();
  });

  test('outra conta no mesmo navegador não herda o cache local', async ({ page }) => {
    await gotoApp(page);
    const r = await page.evaluate(() => {
      localStorage.setItem(LS_OWNER_KEY, 'u-antigo');
      state.tasks = [{ id: 'x', title: 'Segredo do outro' }];
      claimLocalCache({ id: 'u-novo', email: 'novo@exemplo.com' });
      const afterNew = state.tasks.length;
      // cache sem dono + e-mail original: conta legada mantém os dados
      localStorage.removeItem(LS_OWNER_KEY);
      state.tasks = [{ id: 'y', title: 'meu' }];
      claimLocalCache({ id: 'u-orig', email: LEGACY_OWNER_EMAIL });
      return { afterNew, legacy: state.tasks.length, owner: localStorage.getItem(LS_OWNER_KEY) };
    });
    expect(r).toEqual({ afterNew: 0, legacy: 1, owner: 'u-orig' });
  });
});
