import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import fs from 'fs';

const seed = () => {
  const t = todayStr(), c = state.categories[0].id;
  const tk = (id, title, ex) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 5000 + Number(id.replace(/\D/g, '') || 0), recurrence: 'none', startDate: t, followUpDate: t }, ex);
  state.tasks = [tk('t1', 'Revisar proposta', { dueDate: addDaysStr(t, -1), priority: 'alta' }), tk('t2', 'Ligar para o contador', { dueDate: t, dueTime: '11:00' }), tk('t3', 'Pagar boleto', { dueDate: t })];
  state.events = [{ id: 'e1', title: 'Reunião', date: t, endDate: t, startTime: '09:00', endTime: '10:00', allDay: false, categoryId: c, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1, attendees: [], description: '' }];
  state.notes = [{ id: 'n1', title: 'Nota um', content: '<p>texto</p>', categoryId: c, tagIds: [], createdAt: 1, updatedAt: 2, archived: false, pinned: false, notebookId: null }];
  state.projects = [{ id: 'p1', name: 'Site novo', categoryId: c, startDate: addDaysStr(t, -5), endDate: addDaysStr(t, 20), createdAt: 1, icon: 'briefcase', stages: [{ id: 'sg1', name: 'Design', start: addDaysStr(t, -5), end: addDaysStr(t, 3) }] }];
  state.libFolders = []; state.libItems = [{ id: 'l1', type: 'link', title: 'GitHub', url: 'https://github.com', favorite: true, folderId: null, categoryId: c, createdAt: 1, updatedAt: 1 }];
};

for (const [w, h] of [[1280, 800], [390, 844]]) {
  test(`smoke das janelas e menus ${w}px`, async ({ page }) => {
    test.setTimeout(240000);
    const erros = [];
    page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
    await page.setViewportSize({ width: w, height: h });
    await gotoApp(page, { view: 'tasks' });
    await page.evaluate(seed);
    await page.evaluate(() => render());
    fs.mkdirSync('test-results/varredura', { recursive: true });
    const rel = [];
    const check = async (nome) => {
      await page.waitForTimeout(200);
      const r = await page.evaluate((w) => ({ sw: document.documentElement.scrollWidth, w }), w);
      if (r.sw > w) rel.push(nome + ': rolagem lateral ' + r.sw);
      await page.screenshot({ path: `test-results/varredura/m2-${nome}-${w}.png` });
    };
    const limpar = async () => { await page.keyboard.press('Escape'); await page.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); activeTaskId = null; creatingNewTask = false; render(); }); };

    // notificações, busca, menu da conta, ajuda
    await page.click('#notificationBtn'); await check('notificacoes'); await limpar();
    await page.click('#topbarAvatarBtn'); await check('menu-conta'); await limpar();
    await page.evaluate(() => { const b = document.getElementById('helpBtn'); b && b.click(); }); await check('ajuda'); await limpar();
    // nova tarefa / agenda / nota / projeto
    await page.evaluate(() => { currentView = 'tasks'; render(); });
    await page.evaluate(() => document.dispatchEvent(new Event('douno:novo-menu')));
    await check('menu-novo');
    for (const k of ['task', 'event', 'note', 'project']) {
      const it = page.locator(`.new-menu-item[data-new="${k}"]`);
      if (await it.count() === 0) { await page.evaluate(() => document.dispatchEvent(new Event('douno:novo-menu'))); }
      if (await it.count()) { await it.first().click(); await check('novo-' + k); await limpar(); await page.evaluate(() => document.dispatchEvent(new Event('douno:novo-menu'))); }
    }
    await limpar();
    // biblioteca: quadro Novo, link, skill, HTML
    await page.evaluate(() => { currentView = 'library'; render(); });
    await page.click('#newBtn'); await check('lib-quadro-novo');
    for (const k of ['link', 'skill', 'html']) {
      await page.click(`#libPickOverlay [data-new="${k}"]`); await check('lib-novo-' + k); await limpar();
      await page.evaluate(() => { currentView = 'library'; render(); }); await page.click('#newBtn');
    }
    await limpar();
    // configurações: todas as abas
    const abas = await page.evaluate(() => ['categorias', 'tags', 'templates', 'dados', 'perfil'].filter(Boolean));
    for (const a of abas) {
      await page.evaluate((a) => { currentView = 'settings'; settingsTab = a; settingsMobileList = false; render(); }, a);
      await check('config-' + a);
    }
    // detalhes de tarefa, evento e nota
    await page.evaluate(() => { currentView = 'tasks'; activeTaskId = 't2'; render(); }); await check('tarefa-detalhe'); await limpar();
    await page.evaluate(() => { currentView = 'notes'; activeNoteId = 'n1'; render(); }); await check('nota-detalhe');
    await page.evaluate(() => { activeNoteId = null; currentView = 'tasks'; render(); });
    expect(erros).toEqual([]);
    expect(rel).toEqual([]);
  });
}
