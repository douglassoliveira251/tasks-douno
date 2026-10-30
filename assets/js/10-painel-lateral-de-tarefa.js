/* ===================== PAINEL LATERAL DE TAREFA ===================== */
function openTaskPanel(taskId){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  activeTaskId = taskId;
  creatingNewTask = false;
  tagsPopoverOpen = false;
  render();
}

function openNewTaskPanel(){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  activeTaskId = null;
  creatingNewTask = true;
  tagsPopoverOpen = false;
  render();
}

/* Comentário em digitação é guardado por tarefa ('__new__' = tarefa ainda não
   criada). Antes, qualquer alteração de campo redesenhava o painel e o texto do
   comentário sumia; agora ele é restaurado a cada redesenho. */
const COMMENT_DRAFTS_KEY = 'dounoCommentDrafts';
let tpCommentDrafts = {};
try{ tpCommentDrafts = JSON.parse(sessionStorage.getItem(COMMENT_DRAFTS_KEY) || '{}') || {}; }catch(e){ tpCommentDrafts = {}; }
function saveCommentDrafts(){
  try{ sessionStorage.setItem(COMMENT_DRAFTS_KEY, JSON.stringify(tpCommentDrafts)); }catch(e){}
}
function currentCommentKey(){ return creatingNewTask ? '__new__' : activeTaskId; }
function showUnsentCommentDialog(){
  let ov = document.getElementById('unsentCommentOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'unsentCommentOverlay';
    ov.style.zIndex = '120';
    ov.innerHTML = `<div class="modal" style="width:420px; max-width:calc(100vw - 24px);">
      <h3 style="margin-bottom:8px;">Comentário não enviado</h3>
      <p style="font-size:13.5px; color:var(--ink-soft); line-height:1.5; margin-bottom:14px;">Você escreveu um comentário e ainda não enviou. O que deseja fazer?</p>
      <div class="modal-footer" style="flex-wrap:wrap;">
        <button type="button" class="btn ghost small" id="unsentBack">Voltar</button>
        <button type="button" class="btn ghost small" id="unsentDiscard" style="color:var(--danger); border-color:var(--danger-light);">Descartar</button>
        <button type="button" class="btn small" id="unsentSend">Enviar e fechar</button>
      </div></div>`;
    document.body.appendChild(ov);
  }
  const key = currentCommentKey();
  const hide = () => ov.classList.remove('show');
  ov.querySelector('#unsentBack').onclick = hide;
  ov.querySelector('#unsentDiscard').onclick = () => { delete tpCommentDrafts[key]; saveCommentDrafts(); hide(); closeTaskPanel(true); };
  ov.querySelector('#unsentSend').onclick = () => {
    const text = (tpCommentDrafts[key] || '').trim();
    hide();
    if(text){
      const t = getOrCreateActiveTask();
      if(t){
        t.comments = t.comments || [];
        t.comments.push({ id: uid('cmt'), text, createdAt: Date.now() });
      }
    }
    delete tpCommentDrafts[key];
    saveCommentDrafts();
    closeTaskPanel(true);
  };
  ov.classList.add('show');
  setTimeout(() => ov.querySelector('#unsentBack').focus(), 0);
}
function closeTaskPanel(force){
  if(force !== true){
    const draft = (tpCommentDrafts[currentCommentKey()] || '').trim();
    if(draft){ showUnsentCommentDialog(); return; }
  }
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  activeTaskId = null;
  creatingNewTask = false;
  tagsPopoverOpen = false;
  render();
}

let taskPanelMouseDownOutside = false;
document.addEventListener('mousedown', (e) => {
  if(currentView !== 'tasks' && currentView !== 'projects') return;
  if(!(activeTaskId || creatingNewTask)) return;
  const panel = document.querySelector('.task-panel');
  taskPanelMouseDownOutside = !panel || !panel.contains(e.target);
}, true);

document.addEventListener('click', (e) => {
  if(currentView !== 'tasks' && currentView !== 'projects') return;
  if(!(activeTaskId || creatingNewTask)) return;
  if(!taskPanelMouseDownOutside) return;
  const panel = document.querySelector('.task-panel');
  if(!panel || panel.contains(e.target)) return;
  if(e.target.closest && (
    e.target.closest('.task-row') ||
    e.target.closest('.gantt-task') || e.target.closest('.gantt-add') || e.target.closest('.proj-side-task') ||
    e.target.closest('.icon-add-btn') ||
    e.target.closest('.task-menu-portal') ||
    e.target.closest('.confirm-action-portal') ||
    e.target.closest('.color-popover-portal') ||
    e.target.closest('.tags-picker-portal')
  )) return;
  closeTaskPanel();
}, true);

document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  if((currentView === 'tasks' || currentView === 'projects') && (activeTaskId || creatingNewTask)){
    closeTaskPanel();
    return;
  }
  if(currentView === 'notes' && (activeNoteId || creatingNewNote)){
    closeNoteComposer();
    return;
  }
  if(document.getElementById('eventComposerOverlay').classList.contains('show')){
    closeEventComposer();
    return;
  }
  if(document.getElementById('whatsNewOverlay').classList.contains('show')){
    closeWhatsNew();
    return;
  }
  if(document.getElementById('aboutOverlay').classList.contains('show')){
    closeAboutModal();
    return;
  }
  if(document.getElementById('helpPanel').classList.contains('show')){
    closeHelpPanel();
    return;
  }
  if(document.querySelector('.sidebar').classList.contains('mobile-open')){
    closeMobileSidebar();
    return;
  }
  if(document.getElementById('searchResultsDropdown').style.display !== 'none'){
    closeSearchResultsDropdown();
  }
});

document.addEventListener('click', (e) => {
  if(!tagsPopoverOpen) return;
  const popover = document.getElementById('tpTagsPopover');
  const toggleBtn = document.getElementById('tpTagsToggleBtn');
  if(popover && toggleBtn && !popover.contains(e.target) && !toggleBtn.contains(e.target)){
    tagsPopoverOpen = false;
    render();
  }
});


