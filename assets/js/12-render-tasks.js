import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { dateToStr, escapeHtml, fmtDate, isOverdue, spawnNextRecurrence, todayStr } from './10-helpers.js';
import { closeAllTaskMenus, openTaskRowMenu } from './13-portais-de-tarefa.js';
import { openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { renderTaskPanel } from './17-painel-lateral-render.js';
import { projectById } from './31-projetos.js';
import { followUpLabel, followUpState, openTemplatePickMenu } from './35-templates-de-tarefa.js';
import { groupModeKey, render } from './48-render-principal.js';

/* ===================== RENDER: TASKS ===================== */
export const PRIORITY_CONFIG = [
  { key:'baixa', label:'Baixa', color:'var(--priority-baixa)' },
  { key:'media', label:'Média', color:'var(--priority-media)' },
  { key:'alta', label:'Alta', color:'var(--priority-alta)' },
  { key:'critica', label:'Crítica', color:'var(--priority-critica)' }
];

export const STATUS_CONFIG = [
  { key:'nao_iniciado', label:'Não iniciado' },
  { key:'em_andamento', label:'Em andamento' },
  { key:'concluida', label:'Concluída' }
];
export function pinIconSvg(isPinned){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 17v5"/>
    <path fill="${isPinned ? 'currentColor' : 'none'}" d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24Z"/>
  </svg>`;
}

export function statusCircleSvg(statusKey){
  if(statusKey === 'concluida') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.3" fill="currentColor"/></svg>';
  if(statusKey === 'em_andamento') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--ink-faint)" stroke-width="2.5"/><path d="M12 3a9 9 0 000 18z" fill="var(--ok-dark)"/></svg>';
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
}

G.taskGroupMode = 'retomada'; // 'periodo' | 'grupos' | 'prioridade'

export function periodBoundaries(){
  const now = new Date();
  const todayS = todayStr();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
  const tomorrowS = dateToStr(tomorrow);
  const dow = now.getDay();
  const endOfWeek = new Date(now); endOfWeek.setDate(now.getDate() + ((7 - dow) % 7));
  const endOfWeekS = dateToStr(endOfWeek);
  const endOfNextWeek = new Date(endOfWeek); endOfNextWeek.setDate(endOfWeek.getDate()+7);
  const endOfNextWeekS = dateToStr(endOfNextWeek);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const endOfMonthS = dateToStr(endOfMonth);
  return { todayS, tomorrowS, endOfWeekS, endOfNextWeekS, endOfMonthS };
}

export function periodBucketKeyFor(dueDate){
  if(!dueDate) return 'sem_prazo';
  const { todayS, tomorrowS, endOfWeekS, endOfNextWeekS, endOfMonthS } = periodBoundaries();
  if(dueDate < todayS) return 'vencido';
  if(dueDate === todayS) return 'hoje';
  if(dueDate === tomorrowS) return 'amanha';
  if(dueDate <= endOfWeekS) return 'semana';
  if(dueDate <= endOfNextWeekS) return 'proxima_semana';
  if(dueDate <= endOfMonthS) return 'mes';
  return 'depois';
}

export const PERIOD_CONFIG = [
  { key:'vencido', label:'Vencida', color:'var(--danger)' },
  { key:'hoje', label:'Vence hoje', color:'var(--priority-alta)' },
  { key:'amanha', label:'Amanhã', color:'var(--ink-soft)' },
  { key:'semana', label:'Nessa semana', color:'var(--ink-soft)' },
  { key:'proxima_semana', label:'Próxima semana', color:'var(--ink-soft)' },
  { key:'mes', label:'Neste mês', color:'var(--ink-faint)' },
  { key:'depois', label:'Mais tarde', color:'var(--ink-faint)' },
  { key:'sem_prazo', label:'Sem prazo', color:'var(--ink-faint)' }
];

export function computeTaskGroups(){
  const term = G.searchTerm.trim().toLowerCase();
  let pool = G.state.tasks.filter(t => !G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter);
  if(term) pool = pool.filter(t => t.title.toLowerCase().includes(term));
  if(G.activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => G.activeTagFilters.includes(id)));
  if(G.activeCriticalityFilters.length) pool = pool.filter(t => G.activeCriticalityFilters.includes(t.priority||'media'));
  if(G.taskProjectFilter === 'personal') pool = pool.filter(t => !t.projectId);
  else if(G.taskProjectFilter === 'project') pool = pool.filter(t => !!t.projectId);
  else if(G.taskProjectFilter !== 'all') pool = pool.filter(t => t.projectId === G.taskProjectFilter);
  pool = pool.filter(t => !t.done);

  if(G.taskGroupMode === 'prioridade'){
    const order = [...PRIORITY_CONFIG].reverse().concat([{key:null,label:'Sem prioridade',color:'var(--ink-faint)'}]);
    return order.map(p => ({
      key: p.key || 'sem_prioridade', label: p.label, color: p.color,
      tasks: pool.filter(t => (t.priority||null) === p.key),
      quickAddDefaults: { priority: p.key }
    }));
  }
  if(G.taskGroupMode === 'status'){
    return STATUS_CONFIG.map(s => ({
      key: s.key, label: s.label, color: 'var(--ink-faint)',
      tasks: pool.filter(t => (t.status||'nao_iniciado') === s.key),
      quickAddDefaults: { status: s.key }
    }));
  }
  if(G.taskGroupMode === 'tags'){
    const groups = G.state.tags.map(tg => ({
      key: tg.id, label: tg.name, color: tg.color,
      tasks: pool.filter(t => (t.tagIds||[]).includes(tg.id)),
      quickAddDefaults: {}
    }));
    groups.push({
      key: 'sem_tag', label: 'Sem tag', color: 'var(--ink-faint)',
      tasks: pool.filter(t => !(t.tagIds||[]).length),
      quickAddDefaults: {}
    });
    return groups;
  }
  if(G.taskGroupMode === 'retomada'){
    // mesma régua da visão por período (hoje, amanhã, semana, próxima semana, mês…), aplicada à data de retomada
    const defs = [
      { key:'vencido', label:'Retomada vencida', color:'var(--danger)' },
      { key:'hoje', label:'Retomar hoje', color:'var(--priority-alta)' },
      { key:'amanha', label:'Amanhã', color:'var(--ink-soft)' },
      { key:'semana', label:'Nessa semana', color:'var(--ink-soft)' },
      { key:'proxima_semana', label:'Próxima semana', color:'var(--ink-soft)' },
      { key:'mes', label:'Neste mês', color:'var(--ink-faint)' },
      { key:'depois', label:'Mais tarde', color:'var(--ink-faint)' },
      { key:'sem_prazo', label:'Sem data de retomada', color:'var(--ink-faint)' },
    ];
    return defs.map(g => ({
      key: 'ret_' + g.key, label: g.label, color: g.color,
      tasks: pool.filter(t => periodBucketKeyFor(t.followUpDate) === g.key),
      quickAddDefaults: {}
    }));
  }
  if(G.taskGroupMode === 'periodo'){
    return PERIOD_CONFIG.map(p => ({
      key:p.key, label:p.label, color:p.color,
      tasks: pool.filter(t => periodBucketKeyFor(t.dueDate) === p.key),
      quickAddDefaults: { dueDateKey: p.key }
    }));
  }
  // grupos (espaço)
  const cats = G.activeCategoryFilter ? G.state.categories.filter(c=>c.id===G.activeCategoryFilter) : G.state.categories;
  return cats.map(cat => ({
    key: cat.id, label: cat.name, color: cat.color,
    tasks: pool.filter(t => t.categoryId === cat.id),
    quickAddDefaults: { categoryId: cat.id }
  }));
}

export function computeCompletedGroup(){
  const term = G.searchTerm.trim().toLowerCase();
  let pool = G.state.tasks.filter(t => t.done);
  pool = pool.filter(t => !G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter);
  if(term) pool = pool.filter(t => t.title.toLowerCase().includes(term));
  if(G.activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => G.activeTagFilters.includes(id)));
  if(G.activeCriticalityFilters.length) pool = pool.filter(t => G.activeCriticalityFilters.includes(t.priority||'media'));
  pool.sort((a,b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  return { key:'concluidas', label:'Concluídas', color:'var(--ink-faint)', tasks: pool };
}

export function quickAddDueDateFor(key){
  if(!key) return todayStr();
  const { todayS, tomorrowS, endOfWeekS } = periodBoundaries();
  if(key === 'hoje') return todayS;
  if(key === 'amanha') return tomorrowS;
  if(key === 'semana') return endOfWeekS;
  if(key === 'vencido' || key === 'sem_prazo') return todayS;
  return todayS;
}

/* Dentro de cada grupo: pendentes antes das concluídas, depois por data e,
   no mesmo dia, pela hora (da menor para a maior; sem hora vai por último). */
export function compareTasksInGroup(a, b){
  if(!!a.done !== !!b.done) return a.done ? 1 : -1;
  const da = a.dueDate || '9999', db = b.dueDate || '9999';
  if(da !== db) return da < db ? -1 : 1;
  const ta = a.dueTime || '99:99', tb = b.dueTime || '99:99';
  if(ta !== tb) return ta < tb ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}
export function downloadAttachment(att){
  const a = document.createElement('a');
  a.href = att.dataUrl;
  a.download = att.name || 'anexo';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
export function renderTasks(){
  const view = document.getElementById('tasksView');
  view.innerHTML = '';

  const GROUP_MODE_OPTIONS = [
    { key:'periodo', label:'Prazo', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
    { key:'retomada', label:'Retomada', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2a4 4 0 01-4 4H3"/></svg>' },
    { key:'status', label:'Status', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/></svg>' },
    { key:'prioridade', label:'Prioridade', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V4M4 4h13l-2.5 4L17 12H4"/></svg>' },
    { key:'tags', label:'Tags', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l5.6-5.59a2 2 0 000-2.82z"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>' },
    { key:'grupos', label:'Espaço', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>' }
  ];
  const currentGroupOpt = GROUP_MODE_OPTIONS.find(o => o.key === G.taskGroupMode) || GROUP_MODE_OPTIONS[0];

  const groupBar = document.createElement('div');
  groupBar.className = 'group-mode-bar';
  groupBar.innerHTML = `
    <span class="group-mode-label">Agrupar por:</span>
    <div class="group-mode-select-wrap">
      <button type="button" class="tp-status-trigger group-mode-trigger" id="groupModeTrigger">
        <span class="tp-status-icon">${currentGroupOpt.icon}</span>
        <span class="tp-status-trigger-label">${currentGroupOpt.label}</span>
        <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="tp-status-dropdown" id="groupModeDropdown" style="display:none;">
        ${GROUP_MODE_OPTIONS.map(o => `
          <div class="tp-status-option ${G.taskGroupMode===o.key?'active':''}" data-mode="${o.key}">
            <span class="tp-status-icon">${o.icon}</span>
            <span>${o.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <span class="group-mode-label">Filtros:</span>
    <div class="tag-filter-control">
      <button type="button" class="tag-filter-btn" id="critFilterBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V4M4 4h13l-2.5 4L17 12H4"/></svg>
        <span id="critFilterLabel">Prioridade</span>
      </button>
      <div class="tag-filter-popover" id="critFilterPopover" style="display:${G.criticalityFilterPopoverOpen?'block':'none'};">
        ${PRIORITY_CONFIG.map(p => `
          <label class="tag-filter-row">
            <input type="checkbox" data-crit="${p.key}" ${G.activeCriticalityFilters.includes(p.key)?'checked':''}>
            <span class="cat-swatch" style="background:${p.color}"></span>
            ${p.label}
          </label>
        `).join('')}
        <button type="button" class="filter-clear-btn" id="critFilterClearBtn" ${G.activeCriticalityFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    <div class="tag-filter-control">
      <button type="button" class="tag-filter-btn" id="tagFilterBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l5.6-5.59a2 2 0 000-2.82z"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>
        <span id="tagFilterLabel">Tags</span>
      </button>
      <div class="tag-filter-popover" id="tagFilterPopover" style="display:${G.tagFilterPopoverOpen?'block':'none'};">
        ${(() => {
          const usedTagIds = new Set();
          G.state.tasks
            .filter(t => !t.done && (!G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter))
            .forEach(t => (t.tagIds||[]).forEach(id => usedTagIds.add(id)));
          const usableTags = G.state.tags.filter(tg => usedTagIds.has(tg.id));
          if(usableTags.length === 0) return '<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhuma tag em uso nas tarefas</div>';
          return usableTags.map(tg => `
            <label class="tag-filter-row">
              <input type="checkbox" data-tag="${tg.id}" ${G.activeTagFilters.includes(tg.id)?'checked':''}>
              <span class="cat-swatch" style="background:${tg.color}"></span>
              ${escapeHtml(tg.name)}
            </label>
          `).join('');
        })()}
        <button type="button" class="filter-clear-btn" id="tagFilterClearBtn" ${G.activeTagFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    ${(G.activeTagFilters.length || G.activeCriticalityFilters.length) ? `
    <button type="button" class="filter-clear-all-btn" id="clearAllFiltersBtn" title="Limpar todos os filtros">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      Limpar filtros
    </button>
    ` : ''}
    ${(G.state.projects || []).length ? `
    <select class="tp-select" id="taskProjectFilter" style="width:auto; padding:6px 28px 6px 10px; font-size:12.5px;" title="Filtrar por projeto">
      <option value="all" ${G.taskProjectFilter==='all'?'selected':''}>Todas as tarefas</option>
      <option value="personal" ${G.taskProjectFilter==='personal'?'selected':''}>Só pessoais</option>
      <option value="project" ${G.taskProjectFilter==='project'?'selected':''}>Só de projetos</option>
      ${G.state.projects.map(p => `<option value="${p.id}" ${G.taskProjectFilter===p.id?'selected':''}>${escapeHtml(p.name || 'Projeto')}</option>`).join('')}
    </select>` : ''}
    <button type="button" class="tag-filter-btn" id="useTemplateBtn" title="Criar tarefa a partir de um template">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      <span>Template</span>
    </button>
    <label class="completed-toggle">
      <span>Mostrar concluídas</span>
      <input type="checkbox" id="showCompletedToggle" ${G.state.showCompletedTasks?'checked':''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>
  `;
  const groupModeTrigger = groupBar.querySelector('#groupModeTrigger');
  const groupModeDropdown = groupBar.querySelector('#groupModeDropdown');
  function closeOtherTaskFilterPopovers(exceptEl){
    if(groupModeDropdown !== exceptEl) groupModeDropdown.style.display = 'none';
    if(critFilterPopoverEl !== exceptEl) { G.criticalityFilterPopoverOpen = false; critFilterPopoverEl.style.display = 'none'; }
    if(tagFilterPopoverEl !== exceptEl) { G.tagFilterPopoverOpen = false; tagFilterPopoverEl.style.display = 'none'; }
  }
  groupModeTrigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = groupModeDropdown.style.display === 'block';
    closeOtherTaskFilterPopovers(groupModeDropdown);
    groupModeDropdown.style.display = isOpen ? 'none' : 'block';
  };
  groupModeDropdown.addEventListener('click', e => e.stopPropagation());
  groupModeDropdown.querySelectorAll('.tp-status-option').forEach(opt => {
    opt.onclick = () => {
      G.taskGroupMode = opt.dataset.mode;
      // o agrupamento fica guardado por espaço (e para "Todos"), e volta igual ao recarregar
      G.state.categoryGroupModes[groupModeKey()] = G.taskGroupMode;
      markDirty();
    };
  });

  const critFilterBtn = groupBar.querySelector('#critFilterBtn');
  const critFilterPopoverEl = groupBar.querySelector('#critFilterPopover');
  critFilterBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = !G.criticalityFilterPopoverOpen;
    closeOtherTaskFilterPopovers(critFilterPopoverEl);
    G.criticalityFilterPopoverOpen = willOpen;
    critFilterPopoverEl.style.display = G.criticalityFilterPopoverOpen ? 'block' : 'none';
  };
  critFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  critFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const key = e.target.dataset.crit;
      if(e.target.checked){ if(!G.activeCriticalityFilters.includes(key)) G.activeCriticalityFilters.push(key); }
      else { G.activeCriticalityFilters = G.activeCriticalityFilters.filter(k => k !== key); }
      render();
    });
  });
  const critFilterClearBtn = groupBar.querySelector('#critFilterClearBtn');
  if(critFilterClearBtn){
    critFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      G.activeCriticalityFilters = [];
      render();
    });
  }

  const tagFilterBtn = groupBar.querySelector('#tagFilterBtn');
  const tagFilterPopoverEl = groupBar.querySelector('#tagFilterPopover');
  tagFilterBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = !G.tagFilterPopoverOpen;
    closeOtherTaskFilterPopovers(tagFilterPopoverEl);
    G.tagFilterPopoverOpen = willOpen;
    tagFilterPopoverEl.style.display = G.tagFilterPopoverOpen ? 'block' : 'none';
  };
  tagFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  tagFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const tagId = e.target.dataset.tag;
      if(e.target.checked){ if(!G.activeTagFilters.includes(tagId)) G.activeTagFilters.push(tagId); }
      else { G.activeTagFilters = G.activeTagFilters.filter(id => id !== tagId); }
      render();
    });
  });
  const tagFilterClearBtn = groupBar.querySelector('#tagFilterClearBtn');
  if(tagFilterClearBtn){
    tagFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      G.activeTagFilters = [];
      render();
    });
  }
  const clearAllFiltersBtn = groupBar.querySelector('#clearAllFiltersBtn');
  if(clearAllFiltersBtn){
    clearAllFiltersBtn.addEventListener('click', () => {
      G.activeTagFilters = [];
      G.activeCriticalityFilters = [];
      G.tagFilterPopoverOpen = false;
      G.criticalityFilterPopoverOpen = false;
      render();
    });
  }

  const projFilterEl = groupBar.querySelector('#taskProjectFilter');
  if(projFilterEl) projFilterEl.addEventListener('change', e => { G.taskProjectFilter = e.target.value; render(); });
  groupBar.querySelector('#useTemplateBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    openTemplatePickMenu(e.currentTarget);
  });
  groupBar.querySelector('#showCompletedToggle').addEventListener('change', e => {
    G.state.showCompletedTasks = e.target.checked;
    markDirty();
  });

  view.appendChild(groupBar);

  const layout = document.createElement('div');
  layout.className = 'tasks-layout';
  const listCol = document.createElement('div');
  listCol.className = 'tasks-list-col';
  layout.appendChild(listCol);
  view.appendChild(layout);

  const groups = computeTaskGroups();
  let anyTask = false;

  function buildBucket(group, isCompletedGroup){
    group.tasks.sort(compareTasksInGroup);
    if(group.tasks.length === 0) return;
    anyTask = anyTask || group.tasks.length > 0;

    const collapsed = !!G.state.uiGroupCollapse[group.key];
    const bucket = document.createElement('div');
    bucket.className = 'bucket' + (collapsed ? ' collapsed' : '');
    bucket.innerHTML = `
      <div class="bucket-header">
        <span class="bucket-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
        ${(!isCompletedGroup && (G.taskGroupMode === 'grupos' || G.taskGroupMode === 'prioridade')) ? `<span class="cat-swatch" style="background:${group.color}"></span>` : ''}
        <span class="bucket-title">${escapeHtml(group.label)}</span>
        <span class="bucket-count">${group.tasks.length}</span>
      </div>
      <div class="bucket-body">
        <div class="task-list"></div>
      </div>
    `;
    bucket.querySelector('.bucket-header').addEventListener('click', () => {
      G.state.uiGroupCollapse[group.key] = !G.state.uiGroupCollapse[group.key];
      markDirty();
    });
    const taskListEl = bucket.querySelector('.task-list');
    group.tasks.forEach(t => taskListEl.appendChild(renderTaskRow(t)));

    listCol.appendChild(bucket);
  }

  groups.forEach(group => buildBucket(group, false));

  if(G.state.showCompletedTasks){
    buildBucket(computeCompletedGroup(), true);
  }

  if(!anyTask && G.state.tasks.length === 0){
    listCol.insertAdjacentHTML('beforeend', `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <p>Nenhuma tarefa ainda. Clique em "+ Nova tarefa" ou use o campo "+ Adicionar tarefa" em qualquer espaço.</p>
    </div>`);
  }

  if(G.activeTaskId || G.creatingNewTask){
    listCol.classList.add('with-panel');
    const panel = document.createElement('div');
    panel.className = 'task-panel';
    layout.appendChild(panel);
    renderTaskPanel(panel);
  }
}

