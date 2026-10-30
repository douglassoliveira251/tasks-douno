import { G } from './globais.js';
import { catById, escapeHtml, fmtDate, isOverdue, todayStr } from './10-helpers.js';
import { PRIORITY_CONFIG, STATUS_CONFIG, statusCircleSvg } from './12-render-tasks.js';
import { closeAllTaskMenus } from './13-portais-de-tarefa.js';
import { closeTaskPanel, recurrenceSummaryLabel } from './16-painel-lateral-de-tarefa.js';
import { bindTpMenu } from './18-painel-lateral-menu.js';
import { bindTpDescriptionAndAttachments, bindTpHeader, bindTpSpaceAndLinks } from './19-painel-lateral-campos.js';
import { bindTpDates, bindTpPriorityAndTags } from './20-painel-lateral-datas-e-etiquetas.js';
import { bindTpComments, bindTpRecurrenceAndSubtasks } from './21-painel-lateral-subtarefas-e-comentarios.js';
import { fmtUpdatedAt } from './23-texto-rico-utilitarios.js';
import { addDaysStr } from './25-calendario.js';
import { projectById, stageRange } from './31-projetos.js';
import { FOLLOW_PRESETS, effectiveStart, followRelative, followWeekday, nextMondayStr } from './35-templates-de-tarefa.js';

/* Painel lateral de tarefa. renderTaskPanel monta o HTML (taskPanelHtml) e liga cada área, na ordem:
   menu ⋮ (18), cabeçalho, espaço/agendas/notas, descrição/anexos (19), datas, prioridade/etiquetas (20),
   recorrência/subtarefas e comentários (21). Cada bindTp* recebe o painel e a tarefa. */
export function renderTaskPanel(panel){
  closeAllTaskMenus();
  const task = G.creatingNewTask
    ? { title:'', categoryId:(G.activeCategoryFilter && catById(G.activeCategoryFilter)) ? G.activeCategoryFilter : G.state.categories[0].id, dueDate:null, dueTime:'', priority:'media', description:'', tagIds:[], recurrence:'none', subtasks:[], comments:[] }
    : G.state.tasks.find(x => x.id === G.activeTaskId);

  if(!task){ closeTaskPanel(true); return; }


  panel.innerHTML = taskPanelHtml(task);

  bindTpMenu(panel, task);
  bindTpHeader(panel, task);
  bindTpSpaceAndLinks(panel, task);
  bindTpDescriptionAndAttachments(panel, task);
  bindTpDates(panel, task);
  bindTpPriorityAndTags(panel, task);
  bindTpRecurrenceAndSubtasks(panel, task);
  bindTpComments(panel, task);
}

export function taskPanelHtml(task){
  const catOptions = G.state.categories.map(c => `<option value="${c.id}" ${c.id===task.categoryId?'selected':''}>${escapeHtml(c.name)}</option>`).join('');

  const overdue = isOverdue(task.dueDate, task.done);
  const isToday = task.dueDate === todayStr();
  let topBarClass = 'normal';
  if(overdue) topBarClass = 'overdue';
  else if(isToday && !task.done) topBarClass = 'today';

  return `
    <div class="tp-top-flag ${topBarClass}"></div>

    <div class="tp-field">
      <div class="tp-name-row">
        <div class="task-check task-check-circle ${task.done?'done':''}" id="tpDoneCheck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
        <input type="text" class="tp-name-input ${task.done?'done':''}" id="tpName" placeholder="Nome da tarefa" value="${escapeHtml(task.title||'')}" ${G.creatingNewTask ? '' : 'readonly'}>
        <button type="button" class="tp-header-icon-btn tp-mobile-close" id="tpMobileClose" title="Fechar" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        <button type="button" class="tp-header-icon-btn" id="tpMenuBtn" title="Mais opções" aria-label="Mais opções" aria-haspopup="menu"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>
      </div>
      ${!G.creatingNewTask ? `<div class="tp-created-at">Criada em ${fmtUpdatedAt(task.createdAt)}</div>` : ''}
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
          ${(task.tagIds||[]).map(id => G.state.tags.find(tg=>tg.id===id)).filter(Boolean).map(tg => `<span class="tp-tag-chip active" data-tag-id="${tg.id}" title="Clique para remover" style="background:${tg.color}">${escapeHtml(tg.name)}</span>`).join('')}
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
        <div class="tp-follow-menu" id="tpFollowMenu" ${G.tpFollowOpen ? '' : 'hidden'}>
          ${FOLLOW_PRESETS.map(([n, lb]) => { const d = addDaysStr(todayStr(), n); return `<button type="button" class="tp-follow-opt" data-days="${n}"><span>${lb}</span><small>${followWeekday(d)}</small></button>`; }).join('')}
          <div class="tp-follow-sep"></div>
          <button type="button" class="tp-follow-opt" id="tpFollowCustom"><span>Personalizada…</span></button>
          ${task.followUpDate ? `<div class="tp-follow-sep"></div><button type="button" class="tp-follow-opt danger" data-clear="1"><span>Remover retomada</span></button>` : ''}
        </div>
      </div>
      <div class="tp-box tp-due-box">
        <label class="tp-label tp-label-row"><span>Prazo (entrega)</span>
          <button type="button" class="tp-start-link" id="tpStartLink" title="Início da tarefa (opcional)">${task.startDate ? 'início ' + fmtDate(task.startDate) : '+ início'}</button></label>
        ${(() => { const es = effectiveStart(task); return `<div class="tp-start-pop" id="tpStartPop" ${G.tpStartOpen ? '' : 'hidden'}>
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
}
