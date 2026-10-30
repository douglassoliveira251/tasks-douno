/* ===================== RENDER: TASKS ===================== */
const PRIORITY_CONFIG = [
  { key:'baixa', label:'Baixa', color:'var(--priority-baixa)' },
  { key:'media', label:'Média', color:'var(--priority-media)' },
  { key:'alta', label:'Alta', color:'var(--priority-alta)' },
  { key:'critica', label:'Crítica', color:'var(--priority-critica)' }
];

const STATUS_CONFIG = [
  { key:'nao_iniciado', label:'Não iniciado' },
  { key:'em_andamento', label:'Em andamento' },
  { key:'concluida', label:'Concluída' }
];
function pinIconSvg(isPinned){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 17v5"/>
    <path fill="${isPinned ? 'currentColor' : 'none'}" d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24Z"/>
  </svg>`;
}

function statusCircleSvg(statusKey){
  if(statusKey === 'concluida') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.3" fill="currentColor"/></svg>';
  if(statusKey === 'em_andamento') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--ink-faint)" stroke-width="2.5"/><path d="M12 3a9 9 0 000 18z" fill="var(--ok-dark)"/></svg>';
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
}

let taskGroupMode = 'retomada'; // 'periodo' | 'grupos' | 'prioridade'

function periodBoundaries(){
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

function periodBucketKeyFor(dueDate){
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

const PERIOD_CONFIG = [
  { key:'vencido', label:'Vencida', color:'var(--danger)' },
  { key:'hoje', label:'Vence hoje', color:'var(--priority-alta)' },
  { key:'amanha', label:'Amanhã', color:'var(--ink-soft)' },
  { key:'semana', label:'Nessa semana', color:'var(--ink-soft)' },
  { key:'proxima_semana', label:'Próxima semana', color:'var(--ink-soft)' },
  { key:'mes', label:'Neste mês', color:'var(--ink-faint)' },
  { key:'depois', label:'Mais tarde', color:'var(--ink-faint)' },
  { key:'sem_prazo', label:'Sem prazo', color:'var(--ink-faint)' }
];

function computeTaskGroups(){
  const term = searchTerm.trim().toLowerCase();
  let pool = state.tasks.filter(t => !activeCategoryFilter || t.categoryId === activeCategoryFilter);
  if(term) pool = pool.filter(t => t.title.toLowerCase().includes(term));
  if(activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => activeTagFilters.includes(id)));
  if(activeCriticalityFilters.length) pool = pool.filter(t => activeCriticalityFilters.includes(t.priority||'media'));
  if(taskProjectFilter === 'personal') pool = pool.filter(t => !t.projectId);
  else if(taskProjectFilter === 'project') pool = pool.filter(t => !!t.projectId);
  else if(taskProjectFilter !== 'all') pool = pool.filter(t => t.projectId === taskProjectFilter);
  pool = pool.filter(t => !t.done);

  if(taskGroupMode === 'prioridade'){
    const order = [...PRIORITY_CONFIG].reverse().concat([{key:null,label:'Sem prioridade',color:'var(--ink-faint)'}]);
    return order.map(p => ({
      key: p.key || 'sem_prioridade', label: p.label, color: p.color,
      tasks: pool.filter(t => (t.priority||null) === p.key),
      quickAddDefaults: { priority: p.key }
    }));
  }
  if(taskGroupMode === 'status'){
    return STATUS_CONFIG.map(s => ({
      key: s.key, label: s.label, color: 'var(--ink-faint)',
      tasks: pool.filter(t => (t.status||'nao_iniciado') === s.key),
      quickAddDefaults: { status: s.key }
    }));
  }
  if(taskGroupMode === 'tags'){
    const groups = state.tags.map(tg => ({
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
  if(taskGroupMode === 'retomada'){
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
  if(taskGroupMode === 'periodo'){
    return PERIOD_CONFIG.map(p => ({
      key:p.key, label:p.label, color:p.color,
      tasks: pool.filter(t => periodBucketKeyFor(t.dueDate) === p.key),
      quickAddDefaults: { dueDateKey: p.key }
    }));
  }
  // grupos (espaço)
  const cats = activeCategoryFilter ? state.categories.filter(c=>c.id===activeCategoryFilter) : state.categories;
  return cats.map(cat => ({
    key: cat.id, label: cat.name, color: cat.color,
    tasks: pool.filter(t => t.categoryId === cat.id),
    quickAddDefaults: { categoryId: cat.id }
  }));
}

function computeCompletedGroup(){
  const term = searchTerm.trim().toLowerCase();
  let pool = state.tasks.filter(t => t.done);
  pool = pool.filter(t => !activeCategoryFilter || t.categoryId === activeCategoryFilter);
  if(term) pool = pool.filter(t => t.title.toLowerCase().includes(term));
  if(activeTagFilters.length) pool = pool.filter(t => (t.tagIds||[]).some(id => activeTagFilters.includes(id)));
  if(activeCriticalityFilters.length) pool = pool.filter(t => activeCriticalityFilters.includes(t.priority||'media'));
  pool.sort((a,b) => (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  return { key:'concluidas', label:'Concluídas', color:'var(--ink-faint)', tasks: pool };
}

function quickAddDueDateFor(key){
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
function compareTasksInGroup(a, b){
  if(!!a.done !== !!b.done) return a.done ? 1 : -1;
  const da = a.dueDate || '9999', db = b.dueDate || '9999';
  if(da !== db) return da < db ? -1 : 1;
  const ta = a.dueTime || '99:99', tb = b.dueTime || '99:99';
  if(ta !== tb) return ta < tb ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}
function downloadAttachment(att){
  const a = document.createElement('a');
  a.href = att.dataUrl;
  a.download = att.name || 'anexo';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function renderTasks(){
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
  const currentGroupOpt = GROUP_MODE_OPTIONS.find(o => o.key === taskGroupMode) || GROUP_MODE_OPTIONS[0];

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
          <div class="tp-status-option ${taskGroupMode===o.key?'active':''}" data-mode="${o.key}">
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
      <div class="tag-filter-popover" id="critFilterPopover" style="display:${criticalityFilterPopoverOpen?'block':'none'};">
        ${PRIORITY_CONFIG.map(p => `
          <label class="tag-filter-row">
            <input type="checkbox" data-crit="${p.key}" ${activeCriticalityFilters.includes(p.key)?'checked':''}>
            <span class="cat-swatch" style="background:${p.color}"></span>
            ${p.label}
          </label>
        `).join('')}
        <button type="button" class="filter-clear-btn" id="critFilterClearBtn" ${activeCriticalityFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    <div class="tag-filter-control">
      <button type="button" class="tag-filter-btn" id="tagFilterBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l5.6-5.59a2 2 0 000-2.82z"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>
        <span id="tagFilterLabel">Tags</span>
      </button>
      <div class="tag-filter-popover" id="tagFilterPopover" style="display:${tagFilterPopoverOpen?'block':'none'};">
        ${(() => {
          const usedTagIds = new Set();
          state.tasks
            .filter(t => !t.done && (!activeCategoryFilter || t.categoryId === activeCategoryFilter))
            .forEach(t => (t.tagIds||[]).forEach(id => usedTagIds.add(id)));
          const usableTags = state.tags.filter(tg => usedTagIds.has(tg.id));
          if(usableTags.length === 0) return '<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhuma tag em uso nas tarefas</div>';
          return usableTags.map(tg => `
            <label class="tag-filter-row">
              <input type="checkbox" data-tag="${tg.id}" ${activeTagFilters.includes(tg.id)?'checked':''}>
              <span class="cat-swatch" style="background:${tg.color}"></span>
              ${escapeHtml(tg.name)}
            </label>
          `).join('');
        })()}
        <button type="button" class="filter-clear-btn" id="tagFilterClearBtn" ${activeTagFilters.length?'':'disabled'}>Limpar filtro</button>
      </div>
    </div>
    ${(activeTagFilters.length || activeCriticalityFilters.length) ? `
    <button type="button" class="filter-clear-all-btn" id="clearAllFiltersBtn" title="Limpar todos os filtros">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      Limpar filtros
    </button>
    ` : ''}
    ${(state.projects || []).length ? `
    <select class="tp-select" id="taskProjectFilter" style="width:auto; padding:6px 28px 6px 10px; font-size:12.5px;" title="Filtrar por projeto">
      <option value="all" ${taskProjectFilter==='all'?'selected':''}>Todas as tarefas</option>
      <option value="personal" ${taskProjectFilter==='personal'?'selected':''}>Só pessoais</option>
      <option value="project" ${taskProjectFilter==='project'?'selected':''}>Só de projetos</option>
      ${state.projects.map(p => `<option value="${p.id}" ${taskProjectFilter===p.id?'selected':''}>${escapeHtml(p.name || 'Projeto')}</option>`).join('')}
    </select>` : ''}
    <button type="button" class="tag-filter-btn" id="useTemplateBtn" title="Criar tarefa a partir de um template">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      <span>Template</span>
    </button>
    <label class="completed-toggle">
      <span>Mostrar concluídas</span>
      <input type="checkbox" id="showCompletedToggle" ${state.showCompletedTasks?'checked':''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>
  `;
  const groupModeTrigger = groupBar.querySelector('#groupModeTrigger');
  const groupModeDropdown = groupBar.querySelector('#groupModeDropdown');
  function closeOtherTaskFilterPopovers(exceptEl){
    if(groupModeDropdown !== exceptEl) groupModeDropdown.style.display = 'none';
    if(critFilterPopoverEl !== exceptEl) { criticalityFilterPopoverOpen = false; critFilterPopoverEl.style.display = 'none'; }
    if(tagFilterPopoverEl !== exceptEl) { tagFilterPopoverOpen = false; tagFilterPopoverEl.style.display = 'none'; }
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
      taskGroupMode = opt.dataset.mode;
      // o agrupamento fica guardado por espaço (e para "Todos"), e volta igual ao recarregar
      state.categoryGroupModes[groupModeKey()] = taskGroupMode;
      markDirty();
    };
  });

  const critFilterBtn = groupBar.querySelector('#critFilterBtn');
  const critFilterPopoverEl = groupBar.querySelector('#critFilterPopover');
  critFilterBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = !criticalityFilterPopoverOpen;
    closeOtherTaskFilterPopovers(critFilterPopoverEl);
    criticalityFilterPopoverOpen = willOpen;
    critFilterPopoverEl.style.display = criticalityFilterPopoverOpen ? 'block' : 'none';
  };
  critFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  critFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const key = e.target.dataset.crit;
      if(e.target.checked){ if(!activeCriticalityFilters.includes(key)) activeCriticalityFilters.push(key); }
      else { activeCriticalityFilters = activeCriticalityFilters.filter(k => k !== key); }
      render();
    });
  });
  const critFilterClearBtn = groupBar.querySelector('#critFilterClearBtn');
  if(critFilterClearBtn){
    critFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      activeCriticalityFilters = [];
      render();
    });
  }

  const tagFilterBtn = groupBar.querySelector('#tagFilterBtn');
  const tagFilterPopoverEl = groupBar.querySelector('#tagFilterPopover');
  tagFilterBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = !tagFilterPopoverOpen;
    closeOtherTaskFilterPopovers(tagFilterPopoverEl);
    tagFilterPopoverOpen = willOpen;
    tagFilterPopoverEl.style.display = tagFilterPopoverOpen ? 'block' : 'none';
  };
  tagFilterPopoverEl.addEventListener('click', e => e.stopPropagation());
  tagFilterPopoverEl.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', e => {
      const tagId = e.target.dataset.tag;
      if(e.target.checked){ if(!activeTagFilters.includes(tagId)) activeTagFilters.push(tagId); }
      else { activeTagFilters = activeTagFilters.filter(id => id !== tagId); }
      render();
    });
  });
  const tagFilterClearBtn = groupBar.querySelector('#tagFilterClearBtn');
  if(tagFilterClearBtn){
    tagFilterClearBtn.addEventListener('click', e => {
      e.stopPropagation();
      activeTagFilters = [];
      render();
    });
  }
  const clearAllFiltersBtn = groupBar.querySelector('#clearAllFiltersBtn');
  if(clearAllFiltersBtn){
    clearAllFiltersBtn.addEventListener('click', () => {
      activeTagFilters = [];
      activeCriticalityFilters = [];
      tagFilterPopoverOpen = false;
      criticalityFilterPopoverOpen = false;
      render();
    });
  }

  const projFilterEl = groupBar.querySelector('#taskProjectFilter');
  if(projFilterEl) projFilterEl.addEventListener('change', e => { taskProjectFilter = e.target.value; render(); });
  groupBar.querySelector('#useTemplateBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    openTemplatePickMenu(e.currentTarget);
  });
  groupBar.querySelector('#showCompletedToggle').addEventListener('change', e => {
    state.showCompletedTasks = e.target.checked;
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

    const collapsed = !!state.uiGroupCollapse[group.key];
    const bucket = document.createElement('div');
    bucket.className = 'bucket' + (collapsed ? ' collapsed' : '');
    bucket.innerHTML = `
      <div class="bucket-header">
        <span class="bucket-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>
        ${(!isCompletedGroup && (taskGroupMode === 'grupos' || taskGroupMode === 'prioridade')) ? `<span class="cat-swatch" style="background:${group.color}"></span>` : ''}
        <span class="bucket-title">${escapeHtml(group.label)}</span>
        <span class="bucket-count">${group.tasks.length}</span>
      </div>
      <div class="bucket-body">
        <div class="task-list"></div>
      </div>
    `;
    bucket.querySelector('.bucket-header').addEventListener('click', () => {
      state.uiGroupCollapse[group.key] = !state.uiGroupCollapse[group.key];
      markDirty();
    });
    const taskListEl = bucket.querySelector('.task-list');
    group.tasks.forEach(t => taskListEl.appendChild(renderTaskRow(t)));

    listCol.appendChild(bucket);
  }

  groups.forEach(group => buildBucket(group, false));

  if(state.showCompletedTasks){
    buildBucket(computeCompletedGroup(), true);
  }

  if(!anyTask && state.tasks.length === 0){
    listCol.insertAdjacentHTML('beforeend', `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <p>Nenhuma tarefa ainda. Clique em "+ Nova tarefa" ou use o campo "+ Adicionar tarefa" em qualquer espaço.</p>
    </div>`);
  }

  if(activeTaskId || creatingNewTask){
    listCol.classList.add('with-panel');
    const panel = document.createElement('div');
    panel.className = 'task-panel';
    layout.appendChild(panel);
    renderTaskPanel(panel);
  }
}