function getOrCreateActiveTask(){
  if(creatingNewTask){
    const defaultCat = (activeCategoryFilter && catById(activeCategoryFilter)) ? activeCategoryFilter : state.categories[0].id;
    state.taskIdCounter = (state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(state.taskIdCounter).padStart(4, '0'),
      title:'', categoryId: defaultCat, done:false, status:'nao_iniciado',
      dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority:'media', description:'',
      tagIds:[], recurrence:'none', subtasks:[], comments:[], attachments:[], createdAt: Date.now()
    };
    state.tasks.push(t);
    if(tpCommentDrafts['__new__'] !== undefined){ tpCommentDrafts[t.id] = tpCommentDrafts['__new__']; delete tpCommentDrafts['__new__']; saveCommentDrafts(); }
    activeTaskId = t.id;
    creatingNewTask = false;
    return t;
  }
  return state.tasks.find(x => x.id === activeTaskId);
}

const RECURRENCE_LABELS = { none:'Não repete', daily:'Diariamente', weekly:'Semanalmente', monthly:'Mensalmente', yearly:'Anualmente' };
const RECURRENCE_UNIT_SINGULAR = { daily:'dia', weekly:'semana', monthly:'mês', yearly:'ano' };
const RECURRENCE_UNIT_PLURAL = { daily:'dias', weekly:'semanas', monthly:'meses', yearly:'anos' };

function recurrenceSummaryLabel(task){
  if(!task.recurrence || task.recurrence === 'none') return 'Não repete';
  const n = task.recurrenceInterval || 1;
  if(n === 1) return RECURRENCE_LABELS[task.recurrence];
  return `A cada ${n} ${RECURRENCE_UNIT_PLURAL[task.recurrence]}`;
}

