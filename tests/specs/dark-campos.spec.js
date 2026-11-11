import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers.js';
test('modo escuro: nenhum campo de texto fica branco ou ilegível nas telas principais', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoApp(page, { view: 'tasks' });
  const out = await page.evaluate(async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const res = [];
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { l: (m[0]*299+m[1]*587+m[2]*114)/1000, a: m.length>3?m[3]:1 }; };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const v = lum(c); if (v.a > 0.5) return v.l; } return 255; };
    const scan = (tag) => {
      document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),textarea,select,[contenteditable=true]').forEach(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
        const cs = getComputedStyle(el); const fg = lum(cs.color).l; const bg = bgOf(el);
        if (Math.abs(fg - bg) < 90 || bg > 200) res.push(`${tag} ${el.tagName}#${el.id}.${el.className} fg=${Math.round(fg)} bg=${Math.round(bg)}`);
      });
    };
    for (const v of ['dashboard','tasks','calendar','notes','projects','settings']) {
      try { currentView = v; render(); } catch(e){ res.push('erro view '+v); continue; }
      await new Promise(r => setTimeout(r, 200));
      scan(v);
    }
    for (const tab of ['perfil','personalizacao','tags','categorias','templates','backup','conta']) {
      try { settingsTab = tab; currentView = 'settings'; render(); } catch(e){ continue; }
      await new Promise(r => setTimeout(r, 150)); scan('cfg-'+tab);
    }
    try { state.tasks = [{ id:'t1', title:'T', categoryId: state.categories[0].id, done:false, status:'nao_iniciado', priority:'media', dueDate:'', description:'', tagIds:[], recurrence:'none', subtasks:[], comments:[], attachments:[], createdAt:1 }]; currentView='tasks'; render(); openTaskPanel('t1'); await new Promise(r=>setTimeout(r,200)); scan('painel'); } catch(e){}
    return [...new Set(res)];
  });
  expect(out).toEqual([]);
});
