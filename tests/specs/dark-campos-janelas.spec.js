import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';

/* Abre as janelas e menus que só existem depois de um clique e confere os campos no modo escuro. */
test('modo escuro: campos das janelas e menus não ficam brancos nem ilegíveis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  const out = await page.evaluate(async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const res = [], tried = [], cnt = {};
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { l: (m[0]*299+m[1]*587+m[2]*114)/1000, a: m.length>3?m[3]:1 }; };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const v = lum(getComputedStyle(e).backgroundColor); if (v.a > 0.5) return v.l; } return 255; };
    const scan = (tag) => {
      document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=range]):not([type=color]),textarea,select,[contenteditable=true]').forEach(el => {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; cnt[tag] = (cnt[tag]||0)+1;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.opacity === '0') return;
        const fg = lum(cs.color).l, bg = bgOf(el);
        if (Math.abs(fg - bg) < 90 || bg > 200) res.push(`${tag} ${el.tagName}#${el.id}.${String(el.className).slice(0,40)} fg=${Math.round(fg)} bg=${Math.round(bg)}`);
      });
    };
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const close = async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.body.click(); await wait(80); };
    const cat = state.categories[0].id;
    state.tasks = [{ id:'t1', title:'T', categoryId:cat, done:false, status:'nao_iniciado', priority:'media', dueDate:'', description:'', tagIds:[], recurrence:'none', subtasks:[], comments:[], attachments:[], createdAt:1 }];
    currentView = 'tasks'; render(); openTaskPanel('t1'); await wait(150);
    const btn = () => document.querySelector('#tpName') || document.body;
    const cases = {
      novaTarefa: () => openNewTaskPanel(),
      recorrencia: () => openRecurrencePortal(btn(), state.tasks[0], () => {}),
      menuTags: () => document.querySelector('#tpTagsTrigger, #tpTagsBtn, .tp-tags-trigger')?.click(),
      evento: () => { currentView = 'calendar'; render(); openEventComposer(null, '2026-11-11'); },
      nota: () => { currentView = 'notes'; render(); openNoteComposer(null); },
      projeto: () => openProjectEditor(null),
      template: () => openTemplateEditor(null),
      paleta: () => openColorPortal('#4A6FA5', btn(), () => {}),
      confirmar: () => openConfirmPortal(btn(), 'Excluir?', () => {}),
      sobre: () => openAboutModal(),
      ajuda: () => openHelpPanel(),
      novidades: () => openWhatsNew(),
      feedback: () => openFeedbackModal(),
      excluirConta: () => openDeleteAccountModal(),
      onboarding: () => openOnboarding(),
    };
    for (const [k, fn] of Object.entries(cases)) {
      try { await fn(); await wait(250); tried.push(k); scan(k); } catch (e) { res.push('nao abriu ' + k + ': ' + String(e).slice(0, 60)); }
      await close();
    }
    return { res: [...new Set(res)], tried, cnt };
  });
  expect(Object.keys(out.cnt).length).toBeGreaterThan(8);
  expect(out.res).toEqual([]);
});
