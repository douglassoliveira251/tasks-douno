import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

const PAGINA = '<!doctype html><html><head><meta charset="utf-8"><title>Relatório de vendas</title></head><body><h1 id="t">Olá, página</h1><p id="iso">...</p>' +
  '<script>document.getElementById("t").textContent="Olá, página (script rodou)";' +
  'var r="acessou";try{ r = parent.document.title ? "acessou" : "vazio"; }catch(e){ r = "isolada"; }document.getElementById("iso").textContent=r;</script></body></html>';

const abrir = async (page, w = 1280) => {
  await page.setViewportSize({ width: w, height: 800 });
  await gotoApp(page, { view: 'library' });
  await page.evaluate(() => { state.libItems = []; state.libFolders = []; render(); });
};
const importar = async (page, nome, conteudo, mime = 'text/html') => {
  await page.click('#newBtn');
  await page.click('#libPickOverlay [data-new="html"]');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc.setFiles({ name: nome, mimeType: mime, buffer: Buffer.from(conteudo) });
};

test('Página HTML: aparece no quadro Novo e na lateral; importar cria o item com o título do arquivo', async ({ page }) => {
  await abrir(page);
  await page.click('#newBtn');
  await expect(page.locator('#libPickOverlay [data-new="html"]')).toBeEnabled();
  await page.keyboard.press('Escape');
  await importar(page, 'relatorio.html', PAGINA);
  await expect(page.locator('#hmDropTxt')).toContainText('relatorio.html');
  await expect(page.locator('#hmTitle')).toHaveValue('Relatório de vendas');
  await page.click('#hmSave');
  const it = await page.evaluate(() => state.libItems[0]);
  expect(it.type).toBe('html');
  expect(it.fileName).toBe('relatorio.html');
  expect(it.html).toContain('Olá, página');
  await expect(page.locator('.lib-row .lib-av-html')).toBeVisible();
  await expect(page.locator('.lib-type[data-type="html"] i')).toHaveText('1');
});

test('Página HTML: abre na tela, roda o script e fica isolada do app', async ({ page }) => {
  await abrir(page);
  await importar(page, 'relatorio.html', PAGINA);
  await page.click('#hmSave');
  await page.locator('.lib-row .lib-open').click();
  const sandbox = await page.locator('#hFrame').getAttribute('sandbox');
  expect(sandbox).toContain('allow-scripts');
  expect(sandbox).not.toContain('allow-same-origin');
  const fr = page.frameLocator('#hFrame');
  await expect(fr.locator('#t')).toHaveText('Olá, página (script rodou)');
  await expect(fr.locator('#iso')).toHaveText('isolada'); // o script da página não alcança o app
  await page.screenshot({ path: 'test-results/html-aberta-d.png' });
  await page.locator('#libBack').click();
  await expect(page.locator('.lib-row')).toHaveCount(1);
});

test('Página HTML: recusa arquivo que não é .html e arquivo acima de 1,5 MB', async ({ page }) => {
  await abrir(page);
  await importar(page, 'nota.txt', 'oi', 'text/plain');
  await expect(page.locator('#hmErr')).toContainText('.html');
  const grande = '<html>' + 'a'.repeat(Math.round(1.5 * 1024 * 1024) + 10) + '</html>';
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc.setFiles({ name: 'grande.html', mimeType: 'text/html', buffer: Buffer.from(grande) });
  await expect(page.locator('#hmErr')).toContainText('limite é 1,5 MB');
  await page.click('#hmSave');
  await expect(page.locator('#hmErr')).toContainText('Escolha o arquivo');
  // um arquivo de 1,2 MB (entre o limite antigo e o novo) é aceito
  const medio = '<html><body>' + 'a'.repeat(Math.round(1.2 * 1024 * 1024)) + '</body></html>';
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc2.setFiles({ name: 'medio.html', mimeType: 'text/html', buffer: Buffer.from(medio) });
  await expect(page.locator('#hmDropTxt')).toContainText('medio.html');
  await expect(page.locator('#hmErr')).toBeHidden();
  expect(await page.evaluate(() => state.libItems.length)).toBe(0);
});

test('Página HTML: substituir pergunta antes; baixar devolve o .html; tela cheia entra e sai com Esc', async ({ page }) => {
  await abrir(page);
  await importar(page, 'relatorio.html', PAGINA);
  await page.click('#hmSave');
  await page.locator('.lib-row .lib-open').click();
  // baixar
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hDl')]);
  expect(dl.suggestedFilename()).toBe('relatorio.html');
  // editar + substituir o arquivo, na mesma janela (sem item "Substituir arquivo" separado)
  await page.locator('#hMore').click();
  await expect(page.locator('#taskMenuPortal [data-m="rep"]')).toHaveCount(0);
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await expect(page.locator('#hmDropTxt')).toContainText('Atual: relatorio.html');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc.setFiles({ name: 'novo.html', mimeType: 'text/html', buffer: Buffer.from('<html><body><b id="x">Versão 2</b></body></html>') });
  await expect(page.locator('#hmDropTxt')).toContainText('Substitui o atual ao salvar');
  // cancelar: nada muda
  await page.click('#hmCancel');
  expect(await page.evaluate(() => state.libItems[0].fileName)).toBe('relatorio.html');
  await page.locator('#hMore').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await page.fill('#hmTitle', 'Relatório v2');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc2.setFiles({ name: 'novo.html', mimeType: 'text/html', buffer: Buffer.from('<html><body><b id="x">Versão 2</b></body></html>') });
  await page.click('#hmSave');
  const it2 = await page.evaluate(() => state.libItems[0]);
  expect(it2.fileName).toBe('novo.html');
  expect(it2.title).toBe('Relatório v2');
  await expect(page.frameLocator('#hFrame').locator('#x')).toHaveText('Versão 2');
  // tela cheia
  await page.click('#hFull');
  await expect(page.locator('#hDet')).toHaveClass(/full/);
  const box = await page.locator('#hFrame').boundingBox();
  expect(box.width).toBeGreaterThan(1200);
  await page.keyboard.press('Escape');
  await expect(page.locator('#hDet')).not.toHaveClass(/full/);
});

