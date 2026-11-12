import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function pickFolder(page, id, folderId){
  const label = await page.evaluate((fid) => { const n = []; let c = state.libFolders.find(f => f.id === fid); while(c){ n.unshift(c.name); const p = c.parentId; c = p ? state.libFolders.find(f => f.id === p) : null; } return n.join(' › '); }, folderId);
  await page.locator('[data-combo="' + id + '"] .lib-combo-btn').click();
  await page.locator('[data-combo="' + id + '"] .lib-combo-opt', { hasText: label }).first().click();
}


const go = async (page, vp) => {
  await page.setViewportSize(vp || { width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.evaluate(() => { currentView = 'library'; render(); });
  await page.locator((vp && vp.width < 500 ? '.lib-mtypes' : '.lib-types') + ' [data-type="skill"]').click();
};
const novaSkill = async (page) => { await page.click('#newBtn'); await page.click('#libPickOverlay [data-new="skill"]'); };
const putSkill = (page, content, extra = {}) => page.evaluate(({ content, extra }) => {
  const cat = state.categories[0].id;
  state.libItems = [Object.assign({ id: 's1', type: 'skill', title: 'Minha skill ÁÇ', content, description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 }, extra)];
  render();
}, { content, extra });
const tmpFile = (name, text) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-')); const f = path.join(dir, name); fs.writeFileSync(f, text); return f; };
const SK = '# Relatório semanal\n\n## Passos\n1. Exportar os chamados\n2. Agrupar por categoria\n\nFim da skill';

test('Skills: o tipo fica ativo na lateral; "Novo" > Skill cria, mostra contador e conteúdo', async ({ page }) => {
  await go(page);
  await expect(page.locator('.lib-types [data-type="skill"]')).toBeEnabled();
  await expect(page.locator('#newBtnLabel')).toHaveText('Novo');
  await novaSkill(page);
  await page.fill('#skTitle', 'skill-relatorio-semanal');
  await page.fill('#skText', SK);
  await expect(page.locator('#skCount')).toHaveText(/7 linhas · 16 palavras · \d+ caracteres/);
  await page.click('#skSave');
  const it = await page.evaluate(() => state.libItems.find(i => i.type === 'skill'));
  expect(it.title).toBe('skill-relatorio-semanal');
  expect(it.content).toBe(SK);
  expect(it.url).toBeUndefined();
  await expect(page.locator('.lib-dtitle h2')).toHaveText('skill-relatorio-semanal');
  await expect(page.locator('.lib-counter')).toContainText('7 linhas');
  // modo Código: texto puro com números de linha
  await page.click('.lib-seg [data-mode="code"]');
  await expect(page.locator('.lib-code > div')).toHaveCount(7);
  await expect(page.locator('.lib-code > div').first().locator('.n')).toHaveText('1');
  await expect(page.locator('.lib-code > div').first().locator('.t')).toHaveText('# Relatório semanal');
  await page.click('#libBack');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('.lib-row .lib-dm')).toContainText('Skill · 7 linhas');
  await expect(page.locator('.lib-types [data-type="skill"] i')).toHaveText('1');
});

test('Skills: nome é obrigatório e o texto é mostrado como texto nos dois modos (sem executar HTML)', async ({ page }) => {
  await go(page);
  await novaSkill(page);
  await page.click('#skSave');
  await expect(page.locator('#skErr')).toBeVisible();
  expect(await page.evaluate(() => state.libItems.length)).toBe(0);
  await page.fill('#skTitle', 'x');
  await page.fill('#skText', '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>');
  await page.click('#skSave');
  await expect(page.locator('.lib-md')).toContainText('<img src=x');
  expect(await page.locator('.lib-md img, .lib-md script').count()).toBe(0);
  await page.click('.lib-seg [data-mode="code"]');
  await expect(page.locator('.lib-code .t').first()).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('Skills: Visualização aplica o Markdown (títulos, negrito, listas, código, links seguros)', async ({ page }) => {
  await go(page);
  const md = ['# Título', '', 'Texto com **negrito**, *itálico*, `código` e ~~tachado~~.', '', '- item um', '  - sub item', '- item dois', '', '1. primeiro', '2. segundo', '', '> citação', '', '```', 'Get-Content a.csv', '```', '', '[site](https://exemplo.com.br/x) e [mau](javascript:alert(1)) e ![logo](https://img.com/a.png)', '', '| A | B |', '|---|---|', '| 1 | 2 |', '', '---', '<b>html cru</b>'].join('\n');
  await putSkill(page, md);
  await page.locator('.lib-row .lib-tt').click();
  const v = page.locator('.lib-md');
  await expect(v.locator('h1')).toHaveText('Título');
  await expect(v.locator('strong')).toHaveText('negrito');
  await expect(v.locator('em')).toHaveText('itálico');
  await expect(v.locator('del')).toHaveText('tachado');
  await expect(v.locator('p code').first()).toHaveText('código');
  await expect(v.locator(':scope > ul > li')).toHaveCount(2);
  await expect(v.locator('ul ul li')).toHaveText('sub item');
  await expect(v.locator('ol > li')).toHaveCount(2);
  await expect(v.locator('blockquote')).toContainText('citação');
  await expect(v.locator('pre code')).toHaveText('Get-Content a.csv');
  await expect(v.locator('table th')).toHaveCount(2);
  await expect(v.locator('table td').first()).toHaveText('1');
  await expect(v.locator('hr')).toHaveCount(1);
  // links: só http/https/mailto, em outra aba, sem referenciar o sistema; imagem não é carregada
  const links = await v.locator('a').evaluateAll(as => as.map(a => [a.textContent, a.getAttribute('href'), a.target, a.rel]));
  expect(links).toEqual([['site', 'https://exemplo.com.br/x', '_blank', 'noopener noreferrer'], ['logo', 'https://img.com/a.png', '_blank', 'noopener noreferrer']]);
  expect(await v.locator('img').count()).toBe(0);
  await expect(v).toContainText('mau'); // o link perigoso vira texto
  await expect(v).toContainText('<b>html cru</b>'); // HTML cru aparece como texto
  expect(await v.locator('b').count()).toBe(0);
});

test('Skills: a escolha Código/Visualização fica salva e vale para todas as skills', async ({ page }) => {
  await go(page);
  await page.evaluate((txt) => {
    const cat = state.categories[0].id;
    const mk = (id, t) => ({ id, type: 'skill', title: t, content: txt, description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 });
    state.libItems = [mk('s1', 'Skill A'), mk('s2', 'Skill B')];
    render();
  }, SK);
  await page.locator('.lib-row[data-item="s1"]').click({ position: { x: 120, y: 14 } });
  await expect(page.locator('.lib-md')).toBeVisible(); // padrão: Visualização
  await expect(page.locator('.lib-seg [data-mode="view"]')).toHaveClass(/on/);
  await page.click('.lib-seg [data-mode="code"]');
  expect(await page.evaluate(() => state.libSkillMode)).toBe('code');
  await expect(page.locator('.lib-code')).toBeVisible();
  // outra skill abre no mesmo modo
  await page.click('#libBack');
  await page.locator('.lib-row[data-item="s2"]').click({ position: { x: 120, y: 14 } });
  await expect(page.locator('.lib-code')).toBeVisible();
  await expect(page.locator('.lib-md')).toHaveCount(0);
  // volta para Visualização
  await page.click('.lib-seg [data-mode="view"]');
  expect(await page.evaluate(() => state.libSkillMode)).toBe('view');
  await expect(page.locator('.lib-md')).toBeVisible();
  // o contador conta o texto original nos dois modos
  await expect(page.locator('.lib-counter')).toContainText('7 linhas');
});

test('Skills: importar na lista abre o arquivo no editor para revisar; só grava ao salvar', async ({ page }) => {
  await go(page);
  const a = tmpFile('relatorio.md', '﻿# Skill do relatório\n\nTexto A\nlinha 3\n');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#libImport')]);
  await fc.setFiles([a]);
  await expect(page.locator('#skTitle')).toHaveValue('Skill do relatório');
  await expect(page.locator('.lib-banner')).toContainText('relatorio.md');
  await expect(page.locator('.lib-banner')).toContainText('não está salvo');
  await expect(page.locator('#skCount')).toContainText('4 linhas');
  expect(await page.evaluate(() => state.libItems.length)).toBe(0); // ainda não gravou
  await page.click('#skSave');
  const it = await page.evaluate(() => state.libItems[0]);
  expect(it.title).toBe('Skill do relatório');
  expect(it.content.charCodeAt(0)).not.toBe(0xFEFF);
  await expect(page.locator('.lib-dtitle h2')).toHaveText('Skill do relatório');
});

test('Skills: importar vários arquivos cria todos; arquivo acima de 1 MB é recusado', async ({ page }) => {
  await go(page);
  const b = tmpFile('sem-titulo.md', 'apenas texto\nsem cabeçalho\n');
  const c = tmpFile('com-titulo.md', '# Com título\ncorpo\n');
  const big = tmpFile('grande.md', 'x'.repeat(1024 * 1024 + 10));
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#libImport')]);
  await fc.setFiles([b, c, big]);
  await expect(page.locator('.lib-row')).toHaveCount(2);
  expect(await page.evaluate(() => state.libItems.map(i => i.title).sort())).toEqual(['Com título', 'sem-titulo']);
  // um arquivo grande sozinho: recusado, nada abre
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#libImport')]);
  await fc2.setFiles([big]);
  await expect(page.locator('#skTitle')).toHaveCount(0);
  expect(await page.evaluate(() => state.libItems.length)).toBe(2);
});

test('Skills: importar por cima pergunta antes de substituir; o novo texto vai ao editor e só vale ao salvar', async ({ page }) => {
  await go(page);
  await putSkill(page, SK);
  await page.locator('.lib-row .lib-tt').click();
  const novo = tmpFile('relatorio-v2.md', '# Relatório v2\n\nNovo texto\ncom 4 linhas\n');
  // cancelar mantém tudo
  let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await expect(page.locator('#libOverwriteOverlay')).toHaveClass(/show/);
  await expect(page.locator('#libOverwriteOverlay .lib-cmp')).toContainText('7 linhas');
  await expect(page.locator('#libOverwriteOverlay .lib-cmp')).toContainText('4 linhas');
  await page.click('#libOwCancel');
  await expect(page.locator('#libOverwriteOverlay')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => state.libItems[0].content)).toBe(SK);
  // substituir e revisar: carrega no editor, sem gravar
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await page.click('#libOwGo');
  await expect(page.locator('.lib-banner')).toContainText('relatorio-v2.md');
  await expect(page.locator('#skText')).toHaveValue('# Relatório v2\n\nNovo texto\ncom 4 linhas\n');
  await expect(page.locator('#skTitle')).toHaveValue('Minha skill ÁÇ'); // o nome da skill não muda
  expect(await page.evaluate(() => state.libItems[0].content)).toBe(SK);
  // cancelar o editor descarta o texto importado
  await page.click('#skCancel');
  expect(await page.evaluate(() => state.libItems[0].content)).toBe(SK);
  // de novo, agora salvando
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await page.click('#libOwGo');
  await page.click('#skSave');
  expect(await page.evaluate(() => state.libItems[0].content)).toBe('# Relatório v2\n\nNovo texto\ncom 4 linhas\n');
  await expect(page.locator('.lib-banner')).toHaveCount(0);
});

test('Skills: importar por cima pode virar uma skill nova; skill vazia recebe o texto sem perguntar', async ({ page }) => {
  await go(page);
  await putSkill(page, SK);
  await page.locator('.lib-row .lib-tt').click();
  const novo = tmpFile('outra.md', '# Outra skill\n\ntexto\n');
  let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await page.click('#libOwNew');
  await expect(page.locator('#skTitle')).toHaveValue('Outra skill');
  await page.click('#skSave');
  const todos = await page.evaluate(() => state.libItems.map(i => [i.title, i.content]));
  expect(todos).toHaveLength(2);
  expect(todos.find(t => t[0] === 'Minha skill ÁÇ')[1]).toBe(SK); // a original não mudou
  // skill vazia: sem pergunta
  await putSkill(page, '', { id: 's9', title: 'Vazia' });
  await page.locator('.lib-row .lib-tt').click();
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await expect(page.locator('.lib-banner')).toBeVisible();
  await expect(page.locator('#libOverwriteOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('#skText')).toHaveValue('# Outra skill\n\ntexto\n');
});

test('Skills: copiar texto, exportar .md, baixar pelo ícone da lista e favoritar', async ({ page }) => {
  await go(page);
  await putSkill(page, SK);
  // ícone de baixar na linha da lista
  const [dl0] = await Promise.all([page.waitForEvent('download'), page.locator('[data-dl="s1"]').click()]);
  expect(dl0.suggestedFilename()).toBe('minha-skill-ac.md');
  expect(fs.readFileSync(await dl0.path(), 'utf8')).toBe(SK);
  await page.locator('.lib-row .lib-tt').click();
  await page.click('#skCopy');
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  if (clip !== null) expect(clip.split('\r\n').join('\n')).toBe(SK); // o Windows guarda a área de transferência com CRLF
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#skExport')]);
  expect(dl.suggestedFilename()).toBe('minha-skill-ac.md');
  expect(fs.readFileSync(await dl.path(), 'utf8')).toBe(SK);
  await page.click('#skFav');
  expect(await page.evaluate(() => state.libItems[0].favorite)).toBe(true);
});

test('Skills: editar, mover de coleção, buscar pelo conteúdo e excluir', async ({ page }) => {
  await go(page);
  await page.evaluate((txt) => {
    const cat = state.categories[0].id;
    state.libFolders = [{ id: 'fa', name: 'Trabalho', parentId: null, categoryId: cat, createdAt: 1 }];
    state.libItems = [
      { id: 's1', type: 'skill', title: 'Skill A', content: txt, description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 },
      { id: 'l1', type: 'link', title: 'Um link', url: 'https://a.com.br/', description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 },
    ];
    render();
  }, SK);
  await page.fill('#libSearch', 'categoria');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await page.fill('#libSearch', '');
  await page.locator('[data-imenu="s1"]').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await page.fill('#skTitle', 'Skill A v2');
  await pickFolder(page, 'skFolder', 'fa');
  await page.fill('#skText', 'novo texto\nem duas linhas');
  await expect(page.locator('#skCount')).toContainText('2 linhas');
  await page.click('#skSave');
  const it = await page.evaluate(() => state.libItems.find(i => i.id === 's1'));
  expect(it.title).toBe('Skill A v2');
  expect(it.folderId).toBe('fa');
  expect(it.content).toBe('novo texto\nem duas linhas');
  await page.click('#skDel');
  await page.click('#confirmActionOk');
  expect(await page.evaluate(() => state.libItems.some(i => i.id === 's1'))).toBe(false);
  await expect(page.locator('.lib-types [data-type="link"]')).toBeVisible();
});

test('Skills: aparecem em "Todos os itens" junto dos links, com tipo diferente', async ({ page }) => {
  await go(page);
  await page.evaluate(() => {
    const cat = state.categories[0].id;
    state.libItems = [
      { id: 's1', type: 'skill', title: 'Skill A', content: 'a\nb', description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 2 },
      { id: 'l1', type: 'link', title: 'Um link', url: 'https://a.com.br/', description: '', folderId: null, categoryId: cat, favorite: false, createdAt: 1, updatedAt: 1 },
    ];
    render();
  });
  await page.locator('[data-kind="all"]').click();
  await expect(page.locator('.lib-row')).toHaveCount(2);
  await expect(page.locator('.lib-types [data-type="skill"] i')).toHaveText('1');
  await expect(page.locator('.lib-types [data-type="link"] i')).toHaveText('1');
  await page.locator('.lib-types [data-type="link"]').click();
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('[data-web="l1"]')).toBeVisible();
});

test('Skills (celular): sem rolagem lateral, criar pelo quadro, modos e importar por cima cabem na tela', async ({ page }) => {
  await go(page, { width: 390, height: 844 });
  await expect(page.locator('#libImport')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await novaSkill(page);
  await page.fill('#skTitle', 'skill mobile');
  await page.fill('#skText', SK);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.click('#skSave');
  await expect(page.locator('.lib-counter')).toContainText('7 linhas');
  for (const s of ['#skCopy', '#skImport', '#skExport', '.lib-seg [data-mode="code"]', '.lib-seg [data-mode="view"]']) await expect(page.locator(s)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  // aviso de substituir (de baixo para cima)
  const novo = tmpFile('v2.md', '# V2\ntexto\n');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#skImport')]);
  await fc.setFiles([novo]);
  await expect(page.locator('#libOverwriteOverlay')).toHaveClass(/show/);
  const r = await page.evaluate(() => { const m = document.querySelector('#libOverwriteOverlay .modal').getBoundingClientRect(); return { l: m.left, r: m.right, b: m.bottom, vw: innerWidth, vh: innerHeight }; });
  expect(r.l).toBeGreaterThanOrEqual(0);
  expect(r.r).toBeLessThanOrEqual(r.vw);
  expect(r.b).toBeLessThanOrEqual(r.vh + 1);
  await page.click('#libOwCancel');
});
