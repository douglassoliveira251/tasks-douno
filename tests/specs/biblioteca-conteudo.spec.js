import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Conteúdo grande da Biblioteca (páginas HTML e skills) fora do registro principal.
   A API do Supabase é simulada na rede do navegador: library_contents (tabela) e taskin_state (registro). */

const GRANDE_HTML = '<html><body>' + 'conteudo da pagina '.repeat(3000) + '</body></html>'; // ~57 mil
const GRANDE_SKILL = '# Skill grande\n' + 'linha de texto da skill\n'.repeat(1500); // ~35 mil
const PEQUENA_SKILL = '# Skill pequena\n\nUm texto curto.';

function simularNuvem(page, { falharConteudo = false } = {}) {
  const tabela = new Map();     // item_id -> { item_id, kind, content }
  const estado = { gravacoes: [], ultima: null };
  page.route('**/rest/v1/library_contents**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (falharConteudo) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'falha simulada' }) });
    if (req.method() === 'POST') {
      const corpo = JSON.parse(req.postData());
      const linhas = Array.isArray(corpo) ? corpo : [corpo];
      linhas.forEach(l => tabela.set(l.item_id, l));
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(linhas.map(l => ({ item_id: l.item_id }))) });
    }
    if (req.method() === 'GET') {
      const filtro = url.searchParams.get('item_id') || '';
      const id = filtro.replace(/^eq\./, '');
      const l = tabela.get(id);
      const objeto = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
      if (objeto) return l ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(l) })
        : route.fulfill({ status: 406, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'sem linhas' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(l ? [l] : []) });
    }
    return route.fulfill({ status: 204, body: '' });
  });
  page.route('**/rest/v1/taskin_state**', async (route) => {
    const req = route.request();
    if (req.method() === 'PATCH' || req.method() === 'POST') {
      const corpo = JSON.parse(req.postData());
      estado.gravacoes.push(corpo);
      estado.ultima = corpo;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ updated_at: corpo.updated_at }]) });
    }
    // leitura: sem linha ainda (primeira gravação) ou a última gravada
    const objeto = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
    if (!estado.ultima) return route.fulfill({ status: objeto ? 406 : 200, contentType: 'application/json', body: objeto ? JSON.stringify({ code: 'PGRST116' }) : '[]' });
    const linha = { updated_at: estado.ultima.updated_at, data: estado.ultima.data };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(objeto ? linha : [linha]) });
  });
  return { tabela, estado };
}

async function preparar(page) {
  await gotoApp(page, { view: 'tasks' });
  await page.evaluate(({ GRANDE_HTML, GRANDE_SKILL, PEQUENA_SKILL }) => {
    cloudSession = { user: { id: 'u1', email: 't@t.com' } };
    const cat = state.categories[0].id;
    const base = { description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 };
    state.libItems = [
      Object.assign({ id: 'h1', type: 'html', title: 'Página', html: GRANDE_HTML, fileName: 'p.html', size: GRANDE_HTML.length }, base),
      Object.assign({ id: 's1', type: 'skill', title: 'Grande', content: GRANDE_SKILL }, base),
      Object.assign({ id: 's2', type: 'skill', title: 'Pequena', content: PEQUENA_SKILL }, base),
    ];
  }, { GRANDE_HTML, GRANDE_SKILL, PEQUENA_SKILL });
}

