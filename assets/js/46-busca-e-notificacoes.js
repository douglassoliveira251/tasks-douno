import { G } from './globais.js';
import { PAGE_HEADER_ICONS } from './05-novidades-painel.js';
import { catById, dateToStr, escapeHtml, fmtDate, fold, todayStr } from './10-helpers.js';
import { STATUS_CONFIG } from './12-render-tasks.js';
import { recurrenceSummaryLabel } from './16-painel-lateral-de-tarefa.js';
import { stripHtml } from './23-texto-rico-utilitarios.js';
import { openNoteComposer } from './24-render-notes.js';
import { getEventsForDate } from './25-calendario.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { projectById } from './31-projetos.js';
import { followUpLabel } from './35-templates-de-tarefa.js';
import { render } from './48-render-principal.js';
import { persistOnly } from './08-persistencia.js';
import { showUndoToast } from './42-nuvem-persistencia.js';
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
/* ---- ajudas para as linhas de resultado (cada tipo mostra o que importa nele) ---- */
const SR_WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function srDay(dateStr){ const [y, m, d] = String(dateStr).split('-').map(Number); return new Date(y, m - 1, d, 12); }
function srDiffDays(dateStr){ return Math.round((srDay(dateStr) - srDay(todayStr())) / 86400000); }
function srRel(dateStr){ const n = srDiffDays(dateStr); return n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : n === -1 ? 'Ontem' : ''; }
function srAgo(ms){
  const n = Math.max(0, Math.round((Date.now() - ms) / 86400000));
  return n === 0 ? 'hoje' : n === 1 ? 'ontem' : n < 30 ? 'há ' + n + ' dias' : n < 365 ? 'há ' + Math.round(n / 30) + (Math.round(n / 30) === 1 ? ' mês' : ' meses') : 'há mais de 1 ano';
}
function srMinutes(hhmm){ const [h, m] = String(hhmm || '').split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0); }
function srDuration(a, b){
  const x = srMinutes(a), y = srMinutes(b);
  if(x === null || y === null || y <= x) return '';
  const d = y - x, h = Math.floor(d / 60), m = d % 60;
  return h ? h + 'h' + (m ? String(m).padStart(2, '0') : '') : m + 'min';
}
function srTags(it){
  const tags = (it.tagIds || []).map(id => G.state.tags.find(t => t.id === id)).filter(Boolean);
  if(!tags.length) return '';
  const show = tags.slice(0, 2).map(tg => `<span class="sr-tagp" style="background:${escapeHtml(tg.color)}22; color:${escapeHtml(tg.color)}">${escapeHtml(tg.name)}</span>`).join('');
  return show + (tags.length > 2 ? `<span class="sr-more">+${tags.length - 2}</span>` : '');
}
const srPill = (cls, text) => `<span class="sr-pill ${cls}">${escapeHtml(text)}</span>`;
/* devolve { meta, snip, when, sub, whenCls } da linha de cada tipo */
export function searchRowInfo(kind, it, term){
  const parts = [];
  let snip = '', when = '', sub = '', whenCls = '';
  if(kind === 'tasks'){
    const st = it.done ? 'concluida' : (it.status || 'nao_iniciado');
    const stLabel = (STATUS_CONFIG.find(x => x.key === st) || STATUS_CONFIG[0]).label;
    parts.push(srPill(st === 'em_andamento' ? 'st-b' : st === 'concluida' ? 'st-ok' : 'st-n', stLabel));
    const over = !it.done && it.dueDate && it.dueDate < todayStr();
    if(over){ const n = -srDiffDays(it.dueDate); parts.push(`<span class="sr-red">Venceu ${n === 1 ? 'ontem' : 'há ' + n + ' dias'}</span>`); }
    const subs = it.subtasks || [];
    if(subs.length) parts.push(`<span>${subs.filter(s => s.done).length}/${subs.length} subtarefas</span>`);
    const pr = it.projectId ? projectById(it.projectId) : null;
    if(pr){ const sg = (pr.stages || []).find(x => x.id === it.stageId); parts.push(`<span>${escapeHtml(pr.name)}${sg ? ' › ' + escapeHtml(sg.name) : ''}</span>`); }
    const tg = srTags(it); if(tg) parts.push(tg);
    const fu = followUpLabel(it); if(fu) parts.push(`<span>${escapeHtml(fu)}</span>`);
    const nc = (it.comments || []).length; if(nc) parts.push(`<span>${nc} ${nc === 1 ? 'comentário' : 'comentários'}</span>`);
    if(it.recurrence && it.recurrence !== 'none') parts.push(`<span>${escapeHtml(recurrenceSummaryLabel(it))}</span>`);
    if(it.done) when = it.dueDate ? fmtDate(it.dueDate) : '';
    else if(!it.dueDate) when = 'Sem prazo';
    else { when = over ? 'Vencida' : (srRel(it.dueDate) || fmtDate(it.dueDate)); sub = fmtDate(it.dueDate) + (it.dueTime ? ' · ' + it.dueTime : ''); whenCls = over ? 'red' : ''; }
  } else if(kind === 'events'){
    if(it.allDay || !it.startTime) parts.push('<span>Dia todo</span>');
    else { const du = srDuration(it.startTime, it.endTime); parts.push(`<span>${it.startTime}${it.endTime ? ' – ' + it.endTime : ''}${du ? ' (' + du + ')' : ''}</span>`); }
    if(it.endDate && it.endDate !== it.date) parts.push(`<span>até ${fmtDate(it.endDate)}</span>`);
    const na = (it.attendees || []).length; if(na) parts.push(`<span>${na} ${na === 1 ? 'convidado' : 'convidados'}</span>`);
    if(it.recurrence && it.recurrence !== 'none') parts.push(`<span>${escapeHtml(recurrenceSummaryLabel(it))}</span>`);
    const tg = srTags(it); if(tg) parts.push(tg);
    if(it.linkedTaskId) parts.push('<span>Tarefa vinculada</span>');
    if(it.outlookEventId) parts.push(srPill('st-v', 'Outlook'));
    if(it.date){ const r = srRel(it.date); when = r || SR_WD[srDay(it.date).getDay()]; sub = (r ? SR_WD[srDay(it.date).getDay()] + ', ' : '') + fmtDate(it.date); }
  } else {
    const body = stripHtml(it.body || '').replace(/\s+/g, ' ').trim();
    snip = fold(it.title || '').includes(fold(term.trim())) ? body.slice(0, 110) + (body.length > 110 ? '…' : '') : searchSnippet(it, term);
    const nb = it.notebookId ? G.state.notebooks.find(x => x.id === it.notebookId) : null;
    parts.push(`<span>${nb ? 'Caderno ' + escapeHtml(nb.name || 'sem nome') : 'Sem caderno'}</span>`);
    const tg = srTags(it); if(tg) parts.push(tg);
    if(it.pinned) parts.push('<span>Fixada</span>');
    if(it.updatedAt) when = srAgo(it.updatedAt);
  }
  return { meta: parts.join(''), snip, when, sub, whenCls };
}
export function renderSearchResultsDropdown(){
  const dd = document.getElementById('searchResultsDropdown');
  const term = G.searchTerm;
  if(!term.trim()){ dd.style.display = 'none'; return; }
  const res = computeGlobalSearchResults(term);
  const nDone = res.counts.done, nPast = res.counts.past;
  const showDone = searchShowDone && nDone > 0;
  const showPast = searchShowPast && nPast > 0;
  const total = res.counts.tasks + res.counts.notes + res.counts.events + (showDone ? nDone : 0) + (showPast ? nPast : 0);
  if(!total && !nDone && !nPast){
    dd.innerHTML = `<div class="search-results-empty">Nenhum resultado para "${escapeHtml(term)}"</div>`;
    dd.style.display = 'block';
    return;
  }
  const chip = (id, on, label, n) => `<button type="button" class="sr-chip ${on ? 'on' : ''}" id="${id}" aria-pressed="${on}">${label}<i>${n}</i></button>`;
  const chips = (nPast || nDone) ? `<span class="sr-chips">${nPast ? chip('srTogglePast', showPast, 'Agendas passadas', nPast) : ''}${nDone ? chip('srToggleDone', showDone, 'Concluídas', nDone) : ''}</span>` : '';
  const KIND = { tasks: { cls: 't', icon: 'tasks', svg: SR_ICON_TASK }, notes: { cls: 'n', icon: 'notes', svg: SR_ICON_NOTE }, events: { cls: 'e', icon: 'calendar', svg: SR_ICON_EVENT } };
  const sections = [
    { label: 'Tarefas', kind: 'tasks', items: res.tasks, count: res.counts.tasks },
    { label: 'Agenda', kind: 'events', items: res.events, count: res.counts.events },
    { label: 'Notas', kind: 'notes', items: res.notes, count: res.counts.notes },
    ...(showPast ? [{ label: 'Agendas passadas', kind: 'events', items: res.pastEvents, count: nPast, past: true }] : []),
    ...(showDone ? [{ label: 'Concluídas', kind: 'tasks', items: res.doneTasks, count: nDone, done: true }] : []),
  ].filter(s => s.items.length);
  let idx = 0;
  const body = sections.map(sec => {
    const shown = sec.items.length;
    const lab = `${sec.label} · ${shown < sec.count ? shown + ' de ' + sec.count : sec.count}`;
    const rows = sec.items.map(it => {
      const i = idx++, k = KIND[sec.kind], info = searchRowInfo(sec.kind, it, term);
      return `<div class="sr-row ${sec.done ? 'done' : ''} ${sec.past ? 'past' : ''} ${i === searchActiveIdx ? 'on' : ''}" data-kind="${k.icon}" data-id="${it.id}" data-i="${i}">
        <span class="sr-ic ${k.cls}">${k.svg}</span>
        <span class="sr-main">
          <span class="sr-title">${highlightTerm(it.title || 'Sem título', term)}</span>
          ${info.snip ? `<span class="sr-snip">${highlightTerm(info.snip, term)}</span>` : ''}
          <span class="sr-meta">${info.meta}</span>
        </span>
        ${info.when ? `<span class="sr-when ${info.whenCls}">${escapeHtml(info.when)}${info.sub ? `<small>${escapeHtml(info.sub)}</small>` : ''}</span>` : ''}
      </div>`;
    }).join('');
    return `<div class="sr-sec"><span>${lab}</span></div>${rows}`;
  }).join('');
  if(searchActiveIdx >= idx) searchActiveIdx = 0;
  dd.innerHTML = `
    <div class="sr-head"><b>${total} ${total === 1 ? 'resultado' : 'resultados'} para “${escapeHtml(term.trim())}”</b>${chips}</div>
    <div class="sr-list">${body || `<div class="search-results-empty" style="padding:14px 10px;">Nada em aberto para "${escapeHtml(term)}"</div>`}</div>
    <div class="sr-keys"><span><kbd>↑</kbd><kbd>↓</kbd>navegar</span><span><kbd>Enter</kbd>abrir</span><span><kbd>Esc</kbd>fechar</span></div>`;
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
/* Agenda de hoje: cada item pode ser dispensado só por hoje (volta amanhã se houver outra agenda). Tarefas não se dispensam:
   enquanto estiverem atrasadas/de hoje, ficam fixas. Guardado em state.notifDismissed = { 'AAAA-MM-DD': [ids] }. */
function dismissedToday(){
  const today = todayStr();
  const all = G.state.notifDismissed;
  return (all && Array.isArray(all[today])) ? all[today] : [];
}
function setDismissedToday(ids){
  G.state.notifDismissed = { [todayStr()]: ids }; // só o dia de hoje fica guardado
  persistOnly();
}
export function dismissAgendaItems(ids){
  const prev = dismissedToday();
  setDismissedToday(Array.from(new Set(prev.concat(ids))));
  updateNotifBadge(); renderNotifDropdown();
  showUndoToast(ids.length > 1 ? 'Agendas de hoje dispensadas.' : 'Agenda dispensada por hoje.', 'Desfazer', () => {
    setDismissedToday(dismissedToday().filter(id => !ids.includes(id)));
    updateNotifBadge(); renderNotifDropdown();
  });
}
export function computeNotifItems(){
  const today = todayStr();
  const inSpace = x => !G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter;
  const overdueTasks = G.state.tasks.filter(t => inSpace(t) && !t.done && t.dueDate && t.dueDate < today)
    .sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const todayTasks = G.state.tasks.filter(t => inSpace(t) && !t.done && t.dueDate === today);
  const hidden = dismissedToday();
  const todayEvents = getEventsForDate(today).filter(ev => !hidden.includes(ev.id));
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
  function group(label, items, iconKey, iconBg, iconColor, metaFn, extraClass, dismissible){
    if(!items.length) return '';
    return `
      <div class="search-results-group-label${dismissible ? ' notif-group-head' : ''}"><span>${label}</span>${dismissible && items.length > 1 ? '<button type="button" class="notif-clear" data-ids="' + items.map(i => i.id).join(',') + '">Dispensar todas</button>' : ''}</div>
      ${items.map(it => `
        <div class="search-result-row ${extraClass||''}" data-kind="${iconKey}" data-id="${it.id}">
          <span class="search-result-icon" style="background:${iconBg}; color:${iconColor};">${PAGE_HEADER_ICONS[iconKey]}</span>
          <span class="search-result-title">${escapeHtml(it.title||'Sem título')}</span>
          <span class="search-result-meta">${metaFn(it)}</span>
          ${dismissible ? '<button type="button" class="notif-x" data-dismiss="' + it.id + '" title="Dispensar por hoje" aria-label="Dispensar por hoje">' + icon('x') + '</button>' : ''}
        </div>
      `).join('')}
    `;
  }
  dd.innerHTML =
    group('Atrasadas', overdueTasks, 'tasks', 'var(--danger-light)', 'var(--danger)', t => withFollow(t) + fmtDate(t.dueDate), 'notif-overdue') +
    group('Tarefas de hoje', todayTasks, 'tasks', 'var(--primary-light)', 'var(--primary)', t => withFollow(t) + (t.dueTime || '')) +
    group('Retomar hoje', followOnly, 'tasks', '#FFF1D6', '#8A5A00', t => fmtDate(t.followUpDate)) +
    group('Agenda de hoje', todayEvents, 'calendar', 'var(--priority-baixa-light)', 'var(--priority-baixa)', ev => ev.allDay ? '' : (ev.startTime||''), '', true);
  dd.querySelectorAll('.notif-x').forEach(b => { b.onclick = (e) => { e.stopPropagation(); dismissAgendaItems([b.dataset.dismiss]); }; });
  dd.querySelectorAll('.notif-clear').forEach(b => { b.onclick = (e) => { e.stopPropagation(); dismissAgendaItems(b.dataset.ids.split(',')); }; });
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
