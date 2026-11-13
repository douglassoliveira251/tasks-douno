import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
import fs from 'fs';

const seed = () => {
  const t = todayStr(), c = state.categories[0].id;
  const c2 = state.categories[1] ? state.categories[1].id : c;
  const tk = (id, title, ex) => Object.assign({ id, title, done: false, status: 'nao_iniciado', priority: 'media', dueDate: null, dueTime: '', categoryId: c, tagIds: [], subtasks: [], comments: [], attachments: [], description: '', createdAt: 1000 + Number(id.replace(/\D/g, '') || 0), recurrence: 'none', startDate: t, followUpDate: t }, ex);
  state.tasks = [
    tk('t1', 'Revisar proposta do cliente e enviar com um título bem comprido para testar quebra de linha', { dueDate: addDaysStr(t, -1), priority: 'alta' }),
    tk('t2', 'Ligar para o contador', { dueDate: t, dueTime: '11:00' }),
    tk('t3', 'Pagar boleto', { dueDate: t, categoryId: c2, priority: 'critica' }),
    tk('t4', 'Sem data', {}), tk('t5', 'Declaração de imposto', { dueDate: addDaysStr(t, 2), priority: 'baixa' }),
    tk('t6', 'Feita ontem', { done: true, status: 'concluida', completedAt: Date.now() - 86400000, dueDate: addDaysStr(t, -1) }),
    tk('t7', 'Recorrente semanal', { dueDate: t, recurrence: 'weekly', recurrenceInterval: 1 }),
  ];
  const ev = (id, title, s, e, ex) => Object.assign({ id, title, date: t, endDate: t, startTime: s, endTime: e, allDay: false, categoryId: c, tagIds: [], recurrence: 'none', recurrenceInterval: 1, createdAt: 1, attendees: [], description: '' }, ex);
  state.events = [ev('e1', 'Reunião de alinhamento', '09:00', '10:00'), ev('e2', 'Almoço com cliente', '12:30', '14:00'), ev('e3', 'Dia todo', '', '', { allDay: true }), ev('e4', 'Sobreposta', '09:30', '10:30')];
  state.notes = state.notes || [];
  if (!state.notes.length) state.notes = [{ id: 'n1', title: 'Alinhamento semanal', content: '<p>Pauta da reunião</p>', categoryId: c, tagIds: [], createdAt: 1, updatedAt: 2, archived: false, pinned: false, notebookId: null }];
  state.projects = [{ id: 'p1', name: 'Site novo', categoryId: c, startDate: addDaysStr(t, -5), endDate: addDaysStr(t, 20), createdAt: 1, icon: 'briefcase', stages: [{ id: 'sg1', name: 'Design', start: addDaysStr(t, -5), end: addDaysStr(t, 3) }, { id: 'sg2', name: 'Desenvolvimento', start: addDaysStr(t, 4), end: addDaysStr(t, 20) }] }];
  state.tasks[1].projectId = 'p1'; state.tasks[1].stageId = 'sg1';
  state.libFolders = [{ id: 'f1', name: 'Trabalho', parentId: null, categoryId: c, createdAt: 1 }, { id: 'f2', name: 'Clientes', parentId: 'f1', categoryId: c, createdAt: 1 }];
  state.libItems = [
    { id: 'l1', type: 'link', title: 'GitHub', url: 'https://github.com', favorite: true, folderId: 'f1', categoryId: c, createdAt: 1, updatedAt: 10, description: 'Repositório' },
    { id: 'l2', type: 'link', title: 'Portal com nome muito comprido de teste do sistema', url: 'https://rh.empresa.com.br/portal', favorite: true, folderId: null, categoryId: c, createdAt: 1, updatedAt: 5 },
    { id: 's1', type: 'skill', title: 'skill-relatorio-semanal', content: '# Título\n\nTexto com **negrito** e `codigo`.\n\n- item\n- item 2\n', favorite: true, folderId: 'f2', categoryId: c, createdAt: 1, updatedAt: 6 },
    { id: 'h1', type: 'html', title: 'Relatório de vendas', html: '<h1>Oi</h1>', fileName: 'r.html', size: 2048, favorite: false, folderId: null, categoryId: c, createdAt: 1, updatedAt: 7 },
  ];
};