export function renderTaskRow(t){
  const row = document.createElement('div');
  const priClass = t.priority ? ` pri-${t.priority}` : '';
  const overdue = isOverdue(t.dueDate, t.done);
  row.className = 'task-row' + priClass + (t.done ? ' done' : '') + (t.id === G.activeTaskId ? ' selected' : '') + (overdue ? ' overdue' : '');
  row.dataset.id = t.id;
  const isToday = t.dueDate === todayStr();
  const tags = (t.tagIds||[]).map(id => G.state.tags.find(tg=>tg.id===id)).filter(Boolean);
  const commentCount = (t.comments||[]).length;
  const subtasks = t.subtasks || [];
  const subDone = subtasks.filter(s=>s.done).length;

  let statusPill = '';
  if(overdue) statusPill = `<span class="task-status-pill overdue">Vencida</span>`;
  else if(isToday && !t.done) statusPill = `<span class="task-status-pill today">Hoje</span>`;

  row.innerHTML = `
    <div class="task-check task-check-circle ${t.done?'done':''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div class="task-row-left">
      ${t.projectId ? (() => { const pr = projectById(t.projectId); if(!pr) return ''; const st = pr.stages.find(x => x.id === t.stageId); return `<span class="task-proj-pill" title="Tarefa de projeto">${escapeHtml(pr.name)}${st ? ' > ' + escapeHtml(st.name) : ''}</span>`; })() : ''}
      <span class="task-title">${escapeHtml(t.title || 'Sem título')}</span>
      <span class="task-status-label">${(STATUS_CONFIG.find(s=>s.key===(t.status||'nao_iniciado'))||STATUS_CONFIG[0]).label}</span>
      ${t.dueDate ? `<span class="task-cal-badge ${overdue?'overdue':''}" style="margin-left:10px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${fmtDate(t.dueDate)}${t.dueTime ? ' '+t.dueTime : ''}</span>` : ''}
      ${(() => { const fs_ = G.taskGroupMode === 'retomada' ? null : followUpState(t); return fs_ ? `<span class="task-follow-pill ${fs_}" title="Data para voltar a olhar esta tarefa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/></svg>${escapeHtml(followUpLabel(t))}</span>` : ''; })()}
      ${subtasks.length ? `<span class="task-subtask-badge">${subDone}/${subtasks.length}</span>` : ''}
      ${tags.length ? `<span class="task-tag-pill" style="background:${tags[0].color}22; color:${tags[0].color};"><span class="dot" style="background:${tags[0].color}"></span>${escapeHtml(tags[0].name)}</span>` : ''}
      ${tags.length > 1 ? `<span class="task-tag-more" title="${tags.slice(1).map(t=>t.name).join(', ')}">+${tags.length-1}</span>` : ''}
    </div>
    <div class="task-row-right">
      ${commentCount ? `<span class="task-comment-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>${commentCount}</span>` : ''}
      ${(t.recurrence && t.recurrence !== 'none') ? `<span class="task-recurrence-icon" title="Recorrente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2a4 4 0 01-4 4H3"/></svg></span>` : ''}
      ${statusPill}
      <div class="task-menu-wrap">
        <button class="task-menu-btn"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="12" cy="19" r="2.1"/></svg></button>
      </div>
    </div>
  `;
  row.querySelector('.task-check').onclick = (e) => {
    e.stopPropagation();
    const wasDone = t.done;
    t.done = !t.done;
    t.status = t.done ? 'concluida' : 'nao_iniciado';
    t.completedAt = t.done ? Date.now() : null;
    if(!wasDone && t.done && t.recurrence && t.recurrence !== 'none'){
      const next = spawnNextRecurrence(t);
      if(next){
        G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
        markDirty();
        openTaskPanel(next.id);
        return;
      }
    }
    markDirty();
  };

  const menuWrap = row.querySelector('.task-menu-wrap');
  const menuBtn = row.querySelector('.task-menu-btn');
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = menuWrap.classList.contains('open');
    closeAllTaskMenus();
    if(!wasOpen) openTaskRowMenu(t, menuBtn, menuWrap);
  };

  row.addEventListener('click', () => openTaskPanel(t.id));
  return row;
}

