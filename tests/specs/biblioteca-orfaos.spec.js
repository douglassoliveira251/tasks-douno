import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Limpeza dos textos da Biblioteca que ficaram na tabela depois de o item ser excluído. */
test.describe('Biblioteca: textos órfãos', () => {
  test('apaga só o que não tem item e está parado há mais de 7 dias; roda uma vez por sessão', async ({ page }) => {
    const dias = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const linhas = [
      { item_id: 'vivo-antigo', updated_at: dias(30) },
      { item_id: 'orfao-antigo', updated_at: dias(30) },
      { item_id: 'orfao-recente', updated_at: dias(1) },
    ];
    const apagados = [];
    let listagens = 0;
    await page.route('**/rest/v1/library_contents**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() === 'GET') {
        listagens++;
        const corte = (url.searchParams.get('updated_at') || '').replace(/^lt\./, '');
        const r = linhas.filter(l => !corte || l.updated_at < corte).map(l => ({ item_id: l.item_id }));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
      }
      if (req.method() === 'DELETE') {
        const f = url.searchParams.get('item_id') || '';
        apagados.push(...f.replace(/^in\.\(/, '').replace(/\)$/, '').split(',').map(s => s.replace(/"/g, '')));
        return route.fulfill({ status: 204, body: '' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async () => {
      cloudSession = { user: { id: 'u1', email: 't@t.com' } };
      state.libItems = [{ id: 'vivo-antigo', type: 'skill', title: 'x', content: 'a', ref: true }];
      reiniciarLimpezaDeOrfaos();
      const a = await limparOrfaos(state);
      const b = await limparOrfaos(state);
      return { a, b };
    });
    expect(r.a).toBe(1);
    expect(r.b).toBe(0);                      // segunda chamada na mesma sessão não faz nada
    expect(apagados).toEqual(['orfao-antigo']);
    expect(listagens).toBe(1);
  });

  test('sem nuvem não faz nada', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const n = await page.evaluate(async () => { cloudSession = null; reiniciarLimpezaDeOrfaos(); return limparOrfaos(state); });
    expect(n).toBe(0);
  });
});
