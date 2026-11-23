import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Versão do formato dos dados (schemaVersion): migrações e trava contra gravar por cima de dados mais novos. */
test.describe('Versão do formato dos dados', () => {
  test('dados sem versão são o formato 1 e ganham o carimbo ao normalizar', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      delete state.schemaVersion;
      normalizeState();
      return { v: state.schemaVersion, atual: SCHEMA_VERSION };
    });
    expect(r.v).toBe(r.atual);
    expect(r.atual).toBeGreaterThanOrEqual(1);
  });

  test('migrações rodam em ordem, uma vez, e carimbam a versão', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      const ordem = [];
      const migs = { 2: (s) => { ordem.push(2); s.a = 1; }, 3: (s) => { ordem.push(3); s.b = s.a + 1; } };
      const st = { schemaVersion: 1 };
      aplicarMigracoes(st, 3, migs);
      aplicarMigracoes(st, 3, migs); // de novo: nada a fazer
      const semVersao = {};
      aplicarMigracoes(semVersao, 3, migs); // sem número = formato 1
      return { ordem, st, semVersao };
    });
    expect(r.st).toEqual({ schemaVersion: 3, a: 1, b: 2 });
    expect(r.semVersao.schemaVersion).toBe(3);
    expect(r.ordem).toEqual([2, 3, 2, 3]); // 2 estados migrados, cada um uma vez
  });

  test('migração que falha para na versão anterior sem derrubar o app', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      const migs = { 2: (s) => { s.ok = true; }, 3: () => { throw new Error('boom'); }, 4: (s) => { s.nunca = true; } };
      const st = { schemaVersion: 1 };
      const antes = console.error; console.error = () => {};
      try { aplicarMigracoes(st, 4, migs); } finally { console.error = antes; }
      return st;
    });
    expect(r).toEqual({ schemaVersion: 2, ok: true });
  });

  test('dados de formato mais novo não são alterados nem gravados na nuvem', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async () => {
      cloudSession = { user: { id: 'fake-id', email: 'teste@teste.com' } };
      let chamouNuvem = 0;
      fetchCloudStateRow = async () => { chamouNuvem++; return null; };
      state.schemaVersion = SCHEMA_VERSION + 5;
      normalizeState();
      const versaoDepois = state.schemaVersion;
      let erro = null;
      try { await writeStateToCloud(); } catch (e) { erro = e.codigo; }
      cloudSession = null; dirty = false;
      return { versaoDepois, esperada: SCHEMA_VERSION + 5, erro, chamouNuvem, avisou: !!document.querySelector('.undo-toast') };
    });
    expect(r.versaoDepois).toBe(r.esperada); // a versão mais nova é preservada
    expect(r.erro).toBe('schema-novo');
    expect(r.chamouNuvem).toBe(0);  // nem chega a falar com a nuvem
    expect(r.avisou).toBe(true);
  });

  test('nuvem com formato mais novo que o daqui recusa a gravação (sem sobrescrever)', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async () => {
      cloudSession = { user: { id: 'fake-id', email: 'teste@teste.com' } };
      const remoto = JSON.parse(JSON.stringify(state));
      remoto.schemaVersion = SCHEMA_VERSION + 1;
      fetchCloudStateRow = async () => ({ updated_at: '2026-01-01T00:00:00Z', data: remoto });
      let erro = null;
      try { await writeStateToCloud(); } catch (e) { erro = e.codigo; }
      cloudSession = null; dirty = false;
      return { erro, local: state.schemaVersion, atual: SCHEMA_VERSION };
    });
    expect(r.erro).toBe('schema-novo');
    expect(r.local).toBe(r.atual); // o estado local não foi trocado pelo mais novo
  });
});
