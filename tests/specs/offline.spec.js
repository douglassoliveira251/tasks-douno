import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const USER = { access_token: 't', user: { id: 'u1', email: 't@t.com' } };

test.describe('Sem internet', () => {
  test('aviso "Sem conexão", alterações ficam no aparelho e sobem sozinhas quando a conexão volta', async ({ page, context }) => {
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate((u) => {
      cloudSession = u;
      window.__writes = 0;
      writeStateToCloud = async () => { window.__writes++; };
      state.tasks = [];
    }, USER);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    const badge = page.locator('#saveErrorBadge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/offline/);
    await expect(badge.locator('.badge-text')).toHaveText('Sem conexão');

    // edita sem internet: guarda no aparelho, marca como pendente e não tenta enviar
    await page.evaluate(() => {
      state.tasks.push({ id: 'o1', title: 'Criada offline', done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: Date.now() });
      markDirty();
    });
    const guardado = await page.evaluate(() => ({ lista: localStorage.getItem(LS_KEY), pend: localStorage.getItem('dounoSyncPending'), writes: window.__writes }));
    expect(guardado.lista).toContain('Criada offline');
    expect(guardado.pend).toBe('1');
    expect(guardado.writes).toBe(0);

    // a conexão volta: envia, avisa e limpa a pendência
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => page.evaluate(() => window.__writes)).toBeGreaterThan(0);
    await expect(badge).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('dounoSyncPending'))).toBeNull();
    await page.evaluate(() => { cloudSession = null; });
  });

  test('reabrir com alterações pendentes não perde o que foi feito offline e mescla com a nuvem', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const resultado = await page.evaluate(async (u) => {
      const T = (id, title) => ({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 });
      cloudSession = u;
      // 1) última versão que este aparelho viu da nuvem: só a tarefa "Antiga"
      state.tasks = [T('r1', 'Antiga')];
      adoptCloudRow({ updated_at: '2026-01-01T00:00:00.000Z' });
      // 2) offline: apagou a "Antiga" e criou "Nova offline"; ficou pendente
      state.tasks = [T('n1', 'Nova offline')];
      localStorage.setItem('dounoSyncPending', '1');
      // 3) enquanto isso, outro aparelho criou "De outro aparelho"
      const remote = JSON.parse(JSON.stringify(state));
      remote.tasks = [T('r1', 'Antiga'), T('r2', 'De outro aparelho')];
      fetchCloudStateRow = async () => ({ data: remote, updated_at: '2026-01-02T00:00:00.000Z' });
      let enviado = null;
      sbClient.from = () => ({ update: (payload) => ({ eq: () => ({ eq: () => ({ select: async () => { enviado = payload.data; return { data: [{ updated_at: '2026-01-03T00:00:00.000Z' }], error: null }; } }) }) }) });
      // 4) reabre online: carrega da nuvem sem apagar o que está pendente, depois envia
      await loadStateFromCloud();
      const aposCarregar = state.tasks.map(t => t.title);
      await flushAutoSave();
      return { aposCarregar, enviado: (enviado ? enviado.tasks : []).map(t => t.title).sort(), pend: localStorage.getItem('dounoSyncPending') };
    }, USER);
    expect(resultado.aposCarregar).toEqual(['Nova offline']); // não foi trocado pelos dados da nuvem
    expect(resultado.enviado).toEqual(['De outro aparelho', 'Nova offline']); // mesclado: a apagada some, a nova de outro aparelho entra
    expect(resultado.pend).toBeNull();
    await page.evaluate(() => { cloudSession = null; });
  });

  test('sem pendência, os dados da nuvem continuam valendo ao abrir', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const titulos = await page.evaluate(async (u) => {
      cloudSession = u;
      localStorage.removeItem('dounoSyncPending');
      state.tasks = [];
      const remote = JSON.parse(JSON.stringify(state));
      remote.tasks = [{ id: 'c1', title: 'Da nuvem', done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, categoryId: state.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1 }];
      fetchCloudStateRow = async () => ({ data: remote, updated_at: '2026-01-02T00:00:00.000Z' });
      await loadStateFromCloud();
      return state.tasks.map(t => t.title);
    }, USER);
    expect(titulos).toEqual(['Da nuvem']);
    await page.evaluate(() => { cloudSession = null; });
  });

  test('sessão guardada no aparelho serve de reserva quando o token venceu sem internet', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      localStorage.setItem('sb-teste-auth-token', JSON.stringify({ access_token: 'x', user: { id: 'u9', email: 'a@b.c' } }));
      const s = readStoredSession();
      localStorage.removeItem('sb-teste-auth-token');
      return s && s.user.id;
    });
    expect(r).toBe('u9');
  });

  test('trocar de conta limpa os marcadores de sincronização', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      localStorage.setItem(LS_OWNER_KEY, 'dono-antigo');
      localStorage.setItem('dounoSyncPending', '1');
      localStorage.setItem('dounoSyncBase', '{}');
      claimLocalCache({ id: 'outra-conta', email: 'x@y.z' });
      return [localStorage.getItem('dounoSyncPending'), localStorage.getItem('dounoSyncBase')];
    });
    expect(r).toEqual([null, null]);
  });
});
