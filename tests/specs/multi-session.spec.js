import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Regressão: dois navegadores abertos. Salvar num deles não pode desfazer o que
   o outro alterou (tarefas voltavam ao status anterior). */

const mk = (id, title, extra = {}) => ({
  id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: '2026-10-13', dueTime: '09:00',
  categoryId: 'c1', tagIds: [], subtasks: [], comments: [], attachments: [], description: '',
  createdAt: 1000, ...extra,
});

test.describe('Mesclagem entre sessões', () => {
  test('mudanças em itens diferentes se somam', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate((mkSrc) => {
      const mk = eval('(' + mkSrc + ')');
      const baseState = { tasks: [mk('a', 'A'), mk('b', 'B')], notes: [], events: [], notebooks: [], tags: [], categories: [] };
      const base = makeSyncSnapshot(baseState);
      const local = JSON.parse(JSON.stringify(baseState));
      const remote = JSON.parse(JSON.stringify(baseState));
      local.tasks[0].status = 'concluida';               // aqui: A concluída
      remote.tasks[1].status = 'em_andamento';           // lá: B em andamento
      const m = mergeStates(base, local, remote);
      return m.tasks.map(t => [t.id, t.status]);
    }, mk.toString());
    expect(r).toEqual([['a', 'concluida'], ['b', 'em_andamento']]);
  });

  test('tarefa nova de outra sessão entra; excluída aqui continua excluída', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate((mkSrc) => {
      const mk = eval('(' + mkSrc + ')');
      const baseState = { tasks: [mk('a', 'A'), mk('b', 'B')], notes: [], events: [], notebooks: [], tags: [], categories: [] };
      const base = makeSyncSnapshot(baseState);
      const local = JSON.parse(JSON.stringify(baseState));
      const remote = JSON.parse(JSON.stringify(baseState));
      local.tasks = local.tasks.filter(t => t.id !== 'a');      // excluí A aqui
      remote.tasks.push(mk('c', 'C (criada lá)'));               // lá criaram C
      const m = mergeStates(base, local, remote);
      return m.tasks.map(t => t.id).sort();
    }, mk.toString());
    expect(r).toEqual(['b', 'c']);
  });

  test('excluída em outra sessão some, a menos que eu a tenha alterado', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate((mkSrc) => {
      const mk = eval('(' + mkSrc + ')');
      const baseState = { tasks: [mk('a', 'A'), mk('b', 'B')], notes: [], events: [], notebooks: [], tags: [], categories: [] };
      const base = makeSyncSnapshot(baseState);
      const local = JSON.parse(JSON.stringify(baseState));
      const remote = JSON.parse(JSON.stringify(baseState));
      remote.tasks = [];                                  // lá excluíram A e B
      local.tasks[1].title = 'B editada aqui';            // eu editei B
      const m = mergeStates(base, local, remote);
      return m.tasks.map(t => t.id);
    }, mk.toString());
    expect(r).toEqual(['b']);
  });

  test('o mesmo item alterado nos dois lados fica com o mais recente', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate((mkSrc) => {
      const mk = eval('(' + mkSrc + ')');
      const baseState = { tasks: [mk('a', 'A')], notes: [], events: [], notebooks: [], tags: [], categories: [] };
      const base = makeSyncSnapshot(baseState);
      const local = JSON.parse(JSON.stringify(baseState));
      const remote = JSON.parse(JSON.stringify(baseState));
      local.tasks[0].title = 'daqui'; local.tasks[0].updatedAt = 2000;
      remote.tasks[0].title = 'de lá'; remote.tasks[0].updatedAt = 3000;
      return mergeStates(base, local, remote).tasks[0].title;
    }, mk.toString());
    expect(r).toBe('de lá');
  });

  test('configurações: mudança só de um lado vale; histórico de e-mails une', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(() => {
      const baseState = { tasks: [], notes: [], events: [], notebooks: [], tags: [], categories: [], theme: 'light', emailHistory: ['a@x.com'] };
      const base = makeSyncSnapshot(baseState);
      const local = JSON.parse(JSON.stringify(baseState));
      const remote = JSON.parse(JSON.stringify(baseState));
      remote.theme = 'dark';
      local.emailHistory = ['b@x.com', 'a@x.com'];
      remote.emailHistory = ['c@x.com', 'a@x.com'];
      const m = mergeStates(base, local, remote);
      return { theme: m.theme, emails: m.emailHistory.slice().sort() };
    });
    expect(r.theme).toBe('dark');
    expect(r.emails).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });
});