test.describe('Biblioteca: conteúdo fora do registro principal', () => {
  test('ao gravar: textos grandes sobem para a tabela e saem do registro; pequenos e a memória ficam', async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    await page.evaluate(() => writeStateToCloud());

    expect([...nuvem.tabela.keys()].sort()).toEqual(['h1', 's1']);          // s2 é pequena: fica no item
    expect(nuvem.tabela.get('h1').content).toBe(GRANDE_HTML);
    expect(nuvem.tabela.get('s1').kind).toBe('skill');

    const gravado = nuvem.estado.ultima.data;
    const h1 = gravado.libItems.find(i => i.id === 'h1');
    const s1 = gravado.libItems.find(i => i.id === 's1');
    const s2 = gravado.libItems.find(i => i.id === 's2');
    expect(h1.html).toBeUndefined();
    expect(h1.ref).toBe(true);
    expect(h1.size).toBe(GRANDE_HTML.length);                              // metadados continuam
    expect(s1.content).toBeUndefined();
    expect(s1.stats.lines).toBeGreaterThan(1000);
    expect(s2.content).toBe(PEQUENA_SKILL);                                 // pequena segue no registro
    expect(s2.ref).toBeUndefined();
    expect(gravado.schemaVersion).toBe(2);
    expect(JSON.stringify(gravado).length).toBeLessThan(GRANDE_HTML.length / 2);

    // em memória o texto continua disponível (não precisa buscar de novo)
    const mem = await page.evaluate(() => ({ h: state.libItems[0].html.length, s: state.libItems[1].content.length }));
    expect(mem.h).toBe(GRANDE_HTML.length);
    expect(mem.s).toBe(GRANDE_SKILL.length);
  });

  test('se o envio do texto falha, ele continua dentro do registro (nada se perde)', async ({ page }) => {
    const nuvem = simularNuvem(page, { falharConteudo: true });
    await preparar(page);
    await page.evaluate(async () => { const e = console.error; console.error = () => {}; try { await writeStateToCloud(); } finally { console.error = e; } });

    const gravado = nuvem.estado.ultima.data;
    const h1 = gravado.libItems.find(i => i.id === 'h1');
    expect(h1.html).toBe(GRANDE_HTML);
    expect(h1.ref).toBeUndefined();
    expect(gravado.libItems.find(i => i.id === 's1').content).toBe(GRANDE_SKILL);
  });

  test('texto alterado depois de enviado volta a subir e a ir no registro até ser reenviado', async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    await page.evaluate(() => writeStateToCloud());
    await page.evaluate(() => { state.libItems[1].content += '\nlinha nova'; });

    // antes de reenviar, a cópia local mantém o texto novo (não pode ser tirada do registro)
    const local = await page.evaluate(() => serializarEstado(state).libItems.find(i => i.id === 's1').content);
    expect(local).toContain('linha nova');

    await page.evaluate(() => writeStateToCloud());
    expect(nuvem.tabela.get('s1').content).toContain('linha nova');
    expect(nuvem.estado.ultima.data.libItems.find(i => i.id === 's1').content).toBeUndefined();
  });

  test('item só com referência: hidratar busca o texto na tabela; sem a linha, dá erro claro', async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    await page.evaluate(() => writeStateToCloud());
    // simula outro aparelho / sessão nova: itens vindos do registro, sem o texto
    const r = await page.evaluate(async () => {
      const rec = serializarEstado(state).libItems.map(i => Object.assign({}, i));
      state.libItems = rec;
      const antes = conteudoFaltando(state.libItems[0]);
      await hidratarItem(state.libItems[0]);
      const depois = { tem: typeof state.libItems[0].html === 'string', falta: conteudoFaltando(state.libItems[0]) };
      state.libItems[1].id = 'inexistente';
      let erro = null;
      try { await hidratarItem(state.libItems[1]); } catch (e) { erro = e.message; }
      return { antes, depois, erro };
    });
    expect(r.antes).toBe(true);
    expect(r.depois).toEqual({ tem: true, falta: false });
    expect(r.erro).toMatch(/não foi encontrado/);
    expect(nuvem.tabela.size).toBe(2);
  });

  test('tela: skill que ainda não foi aberta mostra "Carregando…" e depois o texto; a lista usa a contagem guardada', async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    await page.evaluate(() => writeStateToCloud());
    await page.evaluate(() => {
      state.libItems = serializarEstado(state).libItems.map(i => Object.assign({}, i)); // como veio do registro
      currentView = 'library'; render();
    });
    await page.locator('.lib-types [data-type="skill"]').click();
    const linha = page.locator('.lib-row[data-item="s1"]');
    await expect(linha).toContainText(/\d[\d.]* linhas/);          // contagem vem de item.stats, sem o texto
    await linha.click();
    await expect(page.locator('.lib-dtitle h2')).toHaveText('Grande');
    await expect(page.locator('.lib-counter')).toContainText('1.501 linhas');
    expect(await page.evaluate(() => typeof state.libItems.find(i => i.id === 's1').content)).toBe('string');
    expect(nuvem.tabela.has('s1')).toBe(true);
  });

  test('sem nuvem (só neste aparelho) nada muda: o texto fica no item e nada é enviado', async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    const r = await page.evaluate(async () => {
      cloudSession = null;
      await enviarConteudos(state);
      return { ref: state.libItems[0].ref, mesmo: serializarEstado(state) === state };
    });
    expect(r.ref).toBeUndefined();
    expect(r.mesmo).toBe(true);
    expect(nuvem.tabela.size).toBe(0);
  });
  test("outro aparelho muda uma tarefa: a mesclagem entra e o texto carregado da Biblioteca não vira alteração local", async ({ page }) => {
    const nuvem = simularNuvem(page);
    await preparar(page);
    await page.evaluate(() => writeStateToCloud());
    const antes = nuvem.estado.gravacoes.length;
    // outro aparelho gravou depois: nova tarefa e a Biblioteca como ela vai ao registro (sem os textos)
    const u = nuvem.estado.ultima;
    const remoto = JSON.parse(JSON.stringify(u.data));
    remoto.tasks = [{ id: "t-remota", title: "Veio do outro aparelho", status: "nao_iniciado", priority: "media", categoryId: remoto.categories[0].id, tagIds: [], subtasks: [], comments: [], attachments: [], createdAt: 1, shortId: "0001" }];
    remoto.taskIdCounter = 1;
    nuvem.estado.ultima = { updated_at: "2031-01-01T00:00:00.000Z", data: remoto };
    await page.evaluate(() => writeStateToCloud());
    const r = await page.evaluate(() => ({ tarefas: state.tasks.map(t => t.title), html: typeof state.libItems.find(i => i.id === "h1").html, ref: state.libItems.find(i => i.id === "h1").ref }));
    expect(r.tarefas).toContain("Veio do outro aparelho");
    expect(r.html).toBe("string");               // texto carregado segue na memória
    expect(r.ref).toBe(true);
    const gravado = nuvem.estado.ultima.data;
    expect(nuvem.estado.gravacoes.length).toBe(antes + 1);
    expect(gravado.libItems.find(i => i.id === "h1").html).toBeUndefined();
    expect(gravado.tasks.map(t => t.title)).toContain("Veio do outro aparelho");
  });
});
