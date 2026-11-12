import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const go = async (page, vp) => {
  await page.setViewportSize(vp || { width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.evaluate(() => { currentView = 'library'; render(); });
  await page.locator((vp && vp.width < 500 ? '.lib-mtypes' : '.lib-types') + ' [data-type="skill"]').click();
};
const SK = '# Relatório semanal\n\n## Passos\n1. Exportar os chamados\n2. Agrupar por categoria\n\nFim da skill';

test('Skills: o tipo fica ativo na lateral; "Nova skill" cria, mostra contador e conteúdo com números de linha', async ({ page }) => {
  await go(page);
  await expect(page.locator('.lib-types [data-type="skill"]')).toBeEnabled();
  await expect(page.locator('#newBtn')).toBeVisible();
  await expect(page.locator('#newBtnLabel')).toHaveText('Nova skill');
  await page.click('#newBtn');
  await page.fill('#skTitle', 'skill-relatorio-semanal');
  await page.fill('#skText', SK);
  await expect(page.locator('#skCount')).toHaveText(/7 linhas · 16 palavras · \d+ caracteres/);
  await page.click('#skSave');
  const it = await page.evaluate(() => state.libItems.find(i => i.type === 'skill'));
  expect(it.title).toBe('skill-relatorio-semanal');
  expect(it.content).toBe(SK);
  expect(it.url).toBeUndefined();
  // visão da skill
  await expect(page.locator('.lib-dtitle h2')).toHaveText('skill-relatorio-semanal');
  await expect(page.locator('.lib-counter')).toContainText('7 linhas');
  await expect(page.locator('.lib-code > div')).toHaveCount(7);
  await expect(page.locator('.lib-code > div').first().locator('.n')).toHaveText('1');
  await expect(page.locator('.lib-code > div').first().locator('.t')).toHaveText('# Relatório semanal');
  // voltar à lista: a linha traz o resumo
  await page.click('#libBack');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('.lib-row .lib-dm')).toContainText('Skill · 7 linhas');
  await expect(page.locator('.lib-types [data-type="skill"] i')).toHaveText('1');
});

test('Skills: nome é obrigatório e o conteúdo é mostrado como texto (sem executar HTML)', async ({ page }) => {
  await go(page);
  await page.click('#newBtn');
  await page.click('#skSave');
  await expect(page.locator('#skErr')).toBeVisible();
  expect(await page.evaluate(() => state.libItems.length)).toBe(0);
  await page.fill('#skTitle', 'x');
  await page.fill('#skText', '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>');
  await page.click('#skSave');
  await expect(page.locator('.lib-code .t').first()).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('Skills: importar .md (título do primeiro # ou do nome do arquivo), vários de uma vez, e recusar arquivo grande', async ({ page }) => {
  await go(page);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'));
  const a = path.join(dir, 'relatorio.md'); fs.writeFileSync(a, '﻿# Skill do relatório\n\nTexto A\nlinha 3\n');
  const b = path.join(dir, 'sem-titulo.md'); fs.writeFileSync(b, 'apenas texto\nsem cabeçalho\n');
  const big = path.join(dir, 'grande.md'); fs.writeFileSync(big, 'x'.repeat(1024 * 1024 + 10));
  // um arquivo: abre a skill importada
  const [fc1] = await Promise.all([page.waitForEvent('filechooser'), page.click('#libImport')]);
  await fc1.setFiles([a]);
  await expect(page.locator('.lib-dtitle h2')).toHaveText('Skill do relatório');
  await expect(page.locator('.lib-counter')).toContainText('4 linhas');
  expect(await page.evaluate(() => state.libItems[0].content.charCodeAt(0))).not.toBe(0xFEFF);
  await page.click('#libBack');
  // dois arquivos (um sem título, um grande demais)
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#libImport')]);
  await fc2.setFiles([b, big]);
  await expect(page.locator('.lib-dtitle h2')).toHaveText('sem-titulo'); // um só arquivo válido: abre direto
  await page.click('#libBack');
  await expect(page.locator('.lib-row')).toHaveCount(2);
  const titulos = await page.evaluate(() => state.libItems.map(i => i.title).sort());
  expect(titulos).toEqual(['Skill do relatório', 'sem-titulo']);
});

test('Skills: copiar texto, exportar .md e favoritar', async ({ page }) => {
  await go(page);
  await page.evaluate((txt) => { state.libItems = [{ id: 's1', type: 'skill', title: 'Minha skill ÁÇ', content: txt, description: '', folderId: null, categoryId: state.categories[0].id, favorite: false, createdAt: 1, updatedAt: 1 }]; render(); }, SK);
  await page.locator('.lib-row .lib-tt').click();
  // copiar
  await page.click('#skCopy');
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  if (clip !== null) expect(clip.split('\r\n').join('\n')).toBe(SK); // o Windows guarda a área de transferência com CRLF
  // exportar
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#skExport')]);
  expect(dl.suggestedFilename()).toBe('minha-skill-ac.md');
  const p = await dl.path();
  expect(fs.readFileSync(p, 'utf8')).toBe(SK);
  // favoritar
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
  // busca dentro do conteúdo
  await page.fill('#libSearch', 'categoria');
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await page.fill('#libSearch', '');
  // editar pelo menu
  await page.locator('[data-imenu="s1"]').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await page.fill('#skTitle', 'Skill A v2');
  await page.selectOption('#skFolder', 'fa');
  await page.fill('#skText', 'novo texto\nem duas linhas');
  await expect(page.locator('#skCount')).toContainText('2 linhas');
  await page.click('#skSave');
  const it = await page.evaluate(() => state.libItems.find(i => i.id === 's1'));
  expect(it.title).toBe('Skill A v2');
  expect(it.folderId).toBe('fa');
  expect(it.content).toBe('novo texto\nem duas linhas');
  // excluir (confirmação)
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
  // filtro por tipo
  await page.locator('.lib-types [data-type="link"]').click();
  await expect(page.locator('.lib-row')).toHaveCount(1);
  await expect(page.locator('#libQuick')).toBeVisible();
});

test('Skills (celular): sem rolagem lateral, botões visíveis, criar e ver contador', async ({ page }) => {
  await go(page, { width: 390, height: 844 });
  await expect(page.locator('#newBtn')).toBeVisible();
  await expect(page.locator('#libImport')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.click('#newBtn');
  await page.fill('#skTitle', 'skill mobile');
  await page.fill('#skText', SK);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.click('#skSave');
  await expect(page.locator('.lib-counter')).toContainText('7 linhas');
  await expect(page.locator('#skCopy')).toBeVisible();
  await expect(page.locator('#skExport')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