test('Página HTML: editar dados (título e coleção), favoritar e excluir pelo menu', async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => { state.libFolders = [{ id: 'f1', name: 'Trabalho', parentId: null, categoryId: state.categories[0].id, createdAt: 1 }]; render(); });
  await importar(page, 'relatorio.html', PAGINA);
  await page.click('#hmSave');
  await page.locator('[data-imenu]').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  await page.fill('#hmTitle', 'Vendas de outubro');
  await page.locator('[data-combo="hmFolder"] .lib-combo-btn').click();
  await page.locator('[data-combo="hmFolder"] .lib-combo-opt', { hasText: 'Trabalho' }).click();
  await page.click('#hmSave');
  const it = await page.evaluate(() => state.libItems[0]);
  expect(it.title).toBe('Vendas de outubro');
  expect(it.folderId).toBe('f1');
  await page.locator('[data-fav]').click();
  expect(await page.evaluate(() => state.libItems[0].favorite)).toBe(true);
  await page.locator('[data-imenu]').click();
  await page.locator('#taskMenuPortal [data-m="del"]').click();
  await page.locator('#confirmActionOk').click();
  expect(await page.evaluate(() => state.libItems.length)).toBe(0);
});

test('Página HTML: "Nova aba" abre /app/pagina/<id> e a aba mostra só a página', async ({ page, context }) => {
  await abrir(page);
  await importar(page, 'relatorio.html', PAGINA);
  await page.click('#hmSave');
  const id = await page.evaluate(() => state.libItems[0].id);
  await page.locator('.lib-row .lib-open').click();
  // a aba nova recarrega o app: o estado vem do armazenamento local, que o teste grava agora
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  const [nova] = await Promise.all([context.waitForEvent('page'), page.click('#hTab')]);
  await nova.waitForLoadState();
  expect(new URL(nova.url()).pathname).toBe('/app/pagina/' + id);
  await expect(nova.locator('#pageOnly iframe')).toHaveCount(1);
  await expect(nova.frameLocator('#pageOnly iframe').locator('#t')).toHaveText('Olá, página (script rodou)');
  expect(await nova.title()).toContain('Relatório de vendas');
  await nova.screenshot({ path: 'test-results/html-nova-aba.png' });
});

test('Página HTML (celular): lista, abrir e botões cabem na tela', async ({ page }) => {
  await abrir(page, 390);
  await importar(page, 'relatorio.html', PAGINA);
  await page.click('#hmSave');
  await expect(page.locator('.lib-row .lib-open span')).toBeHidden();
  await page.screenshot({ path: 'test-results/html-lista-m.png' });
  await page.locator('.lib-row .lib-open').click();
  await expect(page.frameLocator('#hFrame').locator('#t')).toHaveText('Olá, página (script rodou)');
  await page.screenshot({ path: 'test-results/html-aberta-m.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('Página HTML: substituir o arquivo mantém o mesmo endereço (/app/pagina/<id>) e a aba mostra o conteúdo novo', async ({ page, context }) => {
  await abrir(page);
  await importar(page, 'relatorio.html', '<html><body><b id="v">Versão 1</b></body></html>');
  await page.click('#hmSave');
  const id = await page.evaluate(() => state.libItems[0].id);
  await page.locator('.lib-row .lib-open').click();
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  const [aba] = await Promise.all([context.waitForEvent('page'), page.click('#hTab')]);
  await aba.waitForLoadState();
  const url1 = aba.url();
  await expect(aba.frameLocator('#pageOnly iframe').locator('#v')).toHaveText('Versão 1');
  // substitui o arquivo na Biblioteca
  await page.locator('#hMore').click();
  await page.locator('#taskMenuPortal [data-m="edit"]').click();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#hmDrop')]);
  await fc.setFiles({ name: 'relatorio-v2.html', mimeType: 'text/html', buffer: Buffer.from('<html><body><b id="v">Versão 2</b></body></html>') });
  await page.click('#hmSave');
  expect(await page.evaluate(() => state.libItems[0].id)).toBe(id); // mesmo item, mesmo id
  await page.evaluate(() => localStorage.setItem('tyvraTasksState', JSON.stringify(state)));
  await aba.reload();
  expect(aba.url()).toBe(url1); // o endereço não muda
  expect(new URL(aba.url()).pathname).toBe('/app/pagina/' + id);
  await expect(aba.frameLocator('#pageOnly iframe').locator('#v')).toHaveText('Versão 2');
});