test.describe('Gravação na nuvem com outra sessão no meio', () => {
  test('a escrita preserva a alteração feita pela outra sessão e não sobrescreve às cegas', async ({ page }) => {
    await gotoApp(page, { view: 'tasks' });
    const r = await page.evaluate(async (mkSrc) => {
      const mk = eval('(' + mkSrc + ')');
      const cat = state.categories[0].id;
      // "nuvem" falsa: uma linha com data + updated_at; update condicional como no Postgres
      let row = null;
      let clock = 1;
      const stamp = () => new Date(Date.UTC(2026, 9, 13, 12, 0, clock++)).toISOString();
      const fake = {
        from() {
          const q = { _f: {}, _op: null, _payload: null };
          q.select = (cols) => { if(q._op === null){ q._op = 'select'; q._cols = cols; } else { q._returning = true; } return q; };
          q.eq = (k, v) => { q._f[k] = v; return q; };
          q.maybeSingle = async () => ({ data: row ? { data: JSON.parse(JSON.stringify(row.data)), updated_at: row.updated_at } : null, error: null });
          q.update = (p) => { q._op = 'update'; q._payload = p; return q; };
          q.insert = (p) => { q._op = 'insert'; q._payload = p; return q; };
          q.then = (resolve) => {
            if(q._op === 'insert'){ row = { data: JSON.parse(JSON.stringify(q._payload.data)), updated_at: q._payload.updated_at }; return resolve({ data: [{ updated_at: row.updated_at }], error: null }); }
            if(q._op === 'update'){
              if(row && row.updated_at === q._f.updated_at){
                row = { data: JSON.parse(JSON.stringify(q._payload.data)), updated_at: q._payload.updated_at };
                return resolve({ data: [{ updated_at: row.updated_at }], error: null });
              }
              return resolve({ data: [], error: null });
            }
            return resolve({ data: null, error: null });
          };
          return q;
        },
      };
      const realFrom = sbClient.from;
      sbClient.from = fake.from;
      cloudSession = { user: { id: 'u1', email: 't@t.com' } };
      try{
        state.tasks = [mk('a', 'A', { categoryId: cat }), mk('b', 'B', { categoryId: cat })];
        // sessão 1 (esta aba) carregou e gravou: base = versão atual
        await writeStateToCloud();
        const loadedAt = row.updated_at;

        // sessão 2 (outra aba) altera a tarefa B na nuvem
        const other = JSON.parse(JSON.stringify(row.data));
        other.tasks.find(t => t.id === 'b').status = 'concluida';
        row = { data: other, updated_at: stamp() };

        // sessão 1 (desatualizada) altera A e salva
        state.tasks.find(t => t.id === 'a').status = 'em_andamento';
        await writeStateToCloud();

        const cloudTasks = row.data.tasks.map(t => [t.id, t.status]);
        const localTasks = state.tasks.map(t => [t.id, t.status]);
        return { cloudTasks, localTasks, versionChanged: row.updated_at !== loadedAt };
      } finally {
        sbClient.from = realFrom;
        cloudSession = null;
        dirty = false;
      }
    }, mk.toString());

    expect(r.versionChanged).toBe(true);
    expect(r.cloudTasks).toEqual([['a', 'em_andamento'], ['b', 'concluida']]);
    expect(r.localTasks).toEqual([['a', 'em_andamento'], ['b', 'concluida']]);
  });
});
