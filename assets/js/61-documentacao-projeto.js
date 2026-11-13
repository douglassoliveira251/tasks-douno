import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { escapeHtml, fmtDate } from './10-helpers.js';
import { ensureProjectOverlay } from './31-projetos.js';
import { icon } from './icones.js';
import { render } from './48-render-principal.js';
import { openNoteComposer } from './24-render-notes.js';
import { LIB_TYPES, openLibraryItem } from './57-biblioteca.js';

/* ===================== DOCUMENTAÇÃO DO PROJETO =====================
   Itens da Biblioteca e anotações associados ao projeto: p.docs = [{ k: 'lib' | 'note', id }].
   "Vindo das tarefas" (só leitura): notas ligadas a uma tarefa do projeto (nota.linkedTaskId) e anexos das tarefas.
   Aparece na aba Documentação do painel à direita (computador) e na aba Docs (celular). */

export const DOCS_UI = { filter: 'all', sideTab: 'resumo' };

const libItems = () => (Array.isArray(G.state.libItems) ? G.state.libItems : []);
const notesAll = () => (Array.isArray(G.state.notes) ? G.state.notes : []);
const libIco = (it) => { const t = LIB_TYPES.find(x => x.key === it.type); return t ? t.ico : icon('file-text'); };
const TYPE_LBL = { link: 'Link', skill: 'Skill', html: 'Página HTML' };
const hostOf = (u) => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return u || ''; } };

/* itens diretos que ainda existem (o que foi apagado some sozinho da lista) */
function directDocs(p){
  const out = [];
  (p.docs || []).forEach(d => {
    if(d.k === 'lib'){ const it = libItems().find(x => x.id === d.id); if(it) out.push({ k: 'lib', id: it.id, title: it.title || 'Sem título', sub: (TYPE_LBL[it.type] || 'Item') + (it.type === 'link' && it.url ? ' · ' + hostOf(it.url) : ''), ico: libIco(it), cls: 't-' + (it.type || 'link') }); }
    else if(d.k === 'note'){ const n = notesAll().find(x => x.id === d.id && !x.archived); if(n) out.push({ k: 'note', id: n.id, title: n.title || 'Sem título', sub: 'Nota' + (n.updatedAt ? ' · ' + fmtDate(new Date(n.updatedAt).toISOString().slice(0, 10)) : ''), ico: icon('note'), cls: 't-note' }); }
  });
  return out;
}
/* o que vem das tarefas do projeto (nota ligada à tarefa; arquivo anexado à tarefa) */
function taskDocs(p){
  const tasks = G.state.tasks.filter(t => t.projectId === p.id);
  const out = [];
  tasks.forEach(t => {
    notesAll().filter(n => n.linkedTaskId === t.id && !n.archived).forEach(n => out.push({ k: 'note', id: n.id, title: n.title || 'Sem título', sub: 'Nota', ico: icon('note'), cls: 't-note', from: t.title || 'Tarefa' }));
    (t.attachments || []).forEach(a => out.push({ k: 'att', id: a.id, att: a, title: a.name || 'Arquivo', sub: 'Anexo', ico: icon('paperclip'), cls: 't-file', from: t.title || 'Tarefa' }));
  });
  return out;
}
export function projectDocsCount(p){ return directDocs(p).length + taskDocs(p).length; }

function rowHtml(d, removable){
  return `<div class="pdoc-it" data-k="${d.k}" data-id="${escapeHtml(d.id)}" tabindex="0" role="button">
    <span class="pdoc-ti ${d.cls}">${d.ico}</span>
    <div class="pdoc-tx"><b>${escapeHtml(d.title)}</b><small>${escapeHtml(d.sub)}</small></div>
    ${removable ? `<button type="button" class="pdoc-x" data-rm="${d.k}:${escapeHtml(d.id)}" title="Desassociar do projeto" aria-label="Desassociar do projeto">${icon('x')}</button>` : `<span class="pdoc-from" title="Tarefa de origem">↳ ${escapeHtml(d.from)}</span>`}
  </div>`;
}

/* Preenche o contêiner com a lista de documentação e liga os cliques. */
export function renderProjectDocs(box, p){
  const direct = directDocs(p), fromT = taskDocs(p);
  const f = DOCS_UI.filter;
  const keep = (d) => f === 'all' || (f === 'lib' && d.k === 'lib') || (f === 'note' && d.k === 'note');
  const dl = direct.filter(keep), tl = fromT.filter(d => f === 'all' || (f === 'note' && d.k === 'note') || (f === 'lib' && d.k === 'att'));
  const chip = (k, lbl) => `<button type="button" class="pdoc-chip${f === k ? ' on' : ''}" data-f="${k}">${lbl}</button>`;
  box.innerHTML = `<div class="pdoc">
    <div class="pdoc-bar">${chip('all', 'Tudo')}${chip('lib', 'Biblioteca')}${chip('note', 'Notas')}<button type="button" class="pdoc-add" id="pdocAdd">${icon('plus')}<span>Associar</span></button></div>
    <div class="proj-side-label">Do projeto</div>
    ${dl.length ? dl.map(d => rowHtml(d, true)).join('') : '<div class="proj-side-sub pdoc-empty">' + (direct.length ? 'Nada neste filtro.' : 'Nada associado ainda. Use “Associar” para ligar itens da Biblioteca e anotações a este projeto.') + '</div>'}
    ${fromT.length ? `<div class="proj-side-label" style="margin-top:14px;">Vindo das tarefas <em>(só leitura)</em></div>${tl.length ? tl.map(d => rowHtml(d, false)).join('') : '<div class="proj-side-sub pdoc-empty">Nada neste filtro.</div>'}` : ''}
  </div>`;
  box.querySelectorAll('.pdoc-chip').forEach(b => { b.onclick = () => { DOCS_UI.filter = b.dataset.f; renderProjectDocs(box, p); }; });
  box.querySelector('#pdocAdd').onclick = () => openDocsPicker(p);
  box.querySelectorAll('.pdoc-x').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [k, id] = b.dataset.rm.split(':');
      p.docs = (p.docs || []).filter(d => !(d.k === k && d.id === id));
      markDirty();
    };
  });
  box.querySelectorAll('.pdoc-it').forEach(el => {
    const open = () => {
      const { k, id } = el.dataset;
      if(k === 'lib'){ const it = libItems().find(x => x.id === id); if(it){ if(G.activeCategoryFilter && it.categoryId !== G.activeCategoryFilter) G.activeCategoryFilter = null; openLibraryItem(id); } }
      else if(k === 'note'){ const n = notesAll().find(x => x.id === id); if(n){ G.currentView = 'notes'; render(); openNoteComposer(n); } }
      else if(k === 'att'){ const a = taskDocs(p).find(x => x.k === 'att' && x.id === id); if(a && a.att.dataUrl) window.open(a.att.dataUrl, '_blank'); }
    };
    el.onclick = open;
    el.onkeydown = (e) => { if((e.key === 'Enter' || e.key === ' ') && e.target === el){ e.preventDefault(); open(); } };
  });
}