function renderTaskRow(t){
  const row = document.createElement('div');
  const priClass = t.priority ? ` pri-${t.priority}` : '';
  const overdue = isOverdue(t.dueDate, t.done);
  row.className = 'task-row' + priClass + (t.done ? ' done' : '') + (t.id === activeTaskId ? ' selected' : '') + (overdue ? ' overdue' : '');
  row.dataset.id = t.id;
  const isToday = t.dueDate === todayStr();
  const tags = (t.tagIds||[]).map(id => state.tags.find(tg=>tg.id===id)).filter(Boolean);
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
      ${(() => { const fs_ = taskGroupMode === 'retomada' ? null : followUpState(t); return fs_ ? `<span class="task-follow-pill ${fs_}" title="Data para voltar a olhar esta tarefa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/></svg>${escapeHtml(followUpLabel(t))}</span>` : ''; })()}
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
        state.tasks = state.tasks.filter(x => x.id !== t.id);
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

/* ---- menu-portal dos 3 pontinhos (fixo, nunca cortado pelos grupos) ---- */
let openMenuWrapEl = null;

function ensureTaskMenuPortal(){
  let portal = document.getElementById('taskMenuPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'taskMenuPortal';
    portal.className = 'task-menu-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function closeAllTaskMenus(){
  if(openMenuWrapEl){ openMenuWrapEl.classList.remove('open'); openMenuWrapEl = null; }
  const portal = document.getElementById('taskMenuPortal');
  if(portal) portal.classList.remove('show');
}

function openTaskRowMenu(task, btnEl, wrapEl){
  const portal = ensureTaskMenuPortal();
  portal.innerHTML = `
    <button type="button" class="task-menu-item" data-action="edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Editar</button>
    <button type="button" class="task-menu-item" data-action="duplicate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>
    <button type="button" class="task-menu-item" data-action="move"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg>Mover de espaço</button>
    <button type="button" class="task-menu-item" data-action="template"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Salvar como template</button>
    <button type="button" class="task-menu-item danger" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir</button>
  `;
  const rect = btnEl.getBoundingClientRect();
  portal.style.top = Math.round(rect.bottom + 6) + 'px';
  portal.style.right = Math.round(window.innerWidth - rect.right) + 'px';
  portal.style.left = 'auto';
  portal.classList.add('show');
  wrapEl.classList.add('open');
  openMenuWrapEl = wrapEl;

  portal.querySelector('[data-action="edit"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    openTaskPanel(task.id);
  };
  portal.querySelector('[data-action="duplicate"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    const copy = JSON.parse(JSON.stringify(task));
    copy.id = uid('task');
    copy.title = task.title + ' (cópia)';
    copy.done = false;
    copy.createdAt = Date.now();
    (copy.subtasks||[]).forEach(s => s.id = uid('sub'));
    (copy.comments||[]).forEach(c => c.id = uid('cmt'));
    state.tasks.push(copy);
    markDirty();
  };
  portal.querySelector('[data-action="template"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    openTemplateEditor(null, templateFromTask(task));
  };
  portal.querySelector('[data-action="move"]').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, task.categoryId, (newCatId) => {
      task.categoryId = newCatId;
      task.tagIds = (task.tagIds||[]).filter(id => {
        const tg = state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === newCatId);
      });
      markDirty();
    });
    closeAllTaskMenus();
  };
  portal.querySelector('[data-action="delete"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    state.tasks = state.tasks.filter(x => x.id !== task.id);
    if(activeTaskId === task.id) activeTaskId = null;
    markDirty();
  };
}