function renderTaskPanel(panel){
  closeAllTaskMenus();
  const task = creatingNewTask
    ? { title:'', categoryId:(activeCategoryFilter && catById(activeCategoryFilter)) ? activeCategoryFilter : state.categories[0].id, dueDate:null, dueTime:'', priority:'media', description:'', tagIds:[], recurrence:'none', subtasks:[], comments:[] }
    : state.tasks.find(x => x.id === activeTaskId);

  if(!task){ closeTaskPanel(true); return; }

  const catOptions = state.categories.map(c => `<option value="${c.id}" ${c.id===task.categoryId?'selected':''}>${escapeHtml(c.name)}</option>`).join('');

  const overdue = isOverdue(task.dueDate, task.done);
  const isToday = task.dueDate === todayStr();
  let topBarClass = 'normal';
  if(overdue) topBarClass = 'overdue';
  else if(isToday && !task.done) topBarClass = 'today';

  panel.innerHTML = `
    <div class="tp-top-flag ${topBarClass}"></div>

    <div class="tp-field">
      <div class="tp-name-row">
        <div class="task-check task-check-circle ${task.done?'done':''}" id="tpDoneCheck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
        <input type="text" class="tp-name-input ${task.done?'done':''}" id="tpName" placeholder="Nome da tarefa" value="${escapeHtml(task.title||'')}" ${creatingNewTask ? '' : 'readonly'}>
        <button type="button" class="tp-header-icon-btn tp-mobile-close" id="tpMobileClose" title="Fechar" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        <button type="button" class="tp-header-icon-btn" id="tpMenuBtn" title="Mais opções" aria-label="Mais opções" aria-haspopup="menu"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>
      </div>
      ${!creatingNewTask ? `<div class="tp-created-at">Criada em ${fmtUpdatedAt(task.createdAt)}</div>` : ''}
      ${task.done ? `<div class="tp-done-banner" id="tpDoneBanner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>Tarefa concluída</div>` : ''}
    </div>

    <div class="tp-field tp-space-line" style="position:relative;">
      <label class="tp-label">Espaço</label>
      <div class="cat-tags-combined-row">
        <div class="group-move-row">
          <button type="button" class="group-current-chip tp-space-chip" id="tpGroupChip" title="Clique para mudar de espaço"></button>
          ${task.projectId && projectById(task.projectId) ? `<span class="tp-proj-chip" id="tpProjChip" title="Clique para trocar o projeto ou a etapa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M3 12h14M3 19h8"/></svg><span class="tp-proj-chip-t">${escapeHtml(projectById(task.projectId).name)}${(projectById(task.projectId).stages.find(x => x.id === task.stageId) || {}).name ? ' · ' + escapeHtml(projectById(task.projectId).stages.find(x => x.id === task.stageId).name) : ''}</span><button type="button" id="tpProjChipX" title="Desvincular do projeto" aria-label="Desvincular do projeto">×</button></span>` : ''}
        </div>
        <div class="tp-tags-selected" id="tpTagsSelected">
          ${(task.tagIds||[]).map(id => state.tags.find(tg=>tg.id===id)).filter(Boolean).map(tg => `<span class="tp-tag-chip active" data-tag-id="${tg.id}" title="Clique para remover" style="background:${tg.color}">${escapeHtml(tg.name)}</span>`).join('')}
          <button type="button" class="tp-tags-add-btn" id="tpTagsToggleBtn">+ Tag</button>
        </div>
      </div>
    </div>

    <div class="tp-dates">
      <div class="tp-box tp-follow tp-follow-box">
        <label class="tp-label">Retomar em</label>
        <button type="button" class="tp-follow-trigger" id="tpFollowTrigger" title="Data para voltar a olhar esta tarefa (não é o prazo)">
          <span class="tp-follow-trigger-label">${task.followUpDate ? '↻ ' + fmtDate(task.followUpDate) + ' <em>' + followRelative(task.followUpDate) + '</em>' : '↻ Definir data'}</span>
          <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <input type="date" class="tp-follow-date-hidden" id="tpFollowDate" value="${task.followUpDate||''}" tabindex="-1" aria-hidden="true">
        <div class="tp-follow-menu" id="tpFollowMenu" ${tpFollowOpen ? '' : 'hidden'}>
          ${FOLLOW_PRESETS.map(([n, lb]) => { const d = addDaysStr(todayStr(), n); return `<button type="button" class="tp-follow-opt" data-days="${n}"><span>${lb}</span><small>${followWeekday(d)}</small></button>`; }).join('')}
          <div class="tp-follow-sep"></div>
          <button type="button" class="tp-follow-opt" id="tpFollowCustom"><span>Personalizada…</span></button>
          ${task.followUpDate ? `<div class="tp-follow-sep"></div><button type="button" class="tp-follow-opt danger" data-clear="1"><span>Remover retomada</span></button>` : ''}
        </div>
      </div>
      <div class="tp-box tp-due-box">
        <label class="tp-label tp-label-row"><span>Prazo (entrega)</span>
          <button type="button" class="tp-start-link" id="tpStartLink" title="Início da tarefa (opcional)">${task.startDate ? 'início ' + fmtDate(task.startDate) : '+ início'}</button></label>
        ${(() => { const es = effectiveStart(task); return `<div class="tp-start-pop" id="tpStartPop" ${tpStartOpen ? '' : 'hidden'}>
          <div class="tp-start-k">Início da tarefa</div>
          <div class="tp-start-box"><input type="date" id="tpStartDate" value="${es.date}"><span>${es.source === 'own' ? 'definida por você' : (es.source === 'stage' ? 'herdada da etapa' : 'data de criação')}</span></div>
          <div class="tp-start-chips"><button type="button" data-start="${todayStr()}">Hoje</button><button type="button" data-start="${addDaysStr(todayStr(), 1)}">Amanhã</button><button type="button" data-start="${nextMondayStr()}">Segunda</button></div>
          <div class="tp-start-foot">${task.startDate ? '<button type="button" id="tpStartReset">Remover início</button>' : '<span></span>'}<span>${task.dueDate ? 'Prazo ' + fmtDate(task.dueDate) : 'Sem prazo'}</span></div>
        </div>`; })()}
        <div class="tp-row2">
          <input type="date" class="tp-input tp-date-input" id="tpDate" value="${task.dueDate||''}" ${(() => { const r = stageRange(task); return r ? (r.start ? 'min="' + r.start + '" ' : '') + (r.end ? 'max="' + r.end + '"' : '') : ''; })()}>
          <input type="time" class="tp-input tp-time-input" id="tpTime" value="${task.dueTime||''}">
        </div>
      </div>
    </div>

    <div class="tp-dates">
      <div>
        <label class="tp-label">Status</label>
          <div class="tp-status-select-wrap">
            <button type="button" class="tp-status-trigger" id="tpStatusTrigger">
              <span class="tp-status-icon status-${task.status||'nao_iniciado'}">${statusCircleSvg(task.status||'nao_iniciado')}</span>
              <span class="tp-status-trigger-label">${(STATUS_CONFIG.find(s=>s.key===(task.status||'nao_iniciado'))||STATUS_CONFIG[0]).label}</span>
              <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="tp-status-dropdown" id="tpStatusDropdown" style="display:none;">
              ${STATUS_CONFIG.map(s => `
                <div class="tp-status-option ${task.status===s.key?'active':''}" data-s="${s.key}">
                  <span class="tp-status-icon status-${s.key}">${statusCircleSvg(s.key)}</span>
                  <span>${s.label}</span>
                </div>
              `).join('')}
            </div>
          </div>
      </div>
      <div>
        <label class="tp-label">Recorrência</label>
        <button type="button" class="tp-status-trigger" id="tpRecurrenceTrigger">
          <svg class="tp-recurrence-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2a4 4 0 01-4 4H3"/></svg>
          <span class="tp-status-trigger-label" id="tpRecurrenceTriggerLabel">${recurrenceSummaryLabel(task)}</span>
          <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
    </div>

    <div class="tp-field">
      <label class="tp-label">Prioridade</label>
      <div class="tp-priority-group" id="tpPriorityGroup">
        ${PRIORITY_CONFIG.map(p => `<button type="button" class="tp-priority-btn ${task.priority===p.key?'active':''}" data-p="${p.key}">${p.label}</button>`).join('')}
      </div>
    </div>

    <div class="tp-field">
      <label class="tp-label">Descrição</label>
      <textarea class="tp-textarea" id="tpDesc" rows="4" placeholder="Detalhes da tarefa...">${escapeHtml(task.description||'')}</textarea>
    </div>

    <div class="tp-field">
      <div class="tp-subtask-header-row">
        <label class="tp-label" style="margin-bottom:0;">Subtarefas (${(task.subtasks||[]).filter(s=>s.done).length}/${(task.subtasks||[]).length})</label>
        ${task.subtasks && task.subtasks.length ? `<span class="tp-subtask-progress-pct">${Math.round((task.subtasks.filter(s=>s.done).length/task.subtasks.length)*100)}%</span>` : ''}
      </div>
      ${task.subtasks && task.subtasks.length ? `
        <div class="tp-subtask-progress-bar">
          <div class="tp-subtask-progress-fill" style="width:${Math.round((task.subtasks.filter(s=>s.done).length/task.subtasks.length)*100)}%;"></div>
        </div>
      ` : ''}
      <div id="tpSubtaskList"></div>
      <div class="tp-add-inline">
        <input type="text" id="tpNewSubtask" placeholder="+ Adicionar subtarefa">
      </div>
    </div>

    <div class="tp-field tp-agenda-notes-row">
      <div class="tp-agenda-notes-col" id="tpAgendaField">
        <label class="tp-label">Agenda</label>
        <div id="tpAgendaList"></div>
        <button type="button" class="btn ghost small" id="tpAddAgendaBtn">+ Criar agenda</button>
      </div>
      <div class="tp-agenda-notes-col" id="tpNotesField">
        <label class="tp-label">Notas</label>
        <div id="tpNotesList"></div>
        <button type="button" class="btn ghost small" id="tpAddNoteBtn">+ Criar nota</button>
      </div>
    </div>

    <div class="tp-field">
      <div style="display:flex; align-items:center; gap:6px;">
        <label class="tp-label" style="margin-bottom:0;">Anexos</label>
        <button type="button" class="note-attach-btn" id="tpAttachBtn" title="Anexar arquivo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.19 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
        <input type="file" id="tpAttachInput" multiple style="display:none;">
      </div>
      <div class="tp-attach-list" id="tpAttachList"></div>
    </div>

    <div class="tp-field">
      <label class="tp-label">Comentários</label>
      <div class="tp-add-inline" style="flex-direction:column; align-items:stretch; border-top:none; padding-top:0; margin-top:0;">
        <textarea class="tp-textarea" id="tpNewComment" placeholder="Escrever um comentário..." style="min-height:44px; margin-bottom:6px;"></textarea>
        <button type="button" class="btn small" id="tpAddCommentBtn" style="align-self:flex-end;">Comentar</button>
      </div>
      <div id="tpCommentList" style="margin-top:12px;"></div>
    </div>
  `;

  function duplicateThisTask(){
    const copy = JSON.parse(JSON.stringify(task));
    copy.id = uid('task');
    state.taskIdCounter = (state.taskIdCounter || 0) + 1;
    copy.shortId = String(state.taskIdCounter).padStart(4, '0');
    copy.title = task.title + ' (cópia)';
    copy.done = false;
    copy.status = 'nao_iniciado';
    copy.createdAt = Date.now();
    (copy.subtasks||[]).forEach(s => s.id = uid('sub'));
    (copy.comments||[]).forEach(c => c.id = uid('cmt'));
    state.tasks.push(copy);
    markDirty();
    openTaskPanel(copy.id);
  }

  /* Menu "⋮" do painel: Template (usar, salvar, gerenciar) + ações da tarefa. */
  const ICO_PROJ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M3 12h14M3 19h8"/><circle cx="17" cy="5" r="2"/><circle cx="15" cy="19" r="2"/></svg>';
  const ICO_TPL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
  const tpMenuBtn = document.getElementById('tpMenuBtn');
  const tpMobileCloseBtn = document.getElementById('tpMobileClose');
  if(tpMobileCloseBtn) tpMobileCloseBtn.onclick = () => closeTaskPanel();
  let menuAnchor = tpMenuBtn; // o menu abre no botão ⋮ ou, ao trocar projeto/etapa, no chip do projeto
  function placeMenu(portal, btn){
    const r = btn.getBoundingClientRect();
    portal.style.top = Math.round(r.bottom + 6) + 'px';
    portal.style.right = Math.round(window.innerWidth - r.right) + 'px';
    portal.style.left = 'auto';
  }
  function showMainMenu(){
    const portal = ensureTaskMenuPortal();
    const editing = !creatingNewTask;
    portal.innerHTML = `
      <div class="tpl-menu-head">Template</div>
      <button type="button" class="task-menu-item" data-m="use">${ICO_TPL}Usar template…</button>
      ${editing ? '<button type="button" class="task-menu-item" data-m="save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Salvar como template</button>' : ''}
      <button type="button" class="task-menu-item" data-m="manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>Gerenciar templates…</button>
      <div class="tpl-menu-sep"></div>
      <div class="tpl-menu-head">Projeto</div>
      <button type="button" class="task-menu-item" data-m="proj">${ICO_PROJ}${task.projectId ? 'Mudar de projeto/etapa…' : 'Vincular a um projeto…'}</button>
      ${task.projectId ? '<button type="button" class="task-menu-item" data-m="unproj">Desvincular do projeto</button>' : ''}

      ${editing ? `
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item" data-m="dup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>
      <button type="button" class="task-menu-item" data-m="move"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg>Mover de espaço</button>
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item danger" data-m="del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir tarefa</button>` : ''}`;
    placeMenu(portal, tpMenuBtn);
    portal.classList.add('show');
    const on = (k, fn) => { const el = portal.querySelector('[data-m="' + k + '"]'); if(el) el.onclick = (ev) => { ev.stopPropagation(); fn(ev); }; };
    on('use', showTemplateList);
    on('proj', showProjectList);
    on('unproj', () => { closeAllTaskMenus(); const t = getOrCreateActiveTask(); if(t){ t.projectId = null; t.stageId = null; markDirty(); } });
    on('save', () => { closeAllTaskMenus(); openTemplateEditor(null, templateFromTask(task)); });
    on('manage', () => { closeAllTaskMenus(); settingsTab = 'templates'; currentView = 'settings'; render(); });
    on('dup', () => { closeAllTaskMenus(); duplicateThisTask(); });
    on('move', () => {
      closeAllTaskMenus();
      document.getElementById('tpGroupChip').click();
    });
    on('del', () => {
      closeAllTaskMenus();
      openConfirmPortal(tpMenuBtn, 'Excluir esta tarefa?', () => {
        state.tasks = state.tasks.filter(x => x.id !== task.id);
        activeTaskId = null;
        markDirty();
      });
    });
  }
  function linkTaskTo(projectId, stageId){
    closeAllTaskMenus();
    const t = getOrCreateActiveTask(); if(!t) return;
    t.projectId = projectId; t.stageId = stageId || null;
    const pr = projectById(projectId);
    if(pr && pr.categoryId && catById(pr.categoryId)) t.categoryId = pr.categoryId;
    clampToStage(t);
    markDirty();
  }
  function showProjectList(){
    const portal = ensureTaskMenuPortal();
    const list = (state.projects || []).slice().sort((x, y) => (x.categoryId === task.categoryId ? 0 : 1) - (y.categoryId === task.categoryId ? 0 : 1));
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Voltar</button>
      <div class="tpl-menu-head">Escolha o projeto</div>
      ${list.length ? list.map(p => `<button type="button" class="task-menu-item" data-p="${p.id}">${escapeHtml(p.name || 'Projeto')}<span class="tpl-menu-meta">${(catById(p.categoryId) || {}).name || ''}</span></button>`).join('')
        : '<div class="tpl-menu-empty">Nenhum projeto ainda. Crie na página Projetos.</div>'}`;
    placeMenu(portal, menuAnchor);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); if(menuAnchor !== tpMenuBtn && task.projectId) showStageList(task.projectId); else { menuAnchor = tpMenuBtn; showMainMenu(); } };
    portal.querySelectorAll('[data-p]').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); showStageList(b.dataset.p); }; });
  }
  function showStageList(projectId){
    const portal = ensureTaskMenuPortal();
    const pr = projectById(projectId); if(!pr) return;
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Projetos</button>
      <div class="tpl-menu-head">${escapeHtml(pr.name)} · etapa</div>
      <button type="button" class="task-menu-item" data-s="">Só o projeto (sem etapa)</button>
      ${pr.stages.map(st => { const cur = task.projectId === pr.id && task.stageId === st.id; return `<button type="button" class="task-menu-item${cur ? ' current' : ''}" data-s="${st.id}">${escapeHtml(st.name || 'Etapa')}${cur ? '<span class="tpl-menu-meta">atual</span>' : ''}</button>`; }).join('')}`;
    placeMenu(portal, menuAnchor);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); showProjectList(); };
    portal.querySelectorAll('[data-s]').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); linkTaskTo(projectId, b.dataset.s); }; });
  }
  function showTemplateList(){
    const portal = ensureTaskMenuPortal();
    const spaceId = creatingNewTask ? activeCategoryFilter : (task.categoryId || activeCategoryFilter);
    const list = templatesForSpace(spaceId);
    const sp = catById(spaceId);
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Voltar</button>
      <div class="tpl-menu-head">Templates${sp ? ' · ' + escapeHtml(sp.name) : ''}</div>
      ${list.length ? list.map(tp => `<button type="button" class="task-menu-item" data-tpl="${tp.id}">${escapeHtml(tp.name || 'Sem nome')}<span class="tpl-menu-meta">${(tp.subtasks||[]).length ? (tp.subtasks.length + ' subtarefa' + (tp.subtasks.length > 1 ? 's' : '')) : ((tp.events||[]).length ? tp.events.length + ' agenda' + (tp.events.length > 1 ? 's' : '') : '')}</span></button>`).join('')
        : '<div class="tpl-menu-empty">Nenhum template neste espaço. Crie em Gerenciar templates.</div>'}`;
    placeMenu(portal, tpMenuBtn);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); showMainMenu(); };
    portal.querySelectorAll('[data-tpl]').forEach(b => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        closeAllTaskMenus();
        const tpl = state.taskTemplates.find(x => x.id === b.dataset.tpl);
        if(!tpl) return;
        // numa tarefa nova, cria a tarefa do template; numa existente, abre uma nova a partir dele
        createTaskFromTemplate(tpl);
      };
    });
  }
  const tpProjChipEl = document.getElementById('tpProjChip');
  if(tpProjChipEl){
    tpProjChipEl.onclick = (e) => {
      if(e.target.closest('#tpProjChipX')) return;
      e.stopPropagation();
      closeAllTaskMenus();
      menuAnchor = tpProjChipEl;
      showStageList(task.projectId);
      ensureTaskMenuPortal().classList.add('show');
    };
  }
  tpMenuBtn.onclick = (e) => {
    e.stopPropagation();
    menuAnchor = tpMenuBtn;
    const portal = ensureTaskMenuPortal();
    if(portal.classList.contains('show') && portal.querySelector('[data-m="use"]')){ closeAllTaskMenus(); return; }
    showMainMenu();
  };

  const tpNameEl = document.getElementById('tpName');
  tpNameEl.addEventListener('click', () => {
    if(tpNameEl.hasAttribute('readonly')){
      tpNameEl.removeAttribute('readonly');
      tpNameEl.focus();
    }
  });
  tpNameEl.addEventListener('blur', e => {
    const v = e.target.value.trim();
    if(!v && creatingNewTask) return; // nada digitado ainda, não cria
    const t = getOrCreateActiveTask();
    if(!t) return;
    t.title = v;
    if(!creatingNewTask) tpNameEl.setAttribute('readonly', '');
    markDirty();
  });
  tpNameEl.addEventListener('keydown', e => { if(e.key==='Enter') e.target.blur(); });

  document.getElementById('tpDoneCheck').onclick = () => {
    const t = getOrCreateActiveTask(); if(!t) return;
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

  const tpStatusTrigger = document.getElementById('tpStatusTrigger');
  const tpStatusDropdown = document.getElementById('tpStatusDropdown');
  tpStatusTrigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = tpStatusDropdown.style.display === 'block';
    tpStatusDropdown.style.display = isOpen ? 'none' : 'block';
  };
  tpStatusDropdown.addEventListener('click', e => e.stopPropagation());
  tpStatusDropdown.querySelectorAll('.tp-status-option').forEach(opt => {
    opt.onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      const s = opt.dataset.s;
      t.status = s;
      t.done = (s === 'concluida');
      t.completedAt = t.done ? Date.now() : null;
      tpStatusDropdown.style.display = 'none';
      if(t.done && t.recurrence && t.recurrence !== 'none'){
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
  });

  function renderTpGroupChip(){
    const cat = catById(task.categoryId);
    const chip = document.getElementById('tpGroupChip');
    chip.style.background = cat ? cat.color + '22' : 'var(--surface-2)';
    chip.style.color = cat ? cat.color : 'var(--ink-soft)';
    chip.innerHTML = `<span class="cat-swatch" style="background:${cat?cat.color:'var(--ink-faint)'}"></span>${escapeHtml(cat?cat.name:'Sem espaço')}`;
  }
  renderTpGroupChip();
  document.getElementById('tpGroupChip').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, task.categoryId, (newCatId) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.categoryId = newCatId;
      task.categoryId = newCatId;
      t.tagIds = (t.tagIds||[]).filter(id => {
        const tg = state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === t.categoryId);
      });
      renderTpGroupChip();
      markDirty();
    });
  };

  let tpShowPastAgendas = false;
  function agendaIsPast(ev){
    const today = todayStr();
    if(ev.recurrence && ev.recurrence !== 'none') return !!ev.recurrenceEndDate && ev.recurrenceEndDate < today;
    return (ev.endDate || ev.date || '9999') < today;
  }
  function renderTpAgendaList(){
    const box = document.getElementById('tpAgendaList');
    if(!box) return;
    const all = state.events.filter(ev => ev.linkedTaskId === task.id)
      .sort((a,b) => (a.date||'').localeCompare(b.date||''));
    const past = all.filter(agendaIsPast);
    const linked = tpShowPastAgendas ? all : all.filter(ev => !agendaIsPast(ev));
    if(all.length === 0){
      box.innerHTML = '';
      return;
    }
    const pastToggle = past.length
      ? `<button type="button" class="tp-past-toggle" id="tpPastAgendasBtn">${tpShowPastAgendas ? 'Ocultar anteriores' : 'Mostrar ' + past.length + ' anterior' + (past.length > 1 ? 'es' : '')}</button>`
      : '';
    box.innerHTML = linked.map(ev => `
      <div class="tp-task-agenda-row" data-event-id="${ev.id}">
        <span class="dot" style="background:${eventColor(ev)}"></span>
        <div class="tp-task-agenda-body">
          <div class="tp-task-agenda-date">${fmtDate(ev.date)}${ev.startTime?' '+ev.startTime:''}</div>
          <div class="tp-task-agenda-title">${escapeHtml(ev.title||'Sem título')}</div>
        </div>
      </div>
    `).join('') + pastToggle;
    const pastBtn = box.querySelector('#tpPastAgendasBtn');
    if(pastBtn) pastBtn.onclick = (e) => { e.stopPropagation(); tpShowPastAgendas = !tpShowPastAgendas; renderTpAgendaList(); };
    box.querySelectorAll('.tp-task-agenda-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        const ev = state.events.find(x => x.id === row.dataset.eventId);
        if(ev) openEventComposer(ev);
      };
    });
  }
  renderTpAgendaList();
  document.getElementById('tpAddAgendaBtn').onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    openEventComposer(null, t.dueDate || todayStr(), t.id);
  };

  function renderTpNotesList(){
    const box = document.getElementById('tpNotesList');
    if(!box) return;
    const linked = state.notes.filter(n => n.linkedTaskId === task.id)
      .sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    if(linked.length === 0){
      box.innerHTML = '';
      return;
    }
    box.innerHTML = linked.map(n => `
      <div class="tp-task-agenda-row" data-note-id="${n.id}">
        <span class="dot" style="background:var(--ink-faint)"></span>
        <span class="tp-task-agenda-date">${fmtUpdatedAt(n.updatedAt)}</span>
        <span class="tp-task-agenda-title">${escapeHtml(n.title||'Sem título')}</span>
      </div>
    `).join('');
    box.querySelectorAll('.tp-task-agenda-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        const n = state.notes.find(x => x.id === row.dataset.noteId);
        if(n){ currentView = 'notes'; render(); openNoteComposer(n); }
      };
    });
  }
  renderTpNotesList();
  document.getElementById('tpAddNoteBtn').onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    currentView = 'notes';
    render();
    openNoteComposer(null, t.id);
  };

  const tpProjChipX = document.getElementById('tpProjChipX');
  if(tpProjChipX) tpProjChipX.onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    t.projectId = null; t.stageId = null;
    markDirty();
  };
  const descEl = document.getElementById('tpDesc');
  const growDesc = () => { if(descEl.scrollHeight > descEl.clientHeight) descEl.style.height = Math.min(descEl.scrollHeight + 2, Math.round(window.innerHeight * 0.6)) + 'px'; };
  descEl.addEventListener('input', growDesc);
  growDesc();
  document.getElementById('tpDesc').addEventListener('blur', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    t.description = e.target.value; markDirty();
  });

  /* Mantido em memória local (não cria a tarefa nova no state só por abrir o
     painel) e só é commitado via getOrCreateActiveTask() quando o usuário de
     fato anexa ou remove algo — igual ao resto dos campos deste painel. */
  let tpAttachments = (task.attachments||[]).slice();
  function renderTpAttachments(){
    const list = document.getElementById('tpAttachList');
    if(!list) return;
    list.innerHTML = '';
    tpAttachments.forEach(att => {
      const isImage = (att.type||'').startsWith('image/');
      const row = document.createElement('div');
      row.className = 'tp-attach-row';
      row.innerHTML = `
        ${isImage ? `<img src="${att.dataUrl}" alt="" class="tp-attach-thumb-img">` : `<span class="tp-attach-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></span>`}
        <span class="tp-attach-name" title="${escapeHtml(att.name||'')}">${escapeHtml(att.name||'Arquivo')}</span>
        <button type="button" class="tp-attach-dl" title="Baixar anexo" aria-label="Baixar anexo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></button>
        <button type="button" class="tp-attach-del" title="Remover">×</button>
      `;
      row.querySelector('.tp-attach-dl').onclick = () => downloadAttachment(att);
      row.querySelector(isImage ? '.tp-attach-thumb-img' : '.tp-attach-file-icon').onclick = () => window.open(att.dataUrl, '_blank');
      row.querySelector('.tp-attach-del').onclick = () => {
        tpAttachments = tpAttachments.filter(a => a.id !== att.id);
        const t = getOrCreateActiveTask(); if(t) { t.attachments = tpAttachments; markDirty(); }
        renderTpAttachments();
      };
      list.appendChild(row);
    });
  }
  renderTpAttachments();
  document.getElementById('tpAttachBtn').onclick = () => document.getElementById('tpAttachInput').click();
  document.getElementById('tpAttachInput').addEventListener('change', e => {
    const MAX_SIZE = 4 * 1024 * 1024;
    Array.from(e.target.files||[]).forEach(file => {
      if(file.size > MAX_SIZE){
        alert(`"${file.name}" tem mais de 4 MB e não foi anexado — arquivos muito grandes deixam a sincronização mais lenta.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        tpAttachments.push({ id: uid('att'), name: file.name, type: file.type || '', dataUrl: ev.target.result });
        const t = getOrCreateActiveTask(); if(t) { t.attachments = tpAttachments; markDirty(); }
        renderTpAttachments();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  const tpFollowTrigger = document.getElementById('tpFollowTrigger');
  if(tpFollowTrigger){
    tpFollowTrigger.onclick = (e) => {
      e.stopPropagation();
      tpFollowOpen = !tpFollowOpen;
      document.getElementById('tpFollowMenu').hidden = !tpFollowOpen;
    };
    const fMenu = document.getElementById('tpFollowMenu');
    fMenu.onclick = (e) => e.stopPropagation();
    fMenu.querySelectorAll('.tp-follow-opt[data-days], .tp-follow-opt[data-clear]').forEach(b => {
      b.onclick = () => {
        const t = getOrCreateActiveTask(); if(!t) return;
        const days = b.dataset.clear ? null : parseInt(b.dataset.days, 10);
        t.followUpDate = days === null ? null : addDaysStr(todayStr(), days);
        tpFollowOpen = false;
        markDirty();
      };
    });
    document.getElementById('tpFollowCustom').onclick = () => {
      tpFollowOpen = false;
      fMenu.hidden = true;
      const inp = document.getElementById('tpFollowDate');
      try { inp.showPicker(); } catch(err) { inp.focus(); inp.click(); }
    };
    const tpFollowDate = document.getElementById('tpFollowDate');
    tpFollowDate.addEventListener('change', e => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.followUpDate = e.target.value || null;
      markDirty();
    });
  }
  if(!window._tpFollowOutside){
    window._tpFollowOutside = true;
    document.addEventListener('click', () => {
      if(!tpFollowOpen) return;
      tpFollowOpen = false;
      const m = document.getElementById('tpFollowMenu'); if(m) m.hidden = true;
    });
  }
  const tpStartLink = document.getElementById('tpStartLink');
  if(tpStartLink){
    const pop = document.getElementById('tpStartPop');
    tpStartLink.onclick = (e) => { e.stopPropagation(); tpStartOpen = !tpStartOpen; pop.hidden = !tpStartOpen; };
    pop.onclick = (e) => e.stopPropagation();
    const setStart = (v) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      if(v && !dateInStageRange(t, v)){
        flashStageRangeWarning(t);
        return;
      }
      t.startDate = v || null;
      tpStartOpen = false;
      markDirty();
    };
    pop.querySelectorAll('[data-start]').forEach(b => { b.onclick = () => setStart(b.dataset.start); });
    document.getElementById('tpStartDate').addEventListener('change', e => setStart(e.target.value));
    const rst = document.getElementById('tpStartReset');
    if(rst) rst.onclick = () => setStart(null);
  }
  if(!window._tpStartOutside){
    window._tpStartOutside = true;
    document.addEventListener('click', () => {
      if(!tpStartOpen) return;
      tpStartOpen = false;
      const m = document.getElementById('tpStartPop'); if(m) m.hidden = true;
    });
  }
  document.getElementById('tpDate').addEventListener('change', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const v = e.target.value || null;
    if(v && !dateInStageRange(t, v)){
      // tarefa de etapa: o prazo respeita as datas da etapa
      e.target.value = t.dueDate || '';
      flashStageRangeWarning(t);
      return;
    }
    t.dueDate = v;
    if(v && !t.dueTime){ t.dueTime = DEFAULT_DUE_TIME; document.getElementById('tpTime').value = DEFAULT_DUE_TIME; }
    markDirty();
  });
  document.getElementById('tpTime').addEventListener('change', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    t.dueTime = e.target.value || null; markDirty();
  });

  panel.querySelectorAll('.tp-priority-btn').forEach(btn => {
    btn.onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.priority = (t.priority === btn.dataset.p) ? null : btn.dataset.p;
      markDirty();
    };
  });

  document.getElementById('tpTagsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderUnifiedTagPicker(portal, {
      categoryId: task.categoryId,
      isSelected: (tagId) => (task.tagIds||[]).includes(tagId),
      onToggle: (tagId) => {
        const t = getOrCreateActiveTask(); if(!t) return;
        t.tagIds = t.tagIds || [];
        if(t.tagIds.includes(tagId)) t.tagIds = t.tagIds.filter(id => id !== tagId);
        else t.tagIds.push(tagId);
        task.tagIds = t.tagIds;
        persistOnly();
        renderTpTagsSelected();
      },
      onChanged: () => { renderTpTagsSelected(); }
    });
  };

  function renderTpTagsSelected(){
    const box = document.getElementById('tpTagsSelected');
    if(!box) return;
    const addBtn = box.querySelector('#tpTagsToggleBtn');
    box.querySelectorAll('.tp-tag-chip').forEach(el => el.remove());
    (task.tagIds||[]).map(id => state.tags.find(tg=>tg.id===id)).filter(Boolean).forEach(tg => {
      const chip = document.createElement('span');
      chip.className = 'tp-tag-chip active';
      chip.style.background = tg.color;
      chip.textContent = tg.name;
      chip.title = 'Clique para remover';
      chip.dataset.tagId = tg.id;
      chip.onclick = (e) => {
        e.stopPropagation();
        const t = getOrCreateActiveTask(); if(!t) return;
        t.tagIds = (t.tagIds||[]).filter(id => id !== tg.id);
        task.tagIds = t.tagIds;
        persistOnly();
        renderTpTagsSelected();
      };
      box.insertBefore(chip, addBtn);
    });
  }
  document.querySelectorAll('#tpTagsSelected .tp-tag-chip[data-tag-id]').forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      const t = getOrCreateActiveTask(); if(!t) return;
      const tagId = chip.dataset.tagId;
      t.tagIds = (t.tagIds||[]).filter(id => id !== tagId);
      task.tagIds = t.tagIds;
      persistOnly();
      renderTpTagsSelected();
    };
  });

  const tpRecurrenceTrigger = document.getElementById('tpRecurrenceTrigger');
  tpRecurrenceTrigger.onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    openRecurrencePortal(tpRecurrenceTrigger, t, () => {
      const freshLabel = document.getElementById('tpRecurrenceTriggerLabel');
      if(freshLabel) freshLabel.textContent = recurrenceSummaryLabel(t);
    });
  };

  const subtaskList = document.getElementById('tpSubtaskList');
  (task.subtasks||[]).forEach((st, idx) => {
    const row = document.createElement('div');
    row.className = 'tp-subtask-row' + (st.done ? ' done' : '');
    row.innerHTML = `
      <div class="task-check ${st.done?'done':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
      <span class="tp-subtask-title" contenteditable="true" spellcheck="false">${escapeHtml(st.title)}</span>
      <button type="button" class="tp-subtask-move" data-dir="up" ${idx===0?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
      <button type="button" class="tp-subtask-move" data-dir="down" ${idx===(task.subtasks.length-1)?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      <button type="button" class="tp-subtask-del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
    `;
    row.querySelector('.task-check').onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      const sub = t.subtasks.find(s => s.id === st.id);
      if(sub){
        const i = t.subtasks.indexOf(sub);
        sub.done = !sub.done;
        t.subtasks.splice(i, 1);
        if(sub.done){ sub.prevIdx = i; t.subtasks.push(sub); }
        else { t.subtasks.splice(Math.min(sub.prevIdx != null ? sub.prevIdx : t.subtasks.length, t.subtasks.length), 0, sub); delete sub.prevIdx; }
        markDirty();
      }
    };
    const titleEl = row.querySelector('.tp-subtask-title');
    titleEl.addEventListener('blur', () => {
      const v = titleEl.textContent.trim();
      const t = getOrCreateActiveTask(); if(!t) return;
      const sub = t.subtasks.find(s => s.id === st.id);
      if(sub && v && v !== sub.title){ sub.title = v; markDirty(); }
      else if(sub) titleEl.textContent = sub.title;
    });
    titleEl.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); titleEl.blur(); } });
    row.querySelectorAll('.tp-subtask-move').forEach(btn => {
      btn.onclick = () => {
        const t = getOrCreateActiveTask(); if(!t) return;
        const i = t.subtasks.findIndex(s => s.id === st.id);
        const j = btn.dataset.dir === 'up' ? i - 1 : i + 1;
        if(j < 0 || j >= t.subtasks.length) return;
        [t.subtasks[i], t.subtasks[j]] = [t.subtasks[j], t.subtasks[i]];
        markDirty();
      };
    });
    row.querySelector('.tp-subtask-del').onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.subtasks = t.subtasks.filter(s => s.id !== st.id);
      markDirty();
    };
    subtaskList.appendChild(row);
  });
  document.getElementById('tpNewSubtask').addEventListener('keydown', e => {
    if(e.key === 'Enter' && e.target.value.trim()){
      const t = getOrCreateActiveTask(); if(!t) return;
      t.subtasks = t.subtasks || [];
      t.subtasks.push({ id: uid('sub'), title: e.target.value.trim(), done:false });
      markDirty();
    }
  });

  const commentList = document.getElementById('tpCommentList');
  (task.comments||[]).slice().reverse().forEach(c => {
    const row = document.createElement('div');
    row.className = 'tp-comment';
    const d = new Date(c.createdAt);
    row.innerHTML = `
      <div class="tp-comment-text" contenteditable="false">${escapeHtml(c.text)}</div>
      <div class="tp-comment-footer">
        <span class="tp-comment-meta">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        <div class="tp-comment-actions">
          <button type="button" class="tp-comment-edit" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
          <button type="button" class="tp-comment-del" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
        </div>
      </div>
    `;
    const textEl = row.querySelector('.tp-comment-text');
    const editBtn = row.querySelector('.tp-comment-edit');
    editBtn.onclick = () => {
      const isEditing = textEl.getAttribute('contenteditable') === 'true';
      if(!isEditing){
        textEl.setAttribute('contenteditable', 'true');
        textEl.classList.add('editing');
        textEl.focus();
        const range = document.createRange();
        range.selectNodeContents(textEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        textEl.setAttribute('contenteditable', 'false');
        textEl.classList.remove('editing');
        const t = getOrCreateActiveTask(); if(!t) return;
        const com = t.comments.find(x => x.id === c.id);
        if(com){ com.text = textEl.textContent.trim(); markDirty(); }
      }
    };
    textEl.addEventListener('keydown', e => {
      if(e.key === 'Enter' && !e.shiftKey && textEl.getAttribute('contenteditable') === 'true'){
        e.preventDefault();
        editBtn.click();
      }
    });
    row.querySelector('.tp-comment-del').onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.comments = t.comments.filter(x => x.id !== c.id);
      markDirty();
    };
    commentList.appendChild(row);
  });
  {
    const ta = document.getElementById('tpNewComment');
    const key = currentCommentKey();
    if(tpCommentDrafts[key]) ta.value = tpCommentDrafts[key];
    ta.addEventListener('input', () => {
      const k = currentCommentKey();
      if(ta.value) tpCommentDrafts[k] = ta.value; else delete tpCommentDrafts[k];
      saveCommentDrafts();
    });
  }
  document.getElementById('tpAddCommentBtn').onclick = () => {
    const ta = document.getElementById('tpNewComment');
    const text = ta.value.trim();
    if(!text) return;
    const keyBefore = currentCommentKey();
    const t = getOrCreateActiveTask(); if(!t) return;
    t.comments = t.comments || [];
    t.comments.push({ id: uid('cmt'), text, createdAt: Date.now() });
    delete tpCommentDrafts[keyBefore];
    delete tpCommentDrafts[t.id];
    saveCommentDrafts();
    markDirty();
  };
  document.getElementById('tpNewComment').addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      document.getElementById('tpAddCommentBtn').click();
    }
  });
}

