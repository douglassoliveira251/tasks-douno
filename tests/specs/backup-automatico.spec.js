import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Cópia automática diária (tabela state_backups) simulada na rede do navegador. */
function simular(page, linhas) {
  const log = { inserts: [], deletes: [], upserts: [] };
  page.route('**/rest/v1/state_backups**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const m = req.method();
    if (m === 'GET') {
      const dia = (url.searchParams.get('day') || '').replace(/^eq\./, '');
      const r = dia ? linhas.filter(l => l.day === dia) : linhas;
      const objeto = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(objeto ? (r[0] || null) : r) });
    }
    if (m === 'POST') {
      const corpo = JSON.parse(req.postData());
      const prefer = req.headers()['prefer'] || '';
      (/resolution=merge/.test(prefer) ? log.upserts : log.inserts).push(corpo);
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    if (m === 'DELETE') { log.deletes.push(url.search); return route.fulfill({ status: 204, body: '' }); }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  return log;
}

test.describe('Cópia automática diária', () => {
  test('primeira gravação do dia cria a cópia e apaga as antigas; a segunda não repete', async ({ page }) => {
    const log = simular(page, []);
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async () => {
      cloudSession = { user: { id: 'u1', email: 't@t.com' } };
      reiniciarBackupAutomatico();
      const a = await backupDoDia(state);
      const b = await backupDoDia(state);
      return { a, b };
    });
    expect(r.a).toBe(true);
    expect(r.b).toBe(false);
    expect(log.inserts.length).toBe(1);
    expect(log.inserts[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(log.inserts[0].data.categories.length).toBeGreaterThan(0);
    expect(log.deletes.length).toBe(1);
    expect(log.deletes[0]).toContain('pre-restauracao');   // a cópia "antes de restaurar" nunca é apagada pela rotina
  });

  test('se já existe cópia de hoje não cria outra', async ({ page }) => {
    const hoje = await (async () => new Date().toISOString().slice(0, 10))();
    const log = simular(page, []);
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(() => { cloudSession = { user: { id: 'u1', email: 't@t.com' } }; reiniciarBackupAutomatico(); });
    // devolve uma linha de hoje no primeiro GET
    await page.unroute('**/rest/v1/state_backups**');
    await page.route('**/rest/v1/state_backups**', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ day: hoje }]) });
      log.inserts.push(1); return route.fulfill({ status: 201, body: '[]' });
    });
    const feito = await page.evaluate(() => backupDoDia(state));
    expect(feito).toBe(false);
    expect(log.inserts.length).toBe(0);
  });

  test('falha da nuvem (ex.: tabela ainda não criada) não derruba nada', async ({ page }) => {
    await page.route('**/rest/v1/state_backups**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"x"}' }));
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async () => {
      cloudSession = { user: { id: 'u1', email: 't@t.com' } };
      reiniciarBackupAutomatico();
      const e = console.error; console.error = () => {};
      try { return await backupDoDia(state); } finally { console.error = e; }
    });
    expect(r).toBe(false);
  });

  test('configurações: lista as cópias e restaura uma, guardando antes o estado atual', async ({ page }) => {
    const copia = { categories: [{ id: 'c1', name: 'Espaço antigo', color: '#4A6FA5' }], tasks: [{ id: 'tx', title: 'Tarefa de ontem', status: 'nao_iniciado', priority: 'media', categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], createdAt: 1, shortId: '0001' }], notes: [], events: [] };
    const log = simular(page, [{ day: '2026-11-22', created_at: '2026-11-22T10:00:00Z', data: copia }]);
    await gotoApp(page, { view: 'tasks' });
    page.on('dialog', d => d.accept());
    await page.evaluate(() => { cloudSession = { user: { id: 'u1', email: 't@t.com' } }; });
    await page.evaluate(async () => {
      const box = document.createElement('div'); box.id = 'caixaTeste'; document.body.appendChild(box);
      await mostrarCopiasAutomaticas(box);
    });
    await expect(page.locator('#caixaTeste')).toContainText('22/11/2026');
    await expect(page.locator('#caixaTeste')).toContainText('1 tarefas');
    await page.locator('#caixaTeste [data-restaurar]').click();
    await expect(page.locator('#caixaTeste')).toContainText('restaurada');
    expect(await page.evaluate(() => state.tasks.map(t => t.title))).toEqual(['Tarefa de ontem']);
    expect(log.upserts.length).toBe(1);
    expect(log.upserts[0].day).toBe('pre-restauracao');
  });
});