/* Seletor: Biblioteca / Notas, busca e várias marcações de uma vez. */
function openDocsPicker(p){
  const ov = ensureProjectOverlay('pdocOverlay');
  const modal = ov.firstElementChild;
  const st = { tab: 'lib', q: '', sel: new Set() };
  const has = (k, id) => (p.docs || []).some(d => d.k === k && d.id === id);
  modal.className = 'modal nm pdoc-pick';
  const close = () => ov.classList.remove('show');
  const list = () => {
    const q = st.q.trim().toLowerCase();
    if(st.tab === 'lib') return libItems().filter(i => !has('lib', i.id)).filter(i => !q || ((i.title || '') + ' ' + (i.url || '') + ' ' + (i.description || '')).toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(i => ({ k: 'lib', id: i.id, title: i.title || 'Sem título', sub: (TYPE_LBL[i.type] || 'Item') + (i.type === 'link' && i.url ? ' · ' + hostOf(i.url) : ''), ico: libIco(i), cls: 't-' + (i.type || 'link') }));
    return notesAll().filter(n => !n.archived && !has('note', n.id)).filter(n => !q || ((n.title || '') + ' ' + (n.plainText || n.content || '')).toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(n => ({ k: 'note', id: n.id, title: n.title || 'Sem título', sub: 'Nota', ico: icon('note'), cls: 't-note' }));
  };
  const paint = () => {
    const rows = list();
    const n = st.sel.size;
    modal.innerHTML = `<div class="pdoc-pt">Associar ao projeto</div>
      <div class="pdoc-tabs"><button type="button" class="${st.tab === 'lib' ? 'on' : ''}" data-t="lib">Biblioteca</button><button type="button" class="${st.tab === 'note' ? 'on' : ''}" data-t="note">Notas</button></div>
      <div class="pdoc-search">${icon('magnifying-glass')}<input type="text" id="pdocQ" placeholder="Buscar por nome ou texto…" value="${escapeHtml(st.q)}" autocomplete="off"></div>
      <div class="pdoc-list">${rows.length ? rows.map(d => `<label class="pdoc-pr"><input type="checkbox" data-pk="${d.k}:${escapeHtml(d.id)}" ${st.sel.has(d.k + ':' + d.id) ? 'checked' : ''}><span class="pdoc-ti ${d.cls}">${d.ico}</span><span class="pdoc-tx"><b>${escapeHtml(d.title)}</b><small>${escapeHtml(d.sub)}</small></span></label>`).join('') : `<div class="proj-side-sub pdoc-empty">${st.q ? 'Nada encontrado.' : (st.tab === 'lib' ? 'Todos os itens da Biblioteca já estão associados (ou ela está vazia).' : 'Todas as notas já estão associadas (ou não há notas).')}</div>`}</div>
      <div class="pdoc-foot"><button type="button" class="btn ghost small" id="pdocCancel">Cancelar</button><button type="button" class="btn small" id="pdocOk" ${n ? '' : 'disabled'}>${n ? 'Associar ' + n : 'Associar'}</button></div>`;
    modal.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { st.tab = b.dataset.t; st.q = ''; paint(); }; });
    const qi = modal.querySelector('#pdocQ');
    qi.oninput = () => { st.q = qi.value; const pos = qi.selectionStart; paint(); const q2 = modal.querySelector('#pdocQ'); q2.focus(); q2.setSelectionRange(pos, pos); };
    modal.querySelectorAll('[data-pk]').forEach(c => { c.onchange = () => { if(c.checked) st.sel.add(c.dataset.pk); else st.sel.delete(c.dataset.pk); const ok = modal.querySelector('#pdocOk'); ok.disabled = !st.sel.size; ok.textContent = st.sel.size ? 'Associar ' + st.sel.size : 'Associar'; }; });
    modal.querySelector('#pdocCancel').onclick = close;
    modal.querySelector('#pdocOk').onclick = () => {
      if(!st.sel.size) return;
      p.docs = (p.docs || []).concat(Array.from(st.sel).map(s => { const i = s.indexOf(':'); return { k: s.slice(0, i), id: s.slice(i + 1) }; }));
      close();
      markDirty();
    };
  };
  paint();
  ov.classList.add('show');
  ov.onkeydown = (e) => { if(e.key === 'Escape') close(); };
  setTimeout(() => { const q = modal.querySelector('#pdocQ'); if(q) q.focus(); }, 30);
}
