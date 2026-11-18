import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { escapeHtml, fmtDate, fold, todayStr } from './10-helpers.js';
import { STATUS_CONFIG } from './12-render-tasks.js';
import { getOrCreateActiveTask, openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { openNoteComposer } from './24-render-notes.js';
import { eventColor } from './25-calendario.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { ensureProjectOverlay } from './31-projetos.js';
import { render } from './48-render-principal.js';
import { LIB_TYPES, openLibraryItem } from './57-biblioteca.js';
import { icon } from './icones.js';
import { PAINEL_TAREFA } from './estado-ui.js';

/* ===================== ABA "RELACIONADOS" DO PAINEL DA TAREFA =====================
   Tarefas relacionadas: task.relatedTaskIds (ids). O vínculo vale nos dois lados: a lista mostra as que esta tarefa escolheu
   e as que escolheram esta; tirar o vínculo (×) remove dos dois lados e nunca apaga a tarefa.
   Notas e documentos: notas ligadas pela própria nota (linkedTaskId) ou escolhidas aqui, e itens da Biblioteca: task.docs = [{ k: 'lib' | 'note', id }].
   Agenda: eventos com linkedTaskId desta tarefa. O × só desfaz o vínculo. */

const tasksAll = () => G.state.tasks;
const libItems = () => (Array.isArray(G.state.libItems) ? G.state.libItems : []);
const notesAll = () => (Array.isArray(G.state.notes) ? G.state.notes : []);
const TYPE_LBL = { link: 'Link', skill: 'Skill', html: 'Página HTML' };
const hostOf = (u) => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return u || ''; } };
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/* ---------- dados ---------- */
export function relatedTasks(task){
  const mine = new Set(task.relatedTaskIds || []);
  tasksAll().forEach(t => { if(t.id !== task.id && (t.relatedTaskIds || []).includes(task.id)) mine.add(t.id); });
  return tasksAll().filter(t => t.id !== task.id && mine.has(t.id));
}
function relatedDocs(task){
  const out = [];
  notesAll().filter(n => n.linkedTaskId === task.id && !n.archived).forEach(n => out.push({ k: 'note', id: n.id, via: 'own', title: n.title || 'Sem título', ico: icon('note'), sub: 'Nota' + (n.updatedAt ? ' · editada em ' + fmtDate(new Date(n.updatedAt).toISOString().slice(0, 10)) : '') }));
  (task.docs || []).forEach(d => {
    if(d.k === 'note'){ const n = notesAll().find(x => x.id === d.id && !x.archived); if(n && n.linkedTaskId !== task.id) out.push({ k: 'note', id: n.id, via: 'docs', title: n.title || 'Sem título', ico: icon('note'), sub: 'Nota' + (n.updatedAt ? ' · editada em ' + fmtDate(new Date(n.updatedAt).toISOString().slice(0, 10)) : '') }); }
    else if(d.k === 'lib'){
      const it = libItems().find(x => x.id === d.id);
      if(it){ const ty = LIB_TYPES.find(x => x.key === it.type); out.push({ k: 'lib', id: it.id, via: 'docs', title: it.title || 'Sem título', ico: ty ? ty.ico : icon('file-text'), sub: (TYPE_LBL[it.type] || 'Item') + (it.type === 'link' && it.url ? ' · ' + hostOf(it.url) : '') }); }
    }
  });
  return out;
}
const agendasOf = (task) => G.state.events.filter(ev => ev.linkedTaskId === task.id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
function agendaIsPast(ev){
  const today = todayStr();
  if(ev.recurrence && ev.recurrence !== 'none') return !!ev.recurrenceEndDate && ev.recurrenceEndDate < today;
  return (ev.endDate || ev.date || '9999') < today;
}
export function relCount(task){
  if(!task || !task.id) return 0;
  return relatedTasks(task).length + relatedDocs(task).length + agendasOf(task).length;
}

/* Cita (@) numa descrição/comentário: o vínculo nasce só para as tarefas que acabaram de ser citadas. */
export function addRelatedTask(task, otherId){
  if(!task || !otherId || task.id === otherId) return;
  if(relatedTasks(task).some(t => t.id === otherId)) return;
  task.relatedTaskIds = (task.relatedTaskIds || []).concat(otherId);
}
function removeRelatedTask(task, otherId){
  task.relatedTaskIds = (task.relatedTaskIds || []).filter(id => id !== otherId);
  const o = tasksAll().find(t => t.id === otherId);
  if(o) o.relatedTaskIds = (o.relatedTaskIds || []).filter(id => id !== task.id);
}

/* ---------- HTML ---------- */
function statusLabel(t){ if(t.done) return 'Concluída'; const s = STATUS_CONFIG.find(x => x.key === t.status); return s ? s.label : ''; }
function daysTag(date){
  if(!date) return '';
  const a = new Date(todayStr() + 'T00:00:00'), b = new Date(date + 'T00:00:00');
  const n = Math.round((b - a) / 864e5);
  if(n === 0) return 'Hoje'; if(n === 1) return 'Amanhã'; if(n > 1 && n <= 30) return 'Em ' + n + ' dias';
  return '';
}
const xBtn = (label) => `<button type="button" class="rl-x" title="${label}" aria-label="${label}" data-x>${icon('x')}</button>`;
const head = (ico, title, n, btns) => `<h3>${icon(ico)}<span>${title}</span><span class="rl-c">${n}</span><span class="rl-btns">${btns || ''}</span></h3>`;
const addBtn = (id, label) => `<button type="button" class="rl-add" id="${id}">${icon('plus')}${label}</button>`;

function taskRow(t){
  const pr = t.done ? 'var(--ok)' : (['critica', 'alta', 'media', 'baixa'].includes(t.priority) ? 'var(--priority-' + t.priority + ')' : 'var(--ink-faint)');
  const late = !t.done && t.dueDate && t.dueDate < todayStr();
  const meta = ['#' + (t.shortId || ''), statusLabel(t), t.dueDate ? 'prazo ' + fmtDate(t.dueDate) : 'sem prazo'].filter(Boolean).join(' · ');
  return `<div class="rl-row${t.done ? ' done' : ''}" data-open="task:${escapeHtml(t.id)}" tabindex="0" role="button" title="Abrir tarefa">
    <span class="rl-bar" style="background:${pr}"></span>
    <span class="rl-nm"><b>${escapeHtml(t.title || 'Sem título')}</b><small${late ? ' class="late"' : ''}>${escapeHtml(meta)}</small></span>
    ${xBtn('Tirar o vínculo')}</div>`;
}
function docRow(d){
  return `<div class="rl-row" data-open="${d.k}:${escapeHtml(d.id)}" data-via="${d.via}" tabindex="0" role="button" title="Abrir">
    <span class="rl-ib">${d.ico}</span>
    <span class="rl-nm"><b>${escapeHtml(d.title)}</b><small>${escapeHtml(d.sub)}</small></span>
    ${xBtn('Tirar o vínculo')}</div>`;
}
function agendaRow(ev){
  const [, m, dd] = (ev.date || '').split('-');
  const tag = daysTag(ev.date);
  const hm = ev.startTime ? ev.startTime + (ev.endTime ? ' – ' + ev.endTime : '') : 'Dia todo';
  return `<div class="tp-task-agenda-row rl-ag" data-open="event:${escapeHtml(ev.id)}" tabindex="0" role="button" style="--c:${eventColor(ev)}" title="Abrir agenda">
    <span class="rl-dy"><small>${MESES[(Number(m) || 1) - 1]}</small><b>${Number(dd) || ''}</b></span>
    <span class="rl-nm"><b class="tp-task-agenda-title">${escapeHtml(ev.title || 'Sem título')}</b><small>${icon('clock')}${escapeHtml(hm)}${ev.location ? ' · ' + escapeHtml(ev.location) : ''}</small></span>
    ${tag ? `<span class="rl-tag">${tag}</span>` : ''}${xBtn('Desvincular da tarefa')}</div>`;
}

/* ---------- seletores (reaproveitam o visual do "Associar ao projeto") ---------- */
function openPicker(opts){
  const ov = ensureProjectOverlay('trelOverlay');
  const modal = ov.firstElementChild;
  const st = { tab: opts.tabs ? opts.tabs[0][0] : '', q: '', sel: new Set() };
  modal.className = 'modal nm pdoc-pick';
  const close = () => ov.classList.remove('show');
  const paint = () => {
    const rows = opts.list(st.tab, fold(st.q.trim()));
    const n = st.sel.size;
    modal.innerHTML = `<div class="pdoc-pt">${opts.title}</div>
      ${opts.tabs ? `<div class="pdoc-tabs">${opts.tabs.map(([k, l]) => `<button type="button" class="${st.tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="pdoc-search">${icon('magnifying-glass')}<input type="text" id="trelQ" placeholder="${opts.placeholder}" value="${escapeHtml(st.q)}" autocomplete="off"></div>
      <div class="pdoc-list">${rows.length ? rows.map(r => `<label class="pdoc-pr"><input type="checkbox" data-pk="${escapeHtml(r.key)}" ${st.sel.has(r.key) ? 'checked' : ''}><span class="rl-pk"><b>${escapeHtml(r.title)}</b><small>${escapeHtml(r.sub)}</small></span></label>`).join('') : `<div class="proj-side-sub pdoc-empty">${opts.empty}</div>`}</div>
      <div class="pdoc-foot"><button type="button" class="btn ghost small" id="trelCancel">Cancelar</button><button type="button" class="btn small" id="trelOk" ${n ? '' : 'disabled'}>${n ? 'Vincular ' + n : 'Vincular'}</button></div>`;
    modal.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { st.tab = b.dataset.t; st.q = ''; paint(); }; });
    const qi = modal.querySelector('#trelQ');
    qi.oninput = () => { st.q = qi.value; const pos = qi.selectionStart; paint(); const q2 = modal.querySelector('#trelQ'); q2.focus(); q2.setSelectionRange(pos, pos); };
    modal.querySelectorAll('[data-pk]').forEach(c => { c.onchange = () => { if(c.checked) st.sel.add(c.dataset.pk); else st.sel.delete(c.dataset.pk); const ok = modal.querySelector('#trelOk'); ok.disabled = !st.sel.size; ok.textContent = st.sel.size ? 'Vincular ' + st.sel.size : 'Vincular'; }; });
    modal.querySelector('#trelCancel').onclick = close;
    modal.querySelector('#trelOk').onclick = () => { if(!st.sel.size) return; close(); opts.onOk(Array.from(st.sel)); };
  };
  paint();
  ov.classList.add('show');
  ov.onkeydown = (e) => { if(e.key === 'Escape') close(); };
  setTimeout(() => { const q = modal.querySelector('#trelQ'); if(q) q.focus(); }, 30);
}

function pickTasks(task){
  const taken = new Set(relatedTasks(task).map(t => t.id));
  openPicker({
    title: 'Vincular tarefas', placeholder: 'Buscar por nome ou número…', empty: 'Nenhuma tarefa encontrada.',
    list: (tab, q) => tasksAll().filter(t => t.id !== task.id && !taken.has(t.id))
      .filter(t => !q || fold(t.title).includes(q) || fold(t.shortId).includes(q.replace(/^#/, '')))
      .sort((a, b) => (a.done - b.done) || ((b.createdAt || 0) - (a.createdAt || 0))).slice(0, 80)
      .map(t => ({ key: t.id, title: t.title || 'Sem título', sub: '#' + (t.shortId || '') + ' · ' + statusLabel(t) + (t.dueDate ? ' · prazo ' + fmtDate(t.dueDate) : '') })),
    onOk: (ids) => { const t = getOrCreateActiveTask(); if(!t) return; ids.forEach(id => addRelatedTask(t, id)); markDirty(); },
  });
}
function pickDocs(task){
  const has = (k, id) => relatedDocs(task).some(d => d.k === k && d.id === id);
  openPicker({
    title: 'Vincular à tarefa', placeholder: 'Buscar por nome…', empty: 'Nada encontrado.', tabs: [['lib', 'Biblioteca'], ['note', 'Notas']],
    list: (tab, q) => {
      if(tab === 'lib') return libItems().filter(i => !has('lib', i.id)).filter(i => !q || fold((i.title || '') + ' ' + (i.url || '') + ' ' + (i.description || '')).includes(q))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(i => ({ key: 'lib:' + i.id, title: i.title || 'Sem título', sub: (TYPE_LBL[i.type] || 'Item') + (i.type === 'link' && i.url ? ' · ' + hostOf(i.url) : '') }));
      return notesAll().filter(n => !n.archived && !has('note', n.id)).filter(n => !q || fold((n.title || '') + ' ' + (n.plainText || n.content || '')).includes(q))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(n => ({ key: 'note:' + n.id, title: n.title || 'Sem título', sub: 'Nota' }));
    },
    onOk: (keys) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.docs = (t.docs || []).concat(keys.map(s => { const i = s.indexOf(':'); return { k: s.slice(0, i), id: s.slice(i + 1) }; }));
      markDirty();
    },
  });
}

/* ---------- painel ---------- */
let mostraPassadas = false;
export const tabAtual = (task) => (PAINEL_TAREFA.tpTabTask === (task.id || 'new') && PAINEL_TAREFA.tpTab === 'rel') ? 'rel' : 'det';
export function relPaneHtml(task){
  return `<div class="tp-pane tp-pane-rel" id="tpPaneRel"${tabAtual(task) === 'rel' ? '' : ' hidden'}>
    <section class="rl-card" id="tpRelTasks"></section>
    <section class="rl-card" id="tpRelDocs"></section>
    <section class="rl-card" id="tpAgendaField"></section>
  </div>`;
}

export function bindTpRelacionados(panel, task){
  /* abas */
  const tabs = panel.querySelectorAll('#tpTabs [data-tab]');
  const paneDet = document.getElementById('tpPaneDet'), paneRel = document.getElementById('tpPaneRel');
  const mostra = (v) => {
    tabs.forEach(b => { const on = b.dataset.tab === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    paneDet.hidden = v !== 'det'; paneRel.hidden = v !== 'rel';
    PAINEL_TAREFA.tpTab = v; PAINEL_TAREFA.tpTabTask = task.id || 'new';
  };
  tabs.forEach(b => { b.onclick = () => mostra(b.dataset.tab); });

  const abre = (el) => {
    const [k, id] = el.dataset.open.split(/:(.*)/s);
    if(k === 'task') openTaskPanel(id);
    else if(k === 'note'){ const n = notesAll().find(x => x.id === id); if(n){ G.currentView = 'notes'; render(); openNoteComposer(n); } }
    else if(k === 'lib'){ const it = libItems().find(x => x.id === id); if(it){ if(G.activeCategoryFilter && it.categoryId !== G.activeCategoryFilter) G.activeCategoryFilter = null; openLibraryItem(id); } }
    else if(k === 'event'){ const ev = G.state.events.find(x => x.id === id); if(ev) openEventComposer(ev); }
  };
  const liga = (box) => {
    box.querySelectorAll('[data-open]').forEach(el => {
      el.onclick = (e) => { if(e.target.closest('[data-x]')) return; abre(el); };
      el.onkeydown = (e) => { if((e.key === 'Enter' || e.key === ' ') && e.target === el){ e.preventDefault(); abre(el); } };
    });
  };

  /* tarefas */
  const tasks = relatedTasks(task);
  const bt = document.getElementById('tpRelTasks');
  bt.innerHTML = head('check-square', 'Tarefas relacionadas', tasks.length, addBtn('tpAddRelTask', 'Vincular')) +
    (tasks.length ? '<div class="rl-list">' + tasks.map(taskRow).join('') + '</div>' : '<div class="rl-empty">Nenhuma tarefa relacionada. Digite @ na descrição ou nos comentários, ou use Vincular.</div>');
  liga(bt);
  bt.querySelector('#tpAddRelTask').onclick = (e) => { e.stopPropagation(); pickTasks(task); };
  bt.querySelectorAll('.rl-row').forEach(row => {
    row.querySelector('[data-x]').onclick = (e) => {
      e.stopPropagation();
      const id = row.dataset.open.slice(5);
      const t = getOrCreateActiveTask(); if(!t) return;
      removeRelatedTask(t, id); markDirty();
    };
  });

  /* notas e documentos */
  const docs = relatedDocs(task);
  const bd = document.getElementById('tpRelDocs');
  bd.innerHTML = head('file-text', 'Notas e documentos', docs.length, addBtn('tpAddNoteBtn', 'Nota') + addBtn('tpAddDocBtn', 'Vincular')) +
    (docs.length ? '<div class="rl-list">' + docs.map(docRow).join('') + '</div>' : '<div class="rl-empty">Nenhuma nota ou documento. Crie uma nota ou vincule itens da Biblioteca.</div>');
  liga(bd);
  bd.querySelector('#tpAddNoteBtn').onclick = (e) => { e.stopPropagation(); const t = getOrCreateActiveTask(); if(!t) return; G.currentView = 'notes'; render(); openNoteComposer(null, t.id); };
  bd.querySelector('#tpAddDocBtn').onclick = (e) => { e.stopPropagation(); pickDocs(task); };
  bd.querySelectorAll('.rl-row').forEach(row => {
    row.querySelector('[data-x]').onclick = (e) => {
      e.stopPropagation();
      const [k, id] = row.dataset.open.split(/:(.*)/s);
      const t = getOrCreateActiveTask(); if(!t) return;
      if(row.dataset.via === 'own'){ const n = notesAll().find(x => x.id === id); if(n) n.linkedTaskId = null; }
      else t.docs = (t.docs || []).filter(d => !(d.k === k && d.id === id));
      markDirty();
    };
  });

  /* agenda */
  const all = agendasOf(task), past = all.filter(agendaIsPast);
  const shown = mostraPassadas ? all : all.filter(ev => !agendaIsPast(ev));
  const ba = document.getElementById('tpAgendaField');
  ba.innerHTML = head('calendar-blank', 'Agenda', all.length, addBtn('tpAddAgendaBtn', 'Agendar')) +
    (all.length ? '<div id="tpAgendaList">' + shown.map(agendaRow).join('') +
      (past.length ? `<button type="button" class="tp-past-toggle" id="tpPastAgendasBtn">${mostraPassadas ? 'Ocultar anteriores' : 'Mostrar ' + past.length + ' anterior' + (past.length > 1 ? 'es' : '')}</button>` : '') + '</div>'
      : '<div id="tpAgendaList"></div><div class="rl-empty">Nenhuma agenda vinculada.</div>');
  liga(ba);
  const pb = ba.querySelector('#tpPastAgendasBtn');
  if(pb) pb.onclick = (e) => { e.stopPropagation(); mostraPassadas = !mostraPassadas; bindTpRelacionados(panel, task); };
  ba.querySelector('#tpAddAgendaBtn').onclick = (e) => { e.stopPropagation(); const t = getOrCreateActiveTask(); if(!t) return; openEventComposer(null, t.dueDate || todayStr(), t.id); };
  ba.querySelectorAll('.rl-ag').forEach(row => {
    row.querySelector('[data-x]').onclick = (e) => {
      e.stopPropagation();
      const ev = G.state.events.find(x => x.id === row.dataset.open.slice(6));
      if(ev){ ev.linkedTaskId = null; markDirty(); }
    };
  });
}
