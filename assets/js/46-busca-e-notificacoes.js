import { G } from './globais.js';
import { PAGE_HEADER_ICONS } from './05-novidades-painel.js';
import { catById, dateToStr, escapeHtml, fmtDate, fold, todayStr } from './10-helpers.js';
import { STATUS_CONFIG } from './12-render-tasks.js';
import { stripHtml } from './23-texto-rico-utilitarios.js';
import { openNoteComposer } from './24-render-notes.js';
import { getEventsForDate } from './25-calendario.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { projectById } from './31-projetos.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';
let searchShowDone, searchShowPast;

export function updateSearchClearBtnVisibility(){
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if(input && clearBtn) clearBtn.style.display = input.value ? 'flex' : 'none';
}
export function clearSearchTerm(){
  G.searchTerm = '';
  searchShowDone = false; searchShowPast = false;
  const input = document.getElementById('searchInput');
  if(input) input.value = '';
  updateSearchClearBtnVisibility();
}
let searchTab = 'all';
let searchActiveIdx = 0;
searchShowDone = false; // busca: concluídas ficam ocultas até o usuário pedir
searchShowPast = false; // busca: agendas que já passaram também ficam ocultas até o usuário pedir
export const SEARCH_LIMIT = 8;
export function computeGlobalSearchResults(term){
  const t = fold(term.trim());
  if(!t) return { tasks:[], doneTasks:[], notes:[], events:[], pastEvents:[], counts:{ tasks:0, done:0, notes:0, events:0, past:0 } };
  const tasksFound = G.state.tasks.filter(x => fold(x.title).includes(t));
  const tasksAll = tasksFound.filter(x => !x.done);
  const doneAll = tasksFound.filter(x => x.done);
  const notesAll = G.state.notes.filter(x => !x.archived && fold((x.title||'')+' '+stripHtml(x.body||'')).includes(t));
  const eventsFound = G.state.events.filter(x => fold(x.title).includes(t));
  const today = todayStr();
  /* agenda passada: terminou antes de hoje (repetidas só se a repetição já acabou); a de hoje continua valendo */
  const isPast = (x) => (x.recurrence && x.recurrence !== 'none') ? !!(x.recurrenceEndDate && x.recurrenceEndDate < today) : (x.endDate || x.date) < today;
  const eventsAll = eventsFound.filter(x => !isPast(x));
  const pastAll = eventsFound.filter(isPast).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return {
    tasks: tasksAll.slice(0, SEARCH_LIMIT), doneTasks: doneAll.slice(0, SEARCH_LIMIT), notes: notesAll.slice(0, SEARCH_LIMIT), events: eventsAll.slice(0, SEARCH_LIMIT), pastEvents: pastAll.slice(0, SEARCH_LIMIT),
    counts: { tasks: tasksAll.length, done: doneAll.length, notes: notesAll.length, events: eventsAll.length, past: pastAll.length },
  };
}
export function closeSearchResultsDropdown(){
  document.getElementById('searchResultsDropdown').style.display = 'none';
}
export function highlightTerm(text, term){
  const raw = String(text || '');
  const t = term.trim();
  if(!t) return escapeHtml(raw);
  const i = fold(raw).indexOf(fold(t));
  if(i < 0) return escapeHtml(raw);
  return escapeHtml(raw.slice(0, i)) + '<mark class="sr-mark">' + escapeHtml(raw.slice(i, i + t.length)) + '</mark>' + escapeHtml(raw.slice(i + t.length));
}
export function searchSnippet(note, term){
  const body = stripHtml(note.body || '');
  const i = fold(body).indexOf(fold(term.trim()));
  if(i < 0) return '';
  const from = Math.max(0, i - 24);
  return (from > 0 ? '…' : '') + body.slice(from, i + term.trim().length + 40).replace(/\s+/g, ' ');
}
export function searchItemContext(kind, it){
  const cat = catById(it.categoryId);
  const parts = [];
  if(cat) parts.push(escapeHtml(cat.name));
  if(kind === 'tasks'){
    const pr = it.projectId ? projectById(it.projectId) : null;
    if(pr) parts.push(escapeHtml(pr.name));
    const st = it.status || 'nao_iniciado';
    if(!it.done && st !== 'nao_iniciado') parts.push((STATUS_CONFIG.find(x => x.key === st) || STATUS_CONFIG[0]).label);
  } else if(kind === 'notes'){
    const nb = it.notebookId ? G.state.notebooks.find(x => x.id === it.notebookId) : null;
    if(nb) parts.push(escapeHtml(nb.name || 'Caderno'));
  }
  return parts.join(' · ');
}
/* data à direita da linha */
export function searchItemDate(kind, it){
  if(kind === 'tasks'){
    if(it.done) return it.dueDate ? fmtDate(it.dueDate) : '';
    return it.dueDate ? fmtDate(it.dueDate) + (it.dueTime ? ' ' + it.dueTime : '') : 'Sem prazo';
  }
  if(kind === 'notes') return it.updatedAt ? fmtDate(dateToStr(new Date(it.updatedAt))) : '';
  return it.date ? fmtDate(it.date) + (it.allDay || !it.startTime ? '' : ' ' + it.startTime) : '';
}
export const SR_ICON_TASK = icon('check-square');
export const SR_ICON_NOTE = icon('file-text');
export const SR_ICON_EVENT = icon('calendar-blank');
export function renderSearchResultsDropdown(){
  const dd = document.getElementById('searchResultsDropdown');
  const term = G.searchTerm;
  if(!term.trim()){ dd.style.display = 'none'; return; }
  const res = computeGlobalSearchResults(term);
  const nDone = res.counts.done;
  const showDone = searchShowDone && nDone > 0;
  const nPast = res.counts.past;
  const showPast = searchShowPast && nPast > 0;
  const counts = { tasks: res.counts.tasks + (showDone ? nDone : 0), notes: res.counts.notes, events: res.counts.events + (showPast ? nPast : 0) };
  const total = counts.tasks + counts.notes + counts.events;
  const chip = (id, on, label, n) => `<button type="button" class="sr-chip ${on ? 'on' : ''}" id="${id}" aria-pressed="${on}">${label}<i>${n}</i></button>`;
  const chips = (nPast || nDone) ? `<div class="sr-chips">${nPast ? chip('srTogglePast', showPast, 'Agendas passadas', nPast) : ''}${nDone ? chip('srToggleDone', showDone, 'Concluídas', nDone) : ''}</div>` : '';
  const foot = `<div class="sr-foot"><span class="sr-hint">Enter abrir</span></div>`;
  if(!total && !nDone && !nPast){
    dd.innerHTML = `<div class="search-results-empty">Nenhum resultado para "${escapeHtml(term)}"</div>`;
    dd.style.display = 'block';
    return;
  }
  const TABS = [['all', 'Tudo', total], ['tasks', 'Tarefas', counts.tasks], ['notes', 'Notas', counts.notes], ['events', 'Agenda', counts.events]];
  if(searchTab !== 'all' && !counts[searchTab]) searchTab = 'all';
  const KIND = { tasks: { cls: 't', icon: 'tasks', svg: SR_ICON_TASK }, notes: { cls: 'n', icon: 'notes', svg: SR_ICON_NOTE }, events: { cls: 'e', icon: 'calendar', svg: SR_ICON_EVENT } };
  let items = [];
  if(searchTab === 'all' || searchTab === 'tasks') items = items.concat(res.tasks.map(it => ({ kind: 'tasks', it })));
  if(searchTab === 'all' || searchTab === 'notes') items = items.concat(res.notes.map(it => ({ kind: 'notes', it })));
  if(searchTab === 'all' || searchTab === 'events') items = items.concat(res.events.map(it => ({ kind: 'events', it })));
  const pastItems = showPast && (searchTab === 'all' || searchTab === 'events') ? res.pastEvents.map(it => ({ kind: 'events', it, past: true })) : [];
  items = items.concat(pastItems);
  const doneItems = showDone && (searchTab === 'all' || searchTab === 'tasks') ? res.doneTasks.map(it => ({ kind: 'tasks', it, done: true })) : [];
  items = items.concat(doneItems);
  if(searchActiveIdx >= items.length) searchActiveIdx = 0;
  let doneHeadShown = false, pastHeadShown = false;
  dd.innerHTML = `
    <div class="sr-tabs">${TABS.map(tb => `<button type="button" class="sr-tab ${searchTab === tb[0] ? 'on' : ''}" data-tab="${tb[0]}">${tb[1]}<i>${tb[2]}</i></button>`).join('')}</div>
    ${chips}
    <div class="sr-list">
      ${items.length ? items.map((x, i) => {
        const k = KIND[x.kind];
        const snip = x.kind === 'notes' && !fold(x.it.title).includes(fold(term.trim())) ? searchSnippet(x.it, term) : '';
        let head = '';
        if(x.done && !doneHeadShown){ doneHeadShown = true; head = '<div class="sr-sec">Concluídas</div>'; }
        if(x.past && !pastHeadShown){ pastHeadShown = true; head = '<div class="sr-sec">Agendas passadas</div>'; }
        return head + `<div class="sr-row ${x.done ? 'done' : ''} ${x.past ? 'past' : ''} ${i === searchActiveIdx ? 'on' : ''}" data-kind="${k.icon}" data-id="${x.it.id}" data-i="${i}">
          <span class="sr-ic ${k.cls}">${k.svg}</span>
          <span class="sr-main">
            <span class="sr-title">${highlightTerm(x.it.title || 'Sem título', term)}</span>
            ${snip ? `<span class="sr-ctx">${highlightTerm(snip, term)}</span>` : ''}
            <span class="sr-ctx">${searchItemContext(x.kind, x.it)}</span>
          </span>
          <span class="sr-date">${searchItemDate(x.kind, x.it)}</span>
        </div>`;
      }).join('') : `<div class="search-results-empty" style="padding:14px 10px;">Nada em aberto para "${escapeHtml(term)}"</div>`}
    </div>
    ${foot}`;
  if(window.innerWidth <= 768){
    const wrapRect = document.getElementById('searchWrap').getBoundingClientRect();
    dd.style.position = 'fixed';
    dd.style.left = '16px';
    dd.style.right = '16px';
    dd.style.top = (wrapRect.bottom + 8) + 'px';
  } else {
    dd.style.position = '';
    dd.style.left = '';
    dd.style.right = '';
    dd.style.top = '';
  }
  function openResult(row){
    const kind = row.dataset.kind;
    const id = row.dataset.id;
    clearSearchTerm();
    closeSearchResultsDropdown();
    if(kind === 'tasks'){
      G.currentView = 'tasks'; G.activeTaskId = id; G.creatingNewTask = false; render();
    } else if(kind === 'notes'){
      G.currentView = 'notes'; render();
      const n = G.state.notes.find(x => x.id === id);
      if(n) openNoteComposer(n);
    } else if(kind === 'calendar'){
      const ev = G.state.events.find(x => x.id === id);
      if(ev) openEventComposer(ev);
    }
  }
  dd._openResult = openResult;
  [['#srToggleDone', () => { searchShowDone = !searchShowDone; }], ['#srTogglePast', () => { searchShowPast = !searchShowPast; }]].forEach(([sel, toggleFn]) => {
    const btn = dd.querySelector(sel);
    if(btn) btn.onclick = (e) => { e.stopPropagation(); toggleFn(); searchActiveIdx = 0; renderSearchResultsDropdown(); };
  });
  dd.querySelectorAll('.sr-tab').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); searchTab = btn.dataset.tab; searchActiveIdx = 0; renderSearchResultsDropdown(); };
  });
  dd.querySelectorAll('.sr-row').forEach(row => {
    row.onclick = () => openResult(row);
    row.onmouseenter = () => {
      searchActiveIdx = +row.dataset.i;
      dd.querySelectorAll('.sr-row').forEach(r => r.classList.toggle('on', r === row));
    };
  });
  dd.style.display = 'block';
}
// teclado: setas, Enter e Esc dentro da busca
/* Em tela estreita o texto longo do campo de busca era cortado: usa uma versão curta. */
{
  const campo = document.getElementById('searchInput');
  const estreita = window.matchMedia('(max-width:560px)');
  const ajustar = () => { campo.placeholder = estreita.matches ? 'Buscar…' : 'Buscar tarefas, notas, eventos...'; };
  ajustar();
  estreita.addEventListener('change', ajustar);
}
document.getElementById('searchInput').addEventListener('keydown', (e) => {
  const dd = document.getElementById('searchResultsDropdown');
  if(!dd || dd.style.display === 'none') return;
  const rows = Array.from(dd.querySelectorAll('.sr-row'));
  if(e.key === 'Escape'){ closeSearchResultsDropdown(); return; }
  if(!rows.length) return;
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault();
    searchActiveIdx = (searchActiveIdx + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows.forEach((r, i) => r.classList.toggle('on', i === searchActiveIdx));
    rows[searchActiveIdx].scrollIntoView({ block: 'nearest' });
  } else if(e.key === 'Enter'){
    e.preventDefault();
    const row = rows[searchActiveIdx] || rows[0];
    if(row && dd._openResult) dd._openResult(row);
  }
});
export function computeNotifItems(){
  const today = todayStr();
  const inSpace = x => !G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter;
  const overdueTasks = G.state.tasks.filter(t => inSpace(t) && !t.done && t.dueDate && t.dueDate < today)
    .sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const todayTasks = G.state.tasks.filter(t => inSpace(t) && !t.done && t.dueDate === today);
  const todayEvents = getEventsForDate(today);
  const followUpTasks = G.state.tasks.filter(t => inSpace(t) && !t.done && t.followUpDate && t.followUpDate <= today)
    .sort((a,b) => (a.followUpDate||'').localeCompare(b.followUpDate||''));
  /* uma tarefa aparece uma vez só: se já está em Atrasadas/Hoje, a retomada vira só uma marca na linha */
  const shown = new Set(overdueTasks.concat(todayTasks).map(t => t.id));
  const followOnly = followUpTasks.filter(t => !shown.has(t.id));
  return { overdueTasks, todayTasks, todayEvents, followUpTasks, followOnly };
}
export function updateNotifBadge(){
  const { overdueTasks, todayTasks, todayEvents, followOnly } = computeNotifItems();
  const count = overdueTasks.length + todayTasks.length + todayEvents.length + followOnly.length;
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.style.display = count > 0 ? 'block' : 'none';
}
export function renderNotifDropdown(){
  const dd = document.getElementById('notifDropdown');
  const { overdueTasks, todayTasks, todayEvents, followOnly } = computeNotifItems();
  const followToday = t => t.followUpDate && t.followUpDate <= todayStr();
  const withFollow = t => (followToday(t) ? '<span class="notif-follow" title="Também para retomar">↻</span> ' : '');
  if(!overdueTasks.length && !todayTasks.length && !todayEvents.length && !followOnly.length){
    dd.innerHTML = `<div class="notif-dropdown-empty">Nenhuma pendência por aqui. 🎉</div>`;
    dd.style.display = 'block';
    return;
  }
  function group(label, items, iconKey, iconBg, iconColor, metaFn, extraClass){
    if(!items.length) return '';
    return `
      <div class="search-results-group-label">${label}</div>
      ${items.map(it => `
        <div class="search-result-row ${extraClass||''}" data-kind="${iconKey}" data-id="${it.id}">
          <span class="search-result-icon" style="background:${iconBg}; color:${iconColor};">${PAGE_HEADER_ICONS[iconKey]}</span>
          <span class="search-result-title">${escapeHtml(it.title||'Sem título')}</span>
          <span class="search-result-meta">${metaFn(it)}</span>
        </div>
      `).join('')}
    `;
  }
  dd.innerHTML =
    group('Atrasadas', overdueTasks, 'tasks', 'var(--danger-light)', 'var(--danger)', t => withFollow(t) + fmtDate(t.dueDate), 'notif-overdue') +
    group('Tarefas de hoje', todayTasks, 'tasks', 'var(--primary-light)', 'var(--primary)', t => withFollow(t) + (t.dueTime || '')) +
    group('Retomar hoje', followOnly, 'tasks', '#FFF1D6', '#8A5A00', t => fmtDate(t.followUpDate)) +
    group('Agenda de hoje', todayEvents, 'calendar', 'var(--priority-baixa-light)', 'var(--priority-baixa)', ev => ev.allDay ? '' : (ev.startTime||''));
  dd.querySelectorAll('.search-result-row').forEach(row => {
    row.onclick = () => {
      const kind = row.dataset.kind;
      const id = row.dataset.id;
      closeNotifDropdown();
      if(kind === 'tasks'){
        G.currentView = 'tasks'; G.activeTaskId = id; G.creatingNewTask = false; render();
      } else if(kind === 'calendar'){
        const ev = G.state.events.find(x => x.id === id);
        if(ev) openEventComposer(ev);
      }
    };
  });
  dd.style.display = 'block';
}
export function closeNotifDropdown(){
  const dd = document.getElementById('notifDropdown');
  if(dd) dd.style.display = 'none';
}
document.getElementById('notificationBtn').onclick = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('notifDropdown');
  const isOpen = dd.style.display !== 'none';
  closeSearchResultsDropdown();
  if(isOpen){ closeNotifDropdown(); } else { renderNotifDropdown(); }
};
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('topbarNotifWrap');
  if(wrap && !wrap.contains(e.target)) closeNotifDropdown();
});
document.getElementById('searchInput').addEventListener('input', e => {
  G.searchTerm = e.target.value;
  updateSearchClearBtnVisibility();
  renderSearchResultsDropdown();
  render();
});
document.getElementById('searchInput').addEventListener('focus', () => {
  if(G.searchTerm.trim()) renderSearchResultsDropdown();
});
document.getElementById('searchClearBtn').onclick = () => {
  const input = document.getElementById('searchInput');
  input.value = '';
  G.searchTerm = '';
  updateSearchClearBtnVisibility();
  closeSearchResultsDropdown();
  input.focus();
  render();
};
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('searchWrap');
  if(wrap && !wrap.contains(e.target)) closeSearchResultsDropdown();
});