function ensureConfirmPortal(){
  let portal = document.getElementById('confirmActionPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'confirmActionPortal';
    portal.className = 'confirm-action-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
function closeConfirmPortal(e){
  const portal = document.getElementById('confirmActionPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
function openConfirmPortal(anchorBtn, message, onConfirm, confirmLabel){
  const portal = ensureConfirmPortal();
  portal.innerHTML = `
    <div class="confirm-action-msg">${escapeHtml(message)}</div>
    <div class="confirm-action-buttons">
      <button type="button" class="btn ghost small" id="confirmActionCancel">Cancelar</button>
      <button type="button" class="btn small confirm-action-danger" id="confirmActionOk">${escapeHtml(confirmLabel || 'Excluir')}</button>
    </div>
  `;
  portal.classList.add('show');
  const rect = anchorBtn.getBoundingClientRect();
  const h = portal.offsetHeight || 100;
  let top = rect.bottom + 6;
  if(top + h > window.innerHeight) top = Math.max(8, rect.top - h - 6);
  portal.style.top = Math.round(top) + 'px';
  let left = rect.right - 220;
  if(left < 8) left = 8;
  if(left + 220 > window.innerWidth) left = window.innerWidth - 228;
  portal.style.left = Math.round(left) + 'px';
  portal.onclick = e => e.stopPropagation();
  portal.querySelector('#confirmActionCancel').onclick = () => closeConfirmPortal();
  portal.querySelector('#confirmActionOk').onclick = () => { closeConfirmPortal(); onConfirm(); };
}
document.addEventListener('click', closeConfirmPortal);
window.addEventListener('scroll', closeConfirmPortal, true);

function ensureColorPortal(){
  let portal = document.getElementById('colorPickerPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'colorPickerPortal';
    portal.className = 'color-popover-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function closeColorPortal(e){
  const portal = document.getElementById('colorPickerPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}

function renderTaskLinkPicker(portal, opts){
  const { currentTaskId, onSelect } = opts;
  portal.innerHTML = `
    <div class="search-input-wrap">
      <input type="text" class="tag-picker-search" id="taskPickerSearch_${portal.id}" placeholder="Buscar tarefa por nome ou ID..." autocomplete="off">
      <button type="button" class="search-clear-btn" style="display:none;" title="Limpar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="tp-tags-popover-list" id="taskPickerList_${portal.id}"></div>
  `;
  const searchInput = portal.querySelector(`#taskPickerSearch_${portal.id}`);
  const list = portal.querySelector(`#taskPickerList_${portal.id}`);
  const clearBtn = portal.querySelector('.search-clear-btn');
  clearBtn.onclick = (e) => { e.stopPropagation(); searchInput.value=''; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); };

  function renderList(){
    const term = searchInput.value.trim().toLowerCase();
    let tasks = state.tasks.filter(t => !t.done);
    if(term){
      tasks = tasks.filter(t => (t.title||'').toLowerCase().includes(term) || (t.shortId||'').toLowerCase().includes(term));
    }
    tasks = tasks.slice(0, 30);
    let html = '';
    if(currentTaskId){
      html += `<div class="tp-tags-popover-row tag-create-row" data-clear="1"><span class="tp-tags-popover-name">✕ Remover vínculo</span></div>`;
    }
    if(tasks.length === 0){
      html += '<div style="font-size:12px;color:var(--ink-faint); padding:6px 4px;">Nenhuma tarefa encontrada</div>';
    } else {
      html += tasks.map(t => `
        <div class="tp-tags-popover-row" data-task-id="${t.id}">
          <span class="tp-tags-popover-name">${escapeHtml(t.title||'Sem título')}</span>
          ${currentTaskId===t.id ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('');
    }
    list.innerHTML = html;
    const clearRow = list.querySelector('[data-clear]');
    if(clearRow) clearRow.onclick = () => onSelect(null);
    list.querySelectorAll('.tp-tags-popover-row[data-task-id]').forEach(row => {
      row.onclick = () => onSelect(row.dataset.taskId);
    });
  }
  searchInput.addEventListener('input', renderList);
  searchInput.addEventListener('input', () => { const cb = portal.querySelector('.search-clear-btn'); if(cb) cb.style.display = searchInput.value ? 'flex' : 'none'; });
  searchInput.addEventListener('click', e => e.stopPropagation());
  searchInput.addEventListener('keydown', e => e.stopPropagation());
  renderList();
  setTimeout(() => searchInput.focus(), 0);
}

function renderUnifiedTagPicker(portal, opts){
  const { categoryId, isSelected, onToggle, onChanged } = opts;
  portal.innerHTML = `
    <div class="search-input-wrap">
      <input type="text" class="tag-picker-search" id="tagPickerSearch_${portal.id}" placeholder="Buscar ou criar tag..." autocomplete="off">
      <button type="button" class="search-clear-btn" style="display:none;" title="Limpar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="tp-tags-popover-list" id="tagPickerList_${portal.id}"></div>
  `;
  const searchInput = portal.querySelector(`#tagPickerSearch_${portal.id}`);
  const list = portal.querySelector(`#tagPickerList_${portal.id}`);
  const clearBtn = portal.querySelector('.search-clear-btn');
  clearBtn.onclick = (e) => { e.stopPropagation(); searchInput.value=''; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); };

  function renderList(){
    const term = searchInput.value.trim().toLowerCase();
    const visibleTags = state.tags.filter(tg => !tg.categoryId || tg.categoryId === categoryId);
    const matchFilter = tg => !term || tg.name.toLowerCase().includes(term);
    const ofGroup = visibleTags.filter(tg => tg.categoryId === categoryId && matchFilter(tg));
    const general = visibleTags.filter(tg => !tg.categoryId && matchFilter(tg));
    const renderRow = tg => `
      <div class="tp-tags-popover-row" data-tag="${tg.id}">
        <button type="button" class="tag-row-color-dot" data-tag-color="${tg.id}" style="background:${tg.color}" title="Alterar cor"></button>
        <span class="tp-tags-popover-name">${escapeHtml(tg.name)}</span>
        ${isSelected(tg.id) ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
      </div>`;
    const exactMatch = visibleTags.some(tg => tg.name.toLowerCase() === term);
    let html = '';
    if(ofGroup.length) html += `<div class="tp-tags-popover-section">Deste espaço</div>` + ofGroup.map(renderRow).join('');
    if(general.length) html += `<div class="tp-tags-popover-section">Gerais</div>` + general.map(renderRow).join('');
    if(term && !exactMatch){
      html += `<div class="tp-tags-popover-row tag-create-row" data-create="1"><span class="tp-tags-popover-name">+ Criar tag "${escapeHtml(searchInput.value.trim())}"</span></div>`;
    }
    if(!html){
      html = '<div style="font-size:12px;color:var(--ink-faint); padding:6px 4px;">Nenhuma tag encontrada</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.tp-tags-popover-row[data-tag]').forEach(row => {
      row.addEventListener('click', (e) => {
        if(e.target.closest('.tag-row-color-dot')) return;
        onToggle(row.dataset.tag);
        renderList();
        if(onChanged) onChanged();
      });
      const colorDot = row.querySelector('.tag-row-color-dot');
      colorDot.onclick = (e) => {
        e.stopPropagation();
        const tag = state.tags.find(t => t.id === row.dataset.tag);
        if(!tag) return;
        openColorPortal(tag.color, colorDot, (color) => {
          tag.color = color;
          colorDot.style.background = color;
          markDirty();
          if(onChanged) onChanged();
        });
      };
    });
    const createRow = list.querySelector('[data-create]');
    if(createRow){
      createRow.onclick = () => {
        const name = searchInput.value.trim();
        if(!name) return;
        const color = DEFAULT_COLORS[state.tags.length % DEFAULT_COLORS.length];
        const newTag = { id: uid('tag'), name, color, categoryId };
        state.tags.push(newTag);
        onToggle(newTag.id);
        searchInput.value = '';
        renderList();
        if(onChanged) onChanged();
      };
    }
  }
  searchInput.addEventListener('input', renderList);
  searchInput.addEventListener('input', () => { const cb = portal.querySelector('.search-clear-btn'); if(cb) cb.style.display = searchInput.value ? 'flex' : 'none'; });
  searchInput.addEventListener('click', e => e.stopPropagation());
  searchInput.addEventListener('keydown', e => e.stopPropagation());
  renderList();
  setTimeout(() => searchInput.focus(), 0);
}

function ensureRecurrencePortal(){
  let portal = document.getElementById('recurrencePortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'recurrencePortal';
    portal.className = 'tp-tags-popover tags-picker-portal recurrence-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
function closeRecurrencePortal(e){
  const portal = document.getElementById('recurrencePortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
function renderRecurrencePortalContent(portal, task, onChange){
  const enabled = !!(task.recurrence && task.recurrence !== 'none');
  const currentUnit = enabled ? task.recurrence : 'daily';
  const isTask = task.dueDate !== undefined;
  let remindBlock = '';
  if(isTask && enabled){
    const rb = parseInt(task.remindBefore, 10) || 0;
    const chip = (v, l) => `<button type="button" class="rec-chip ${rb === v ? 'on' : ''}" data-rb="${v}">${l}</button>`;
    const custom = ![0, 7, 15, 30].includes(rb);
    remindBlock = `<div class="rec-remind">
      <div class="rec-remind-h"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/></svg><b>Retornar antes</b></div>
      <div class="rec-chips">${chip(0, 'No dia')}${chip(7, '1 semana')}${chip(15, '15 dias')}${chip(30, '1 mês')}<button type="button" class="rec-chip ${custom ? 'on' : ''}" data-rb="custom">Outro…</button></div>
      ${custom ? `<div class="tp-row2" style="margin-top:8px;"><input type="number" class="tp-input" id="recPopRemindDays" min="1" max="365" value="${rb}"><span class="rec-unit">dia(s) antes</span></div>` : ''}
    </div>`;
  }
  portal.innerHTML = `
    <label class="recurrence-toggle-row">
      <span>Repetir</span>
      <input type="checkbox" id="recPopEnabled" ${enabled ? 'checked' : ''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>
    ${enabled ? `
    <div class="recurrence-detail-fields">
      <div class="tp-field">
        <label class="tp-label">A cada</label>
        <div class="tp-row2">
          <input type="number" class="tp-input" id="recPopInterval" min="1" step="1" value="${task.recurrenceInterval||1}">
          <select class="tp-select" id="recPopUnit">
            <option value="daily" ${currentUnit==='daily'?'selected':''}>Dia(s)</option>
            <option value="weekly" ${currentUnit==='weekly'?'selected':''}>Semana(s)</option>
            <option value="monthly" ${currentUnit==='monthly'?'selected':''}>Mês(es)</option>
            <option value="yearly" ${currentUnit==='yearly'?'selected':''}>Ano(s)</option>
          </select>
        </div>
      </div>
      <div class="tp-field">
        <label class="tp-label">A partir de</label>
        <input type="date" class="tp-input" id="recPopBaseDate" value="${task.recurrenceBaseDate || task.dueDate || ''}">
      </div>
      <div class="tp-field">
        <label class="tp-label">Até (opcional)</label>
        <input type="date" class="tp-input" id="recPopEndDate" value="${task.recurrenceEndDate || ''}" placeholder="Não termina">
      </div>
      ${isTask ? remindBlock : ''}
    </div>
    ` : ''}
  `;
  function refreshAfterToggleChange(){
    markDirty();
    onChange();
    const freshAnchor = document.getElementById('tpRecurrenceTrigger');
    if(freshAnchor) portal._anchorBtn = freshAnchor;
    renderRecurrencePortalContent(portal, task, onChange);
    positionTagsPortalNear(portal, portal._anchorBtn);
  }
  const enabledCheckbox = portal.querySelector('#recPopEnabled');
  enabledCheckbox.addEventListener('click', e => e.stopPropagation());
  enabledCheckbox.addEventListener('change', e => {
    if(e.target.checked){
      task.recurrence = (task.recurrence && task.recurrence !== 'none') ? task.recurrence : 'daily';
      if(!task.recurrenceInterval) task.recurrenceInterval = 1;
      if(!task.recurrenceBaseDate) task.recurrenceBaseDate = task.dueDate || task.date || todayStr();
    } else {
      task.recurrence = 'none';
    }
    refreshAfterToggleChange();
  });
  const unitSelect = portal.querySelector('#recPopUnit');
  if(unitSelect){
    unitSelect.addEventListener('click', e => e.stopPropagation());
    unitSelect.addEventListener('change', e => {
      task.recurrence = e.target.value;
      persistOnly();
      onChange();
    });
  }
  const intervalInput = portal.querySelector('#recPopInterval');
  if(intervalInput){
    intervalInput.addEventListener('click', e => e.stopPropagation());
    intervalInput.addEventListener('change', e => {
      task.recurrenceInterval = Math.max(1, parseInt(e.target.value,10)||1);
      persistOnly();
      onChange();
    });
  }
  const baseDateInput = portal.querySelector('#recPopBaseDate');
  if(baseDateInput){
    baseDateInput.addEventListener('click', e => e.stopPropagation());
    baseDateInput.addEventListener('change', e => {
      task.recurrenceBaseDate = e.target.value;
      if(task.date !== undefined && task.dueDate === undefined){
        // agenda: a recorrência parte do início da agenda
        task.date = e.target.value;
        const evDate = document.getElementById('evDate');
        if(evDate) evDate.value = e.target.value;
        const evEnd = document.getElementById('evEndDate');
        if(evEnd) evEnd.value = e.target.value;
      } else {
        task.dueDate = e.target.value;
        const dateField = document.getElementById('tpDate');
        if(dateField) dateField.value = e.target.value;
      }
      persistOnly();
      onChange();
    });
  }
  const rerenderPortal = () => {
    renderRecurrencePortalContent(portal, task, onChange);
    positionTagsPortalNear(portal, portal._anchorBtn);
  };
  portal.querySelectorAll('.rec-chip[data-rb]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const v = btn.dataset.rb;
      const cur = parseInt(task.remindBefore, 10) || 0;
      task.remindBefore = v === 'custom' ? ([0, 7, 15, 30].includes(cur) ? 3 : cur) : parseInt(v, 10);
      persistOnly();
      onChange();
      rerenderPortal();
    });
  });
  const remindDays = portal.querySelector('#recPopRemindDays');
  if(remindDays){
    remindDays.addEventListener('click', e => e.stopPropagation());
    remindDays.addEventListener('change', e => {
      task.remindBefore = Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 1));
      persistOnly();
      onChange();
      rerenderPortal();
    });
  }
  const endDateInput = portal.querySelector('#recPopEndDate');
  if(endDateInput){
    endDateInput.addEventListener('click', e => e.stopPropagation());
    endDateInput.addEventListener('change', e => {
      task.recurrenceEndDate = e.target.value || null;
      persistOnly();
      onChange();
    });
  }
}
function openRecurrencePortal(anchorBtn, task, onChange){
  const portal = ensureRecurrencePortal();
  const wasOpen = portal.classList.contains('show');
  closeRecurrencePortal();
  if(wasOpen) return;
  portal._anchorBtn = anchorBtn;
  renderRecurrencePortalContent(portal, task, onChange);
  portal.classList.add('show');
  positionTagsPortalNear(portal, anchorBtn);
  portal.onclick = e => e.stopPropagation();
}
document.addEventListener('click', closeRecurrencePortal);
window.addEventListener('scroll', closeRecurrencePortal, true);

function ensureMoveGroupPortal(){
  let portal = document.getElementById('moveGroupPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'moveGroupPortal';
    portal.className = 'tp-tags-popover tags-picker-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
function closeMoveGroupPortal(e){
  const portal = document.getElementById('moveGroupPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
function openMoveGroupPortal(anchorBtn, currentCatId, onSelect){
  const portal = ensureMoveGroupPortal();
  const wasOpen = portal.classList.contains('show') && portal.dataset.forBtn === anchorBtn.dataset.moveGroupId;
  closeMoveGroupPortal();
  if(wasOpen) return;
  if(!anchorBtn.dataset.moveGroupId) anchorBtn.dataset.moveGroupId = uid('mvgrp');
  portal.dataset.forBtn = anchorBtn.dataset.moveGroupId;
  portal.innerHTML = `
    <div class="tp-tags-popover-list">
      ${getOrderedCategories().map(c => `
        <div class="tp-tags-popover-row" data-cat="${c.id}">
          <span class="cat-swatch" style="background:${c.color}"></span>
          <span class="tp-tags-popover-name">${escapeHtml(c.name)}</span>
          ${c.id===currentCatId ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('')}
    </div>
  `;
  portal.classList.add('show');
  positionTagsPortalNear(portal, anchorBtn);
  portal.onclick = e => e.stopPropagation();
  portal.querySelectorAll('.tp-tags-popover-row').forEach(row => {
    row.onclick = () => {
      onSelect(row.dataset.cat);
      closeMoveGroupPortal();
    };
  });
}
document.addEventListener('click', closeMoveGroupPortal);
window.addEventListener('scroll', closeMoveGroupPortal, true);

function openNotebookMovePortal(anchorBtn, categoryId, currentNotebookId, onSelect){
  const portal = ensureMoveGroupPortal();
  const wasOpen = portal.classList.contains('show') && portal.dataset.forBtn === anchorBtn.dataset.moveGroupId;
  closeMoveGroupPortal();
  if(wasOpen) return;
  if(!anchorBtn.dataset.moveGroupId) anchorBtn.dataset.moveGroupId = uid('mvnb');
  portal.dataset.forBtn = anchorBtn.dataset.moveGroupId;
  const spaceNbs = state.notebooks
    .filter(nb => nb.categoryId === categoryId)
    .sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  portal.innerHTML = `
    <div class="tp-tags-popover-list">
      ${spaceNbs.length ? spaceNbs.map(nb => `
        <div class="tp-tags-popover-row" data-nb="${nb.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--ink-faint); flex-shrink:0;"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span class="tp-tags-popover-name">${escapeHtml(nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome')}</span>
          ${nb.id===currentNotebookId ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('') : `<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhum outro caderno neste espaço</div>`}
    </div>
  `;
  portal.classList.add('show');
  positionTagsPortalNear(portal, anchorBtn);
  portal.onclick = e => e.stopPropagation();
  portal.querySelectorAll('.tp-tags-popover-row').forEach(row => {
    row.onclick = () => {
      onSelect(row.dataset.nb);
      closeMoveGroupPortal();
    };
  });
}

function ensureTagsPortal(){
  let portal = document.getElementById('tagsPickerPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'tagsPickerPortal';
    portal.className = 'tp-tags-popover tags-picker-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function closeTagsPortal(e){
  const portal = document.getElementById('tagsPickerPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}

function positionTagsPortalNear(portal, anchorBtn){
  const rect = anchorBtn.getBoundingClientRect();
  const estHeight = portal.offsetHeight || 240;
  let top = rect.bottom + 6;
  if(top + estHeight > window.innerHeight) top = Math.max(8, rect.top - estHeight - 6);
  portal.style.top = Math.round(top) + 'px';
  let left = rect.left;
  if(left + 220 > window.innerWidth) left = window.innerWidth - 228;
  portal.style.left = Math.round(Math.max(8,left)) + 'px';
}

function openColorPortal(currentColor, btnEl, onSelect){
  const portal = ensureColorPortal();
  const wasOpenForThisBtn = portal.classList.contains('show') && portal.dataset.forBtn === btnEl.dataset.portalId;
  closeColorPortal();
  if(wasOpenForThisBtn) return;
  if(!btnEl.dataset.portalId) btnEl.dataset.portalId = uid('cswatch');
  portal.dataset.forBtn = btnEl.dataset.portalId;
  portal.innerHTML = DEFAULT_COLORS.map(c => `<span class="note-color-dot ${c===currentColor?'selected':''}" data-color="${c}" style="background:${c}"></span>`).join('');
  const rect = btnEl.getBoundingClientRect();
  portal.classList.add('show');
  const portalHeight = portal.offsetHeight || 90;
  let top = rect.bottom + 6;
  if(top + portalHeight > window.innerHeight) top = rect.top - portalHeight - 6;
  portal.style.top = Math.round(top) + 'px';
  let left = rect.left;
  if(left + 160 > window.innerWidth) left = window.innerWidth - 168;
  portal.style.left = Math.round(left) + 'px';
  portal.querySelectorAll('.note-color-dot').forEach(dot => {
    dot.onclick = (e) => {
      e.stopPropagation();
      onSelect(dot.dataset.color);
      closeColorPortal();
    };
  });
  portal.onclick = e => e.stopPropagation();
}

document.addEventListener('click', closeColorPortal);
document.addEventListener('click', closeTagsPortal);
window.addEventListener('scroll', closeTagsPortal, true);
document.addEventListener('click', () => {
  const dd = document.getElementById('tpStatusDropdown');
  if(dd) dd.style.display = 'none';
  const gd = document.getElementById('groupModeDropdown');
  if(gd) gd.style.display = 'none';
});
document.addEventListener('click', () => {
  if(tagFilterPopoverOpen){ tagFilterPopoverOpen = false; render(); }
});
document.addEventListener('click', () => {
  if(criticalityFilterPopoverOpen){ criticalityFilterPopoverOpen = false; render(); }
});
window.addEventListener('scroll', closeColorPortal, true);
document.addEventListener('click', closeAllTaskMenus);
window.addEventListener('scroll', closeAllTaskMenus, true);
window.addEventListener('resize', closeAllTaskMenus);


