import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { icon } from './icones.js';
import { dateToStr, escapeHtml, fmtDate, fold, isOverdue, togglePinned, completeRecurring, todayStr } from './10-helpers.js';
import { closeAllTaskMenus, openTaskRowMenu } from './13-portais-de-tarefa.js';
import { openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { renderTaskPanel } from './17-painel-lateral-render.js';
import { projectById } from './31-projetos.js';
import { followUpLabel, followUpState } from './35-templates-de-tarefa.js';
import { groupModeKey, render } from './48-render-principal.js';
import { FILTROS } from './estado-ui.js';
import { buildDaySummary } from './55-resumo-do-dia.js';

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
  return icon('star', isPinned ? 'fill' : 'regular');
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

/* Tarefas favoritas (estrela) saem dos grupos e vão para um grupo "Favoritos" sempre no topo, em qualquer agrupamento. */
export function computeTaskGroups(){
  const pinned = [];
  const groups = computeTaskGroupsUnpinned(pinned);
  return pinned.length ? [{ key:'fixadas', label:'Favoritos', color:'var(--accent)', tasks: pinned, quickAddDefaults: {} }, ...groups] : groups;
}
function computeTaskGroupsUnpinned(pinnedOut){
  let pool = G.state.tasks.filter(t => !G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter);
  if(FILTROS.activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => FILTROS.activeTagFilters.includes(id)));
  if(FILTROS.activeCriticalityFilters.length) pool = pool.filter(t => FILTROS.activeCriticalityFilters.includes(t.priority||'media'));
  if(FILTROS.activeProjectFilters.length) pool = pool.filter(t => FILTROS.activeProjectFilters.includes(t.projectId || 'personal'));
  pool = pool.filter(t => !t.done);
  pinnedOut.push(...pool.filter(t => t.pinned));
  pool = pool.filter(t => !t.pinned);

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
  let pool = G.state.tasks.filter(t => t.done);
  pool = pool.filter(t => !G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter);
  if(FILTROS.activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => FILTROS.activeTagFilters.includes(id)));
  if(FILTROS.activeCriticalityFilters.length) pool = pool.filter(t => FILTROS.activeCriticalityFilters.includes(t.priority||'media'));
  if(FILTROS.activeProjectFilters.length) pool = pool.filter(t => FILTROS.activeProjectFilters.includes(t.projectId || 'personal'));
  pool.sort((a,b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  return { key:'concluidas', label:'Concluídas', color:'var(--ink-faint)', tasks: pool };
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
    { key:'periodo', label:'Prazo', icon:icon('calendar-blank') },
    { key:'retomada', label:'Retomada', icon:icon('repeat') },
    { key:'status', label:'Status', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/></svg>' },
    { key:'prioridade', label:'Prioridade', icon:icon('flag') },
    { key:'tags', label:'Tags', icon:icon('tag') },
    { key:'grupos', label:'Espaço', icon:icon('folder') }
  ];
  /* os filtros só oferecem o que existe no espaço escolhido (e o que sobrou de outro espaço é descartado) */
  const spaceTasks_ = G.state.tasks.filter(t => !t.done && (!G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter));
  const spaceProjects_ = (G.state.projects || []).filter(p => !G.activeCategoryFilter || p.categoryId === G.activeCategoryFilter);
  const spacePriorities_ = PRIORITY_CONFIG.filter(p => spaceTasks_.some(t => (t.priority || 'media') === p.key));
  const spaceTagIds_ = new Set(); spaceTasks_.forEach(t => (t.tagIds || []).forEach(id => spaceTagIds_.add(id)));
  const prunedP_ = FILTROS.activeProjectFilters.filter(id => id === 'personal' || spaceProjects_.some(p => p.id === id));
  const prunedC_ = FILTROS.activeCriticalityFilters.filter(k => spacePriorities_.some(p => p.key === k));
  const prunedT_ = FILTROS.activeTagFilters.filter(id => spaceTagIds_.has(id));
  if(prunedP_.length !== FILTROS.activeProjectFilters.length || prunedC_.length !== FILTROS.activeCriticalityFilters.length || prunedT_.length !== FILTROS.activeTagFilters.length){
    FILTROS.activeProjectFilters = prunedP_; FILTROS.activeCriticalityFilters = prunedC_; FILTROS.activeTagFilters = prunedT_;
    render(); return;
  }
  const currentGroupOpt = GROUP_MODE_OPTIONS.find(o => o.key === G.taskGroupMode) || GROUP_MODE_OPTIONS[0];

  const groupBar = document.createElement('div');
  groupBar.className = 'group-mode-bar';
  groupBar.innerHTML = `
    <span class="group-mode-label">Agrupar por:</span>
    <div class="group-mode-select-wrap">
      <button type="button" class="tp-status-trigger group-mode-trigger" id="groupModeTrigger">
        <span class="tp-status-icon">${currentGroupOpt.icon}</span>
        <span class="tp-status-trigger-label">${currentGroupOpt.label}</span>
        ${icon('caret-down', 'regular', ' class="tp-status-chevron"')}
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
      <button type="button" class="tag-filter-btn${FILTROS.activeCriticalityFilters.length ? ' on' : ''}" id="critFilterBtn">
        ${icon('flag')}
        <span id="critFilterLabel">Prioridade</span>
      </button>
      <div class="tag-filter-popover" id="critFilterPopover" style="display:${FILTROS.criticalityFilterPopoverOpen?'block':'none'};">
        ${spacePriorities_.length ? spacePriorities_.map(p => `
          <label class="tag-filter-row">
            <input type="checkbox" data-crit="${p.key}" ${FILTROS.activeCriticalityFilters.includes(p.key)?'checked':''}>
            <span class="cat-swatch" style="background:${p.color}"></span>
            ${p.label}
          </label>
        `).join('') : '<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhuma tarefa neste espaço</div>'}
        <button type="button" class="filter-clear-btn" id="critFilterClearBtn" ${FILTROS.activeCriticalityFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    <div class="tag-filter-control">
      <button type="button" class="tag-filter-btn${FILTROS.activeTagFilters.length ? ' on' : ''}" id="tagFilterBtn">
        ${icon('tag')}
        <span id="tagFilterLabel">Tags</span>
      </button>
      <div class="tag-filter-popover" id="tagFilterPopover" style="display:${FILTROS.tagFilterPopoverOpen?'block':'none'};">
        ${(() => {
          const usedTagIds = new Set();
          G.state.tasks
            .filter(t => !t.done && (!G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter))
            .forEach(t => (t.tagIds||[]).forEach(id => usedTagIds.add(id)));
          const usableTags = G.state.tags.filter(tg => usedTagIds.has(tg.id));
          if(usableTags.length === 0) return '<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhuma tag em uso nas tarefas</div>';
          return usableTags.map(tg => `
            <label class="tag-filter-row">
              <input type="checkbox" data-tag="${tg.id}" ${FILTROS.activeTagFilters.includes(tg.id)?'checked':''}>
              <span class="cat-swatch" style="background:${tg.color}"></span>
              ${escapeHtml(tg.name)}
            </label>
          `).join('');
        })()}
        <button type="button" class="filter-clear-btn" id="tagFilterClearBtn" ${FILTROS.activeTagFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    ${(FILTROS.activeTagFilters.length || FILTROS.activeCriticalityFilters.length || FILTROS.activeProjectFilters.length) ? `
    <button type="button" class="filter-clear-all-btn" id="clearAllFiltersBtn" title="Limpar todos os filtros">
      ${icon('x')}
      Limpar filtros
    </button>
    ` : ''}
    ${spaceProjects_.length ? `
    <div class="tag-filter-control">
      <button type="button" class="tag-filter-btn${FILTROS.activeProjectFilters.length ? ' on' : ''}" id="projFilterBtn">
        ${icon('kanban')}
        <span id="projFilterLabel">Projetos${FILTROS.activeProjectFilters.length ? ' · ' + FILTROS.activeProjectFilters.length : ''}</span>
      </button>
      <div class="tag-filter-popover" id="projFilterPopover" style="display:${FILTROS.projectFilterPopoverOpen?'block':'none'};">
        <label class="tag-filter-row">
          <input type="checkbox" data-proj="personal" ${FILTROS.activeProjectFilters.includes('personal')?'checked':''}>
          Sem projeto
        </label>
        ${spaceProjects_.map(p => `
          <label class="tag-filter-row">
            <input type="checkbox" data-proj="${p.id}" ${FILTROS.activeProjectFilters.includes(p.id)?'checked':''}>
            ${escapeHtml(p.name || 'Projeto')}
          </label>
        `).join('')}
        <button type="button" class="filter-clear-btn" id="projFilterClearBtn" ${FILTROS.activeProjectFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>` : ''}
    <span class="group-bar-div first"></span>
    <span class="group-bar-div"></span>
    <label class="completed-toggle">
      <span><span class="ct-long">Mostrar concluídas</span><span class="ct-short">Concluídas</span></span>
      <input type="checkbox" id="showCompletedToggle" ${G.state.showCompletedTasks?'checked':''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>
  `;
  const groupModeTrigger = groupBar.querySelector('#groupModeTrigger');
  const projFilterBtn = groupBar.querySelector('#projFilterBtn');
  const projFilterPopoverEl = groupBar.querySelector('#projFilterPopover');
  const groupModeDropdown = groupBar.querySelector('#groupModeDropdown');
  function closeOtherTaskFilterPopovers(exceptEl){
    if(groupModeDropdown !== exceptEl) groupModeDropdown.style.display = 'none';
    if(critFilterPopoverEl !== exceptEl) { FILTROS.criticalityFilterPopoverOpen = false; critFilterPopoverEl.style.display = 'none'; }
    if(tagFilterPopoverEl !== exceptEl) { FILTROS.tagFilterPopoverOpen = false; tagFilterPopoverEl.style.display = 'none'; }
    if(projFilterPopoverEl && projFilterPopoverEl !== exceptEl) { FILTROS.projectFilterPopoverOpen = false; projFilterPopoverEl.style.display = 'none'; }
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
    const willOpen = !FILTROS.criticalityFilterPopoverOpen;
    closeOtherTaskFilterPopovers(critFilterPopoverEl);
    FILTROS.criticalityFilterPopoverOpen = willOpen;
    critFilterPopoverEl.style.display = FILTROS.criticalityFilterPopoverOpen ? 'block' : 'none';
  };
  critFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  critFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const key = e.target.dataset.crit;
      if(e.target.checked){ if(!FILTROS.activeCriticalityFilters.includes(key)) FILTROS.activeCriticalityFilters.push(key); }
      else { FILTROS.activeCriticalityFilters = FILTROS.activeCriticalityFilters.filter(k => k !== key); }
      render();
    });
  });
  const critFilterClearBtn = groupBar.querySelector('#critFilterClearBtn');
  if(critFilterClearBtn){
    critFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      FILTROS.activeCriticalityFilters = [];
      render();
    });
  }

  const tagFilterBtn = groupBar.querySelector('#tagFilterBtn');
  const tagFilterPopoverEl = groupBar.querySelector('#tagFilterPopover');
  tagFilterBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = !FILTROS.tagFilterPopoverOpen;
    closeOtherTaskFilterPopovers(tagFilterPopoverEl);
    FILTROS.tagFilterPopoverOpen = willOpen;
    tagFilterPopoverEl.style.display = FILTROS.tagFilterPopoverOpen ? 'block' : 'none';
  };
  tagFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  tagFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const tagId = e.target.dataset.tag;
      if(e.target.checked){ if(!FILTROS.activeTagFilters.includes(tagId)) FILTROS.activeTagFilters.push(tagId); }
      else { FILTROS.activeTagFilters = FILTROS.activeTagFilters.filter(id => id !== tagId); }
      render();
    });
  });
  const tagFilterClearBtn = groupBar.querySelector('#tagFilterClearBtn');
  if(tagFilterClearBtn){
    tagFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      FILTROS.activeTagFilters = [];
      render();
    });
  }
  const clearAllFiltersBtn = groupBar.querySelector('#clearAllFiltersBtn');
  if(clearAllFiltersBtn){
    clearAllFiltersBtn.addEventListener('click', () => {
      FILTROS.activeTagFilters = [];
      FILTROS.activeCriticalityFilters = [];
      FILTROS.activeProjectFilters = [];
      FILTROS.projectFilterPopoverOpen = false;
      FILTROS.tagFilterPopoverOpen = false;
      FILTROS.criticalityFilterPopoverOpen = false;
      render();
    });
  }

  if(projFilterBtn){
    projFilterBtn.onclick = (e) => {
      e.stopPropagation();
      const willOpen = !FILTROS.projectFilterPopoverOpen;
      closeOtherTaskFilterPopovers(projFilterPopoverEl);
      FILTROS.projectFilterPopoverOpen = willOpen;
      projFilterPopoverEl.style.display = willOpen ? 'block' : 'none';
    };
    projFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
    projFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = e.target.dataset.proj;
        if(e.target.checked){ if(!FILTROS.activeProjectFilters.includes(id)) FILTROS.activeProjectFilters.push(id); }
        else { FILTROS.activeProjectFilters = FILTROS.activeProjectFilters.filter(x => x !== id); }
        render();
      });
    });
    const projClear = groupBar.querySelector('#projFilterClearBtn');
    if(projClear) projClear.addEventListener('click', e => { e.stopPropagation(); FILTROS.activeProjectFilters = []; render(); });
  }
  groupBar.querySelector('#showCompletedToggle').addEventListener('change', e => {
    G.state.showCompletedTasks = e.target.checked;
    markDirty();
  });

  /* o topo da tela vive na barra de cima: filtros, "+ Tarefa" e a troca Lista/Kanban (Kanban ainda desativado) */
  const topFilters = document.getElementById('topbarFilters');
  topFilters.querySelectorAll('.group-mode-bar, .view-mode-toggle').forEach(el => el.remove());
  const modeToggle = document.createElement('div');
  modeToggle.className = 'view-mode-toggle';
  modeToggle.innerHTML = `
    <button type="button" class="on" aria-pressed="true" title="Lista">${icon('list')}</button>
    <button type="button" disabled aria-disabled="true" title="Kanban (em breve)">${icon('kanban')}</button>`;
  topFilters.prepend(groupBar);
  topFilters.appendChild(modeToggle);

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
    bucket.className = 'bucket' + (collapsed ? ' collapsed' : '') + (group.key === 'fixadas' ? ' pinned-bucket' : '');
    bucket.innerHTML = `
      <div class="bucket-header">
        <span class="bucket-chevron">${icon('caret-down')}</span>
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
      ${icon('check-square')}
      <p>Nenhuma tarefa ainda. Clique em "+ Nova tarefa" ou use o campo "+ Adicionar tarefa" em qualquer espaço.</p>
    </div>`);
  }

  if(G.activeTaskId || G.creatingNewTask){
    listCol.classList.add('with-panel');
    const panel = document.createElement('div');
    panel.className = 'task-panel';
    layout.appendChild(panel);
    renderTaskPanel(panel);
  } else if(window.matchMedia('(min-width:1100px)').matches){
    layout.appendChild(buildDaySummary()); // coluna da direita sem tarefa aberta
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

  const fuSt = followUpState(t);
  let alertsHtml = '';
  if(fuSt === 'vencida') alertsHtml += `<span class="task-alert task-alert-ret over" title="Retomada vencida (${fmtDate(t.followUpDate)})">${icon('bell')}Vencida</span>`;
  if(overdue) alertsHtml += `<span class="task-alert task-status-pill overdue" title="Prazo vencido">${icon('clock')}Vencida</span>`;

  const cat_ = (G.state.categories || []).find(c => c.id === t.categoryId);
  const stLabel_ = (STATUS_CONFIG.find(s=>s.key===(t.status||'nao_iniciado'))||STATUS_CONFIG[0]).label;
  row.innerHTML = `
    <div class="task-check task-check-circle ${t.done?'done':''}">
      ${icon('check')}
    </div>
    <div class="task-row-left">
      <div class="task-title-line"><span class="task-title">${escapeHtml(t.title || 'Sem título')}</span><span class="task-status-label">${stLabel_}</span></div>
      <div class="task-meta">
      ${t.dueDate ? `<span class="task-cal-badge ${overdue?'overdue':''}">${icon('calendar-blank')}${fmtDate(t.dueDate)}${t.dueTime ? ' '+t.dueTime : ''}</span>` : `<span class="task-cal-badge nodate">${icon('calendar-blank')}Sem data</span>`}
      ${(() => { const fs_ = G.taskGroupMode === 'retomada' ? null : followUpState(t); return fs_ === 'futura' ? `<span class="task-follow-pill ${fs_}" title="Data para voltar a olhar esta tarefa">${icon('arrow-bend-up-right')}${escapeHtml(followUpLabel(t))}</span>` : ''; })()}
      ${subtasks.length ? (() => { const pc = Math.round(100 * subDone / subtasks.length); return `<span class="task-subtask-badge task-prog" title="${subDone} de ${subtasks.length} subtarefas concluídas (${pc}%)"><span class="task-prog-ring" style="--p:${pc}"></span><b>${subDone}/${subtasks.length}</b></span>`; })() : ''}
      ${tags.length ? `<span class="task-tag-pill" style="--tg:${escapeHtml(tags[0].color)}">${escapeHtml(tags[0].name)}</span>` : ''}
      ${tags.length > 1 ? `<span class="task-tag-more" title="${tags.slice(1).map(t=>t.name).join(', ')}">+${tags.length-1}</span>` : ''}
      ${commentCount ? `<span class="task-comment-badge" title="${commentCount} ${commentCount === 1 ? 'comentário' : 'comentários'}">${icon('chat-circle')}${commentCount}</span>` : ''}
      ${(t.recurrence && t.recurrence !== 'none') ? `<span class="task-recurrence-icon" title="Recorrente">${icon('repeat')}</span>` : ''}
      ${t.projectId ? (() => { const pr = projectById(t.projectId); if(!pr) return ''; const st = pr.stages.find(x => x.id === t.stageId); return `<span class="task-proj-pill" title="Tarefa de projeto">${escapeHtml(pr.name)}${st ? ' > ' + escapeHtml(st.name) : ''}</span>`; })() : ''}
      ${overdue ? `<span class="task-alert-m over">${icon('clock')}Vencida</span>` : ''}
      </div>
    </div>
    <div class="task-row-right">
      <div class="task-alerts">${alertsHtml}</div>
      ${t.done ? '' : `<button type="button" class="task-pin-btn${t.pinned ? ' on' : ''}" title="${t.pinned ? 'Tirar dos favoritos' : 'Favoritar'}" aria-label="${t.pinned ? 'Tirar dos favoritos' : 'Favoritar'}" aria-pressed="${t.pinned ? 'true' : 'false'}">${icon('star', t.pinned ? 'bold' : 'regular')}</button>`}
      <div class="task-menu-wrap">
        <button class="task-menu-btn">${icon('dots-three-vertical')}</button>
      </div>
    </div>
  `;
  row.querySelector('.task-check').onclick = (e) => {
    e.stopPropagation();
    const wasDone = t.done;
    const prevStatus = t.status;
    t.done = !t.done;
    t.status = t.done ? 'concluida' : 'nao_iniciado';
    t.completedAt = t.done ? Date.now() : null;
    if(t.done) t.pinned = false;
    if(!wasDone && t.done && t.recurrence && t.recurrence !== 'none'){
      const next = completeRecurring(t, prevStatus);
      if(next){
        G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
        markDirty();
        openTaskPanel(next.id);
        return;
      }
    }
    markDirty();
  };

  const pinBtn = row.querySelector('.task-pin-btn');
  if(pinBtn) pinBtn.onclick = (e) => { e.stopPropagation(); togglePinned(t); markDirty(); };

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