const VIEWS = [
  ['dashboard', (p) => p.evaluate(() => { currentView = 'dashboard'; render(); })],
  ['tarefas', (p) => p.evaluate(() => { currentView = 'tasks'; activeTaskId = null; render(); })],
  ['tarefa-aberta', (p) => p.evaluate(() => { currentView = 'tasks'; activeTaskId = 't1'; render(); })],
  ['notas', (p) => p.evaluate(() => { currentView = 'notes'; render(); })],
  ['projetos', (p) => p.evaluate(() => { currentView = 'projects'; activeProjectId = null; render(); })],
  ['projeto-aberto', (p) => p.evaluate(() => { currentView = 'projects'; activeProjectId = 'p1'; projectTab = 'timeline'; render(); })],
  ['cal-mes', (p) => p.evaluate(() => { currentView = 'calendar'; calendarView = 'month'; calendarFocusDate = todayStr(); render(); })],
  ['cal-semana', (p) => p.evaluate(() => { currentView = 'calendar'; calendarView = 'week'; calendarFocusDate = todayStr(); render(); })],
  ['cal-dia', (p) => p.evaluate(() => { currentView = 'calendar'; calendarView = 'day'; calendarFocusDate = todayStr(); render(); })],
  ['cal-agenda', (p) => p.evaluate(() => { currentView = 'calendar'; calendarView = 'agenda'; calendarFocusDate = todayStr(); render(); })],
  ['biblioteca', (p) => p.evaluate(() => { currentView = 'library'; render(); })],
  ['config', (p) => p.evaluate(() => { currentView = 'settings'; settingsTab = 'categorias'; settingsMobileList = false; render(); })],
];

const out = [];
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    test(`smoke das telas (sem erro de console, sem rolagem lateral) ${w}px ${theme}`, async ({ page }) => {
      test.setTimeout(240000);
      const erros = [];
      page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
      await page.setViewportSize({ width: w, height: h });
      await gotoApp(page, { view: 'tasks' });
      await page.evaluate(seed);
      await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
      fs.mkdirSync('test-results/varredura', { recursive: true });
      for (const [nome, go] of VIEWS) {
        if (nome === 'dashboard' && w < 769) continue;
        await page.evaluate(() => { try { localStorage.setItem('dounoFoco', '0'); } catch (e) {} });
        await go(page);
        await page.waitForTimeout(250);
        const r = await page.evaluate((w) => {
          const out = { sw: document.documentElement.scrollWidth, fora: [] };
          const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
          const rolavel = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
          document.querySelectorAll('body *').forEach((e) => {
            if (out.fora.length > 6) return;
            if (!vis(e)) return;
            const b = e.getBoundingClientRect();
            if (b.right > w + 2 && !rolavel(e) && getComputedStyle(e).position !== 'fixed') out.fora.push((e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0] + ' ' + Math.round(b.right));
          });
          // alvos de toque pequenos (celular)
          out.pequenos = [];
          if (w < 769) document.querySelectorAll('button, a[href], [role="button"]').forEach((e) => {
            if (!vis(e) || out.pequenos.length > 5) return;
            const b = e.getBoundingClientRect();
            if ((b.width < 28 || b.height < 28) && b.top < 900 && !rolavel(e)) out.pequenos.push((e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0] + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
          });
          return out;
        }, w);
        out.push({ w, theme, nome, sw: r.sw, fora: r.fora, pequenos: r.pequenos });
        await page.screenshot({ path: `test-results/varredura/${nome}-${w}-${theme}.png` });
      }
      fs.writeFileSync(`test-results/varredura/_resumo-${w}-${theme}.json`, JSON.stringify({ erros, out: out.filter(o => o.w === w && o.theme === theme) }, null, 1));
      expect(erros).toEqual([]);
    });
  }
}
