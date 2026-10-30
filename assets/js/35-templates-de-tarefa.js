import { G } from './globais.js';
import { syncEventToOutlook } from './03-outlook.js';
import { markDirty } from './08-persistencia.js';
import { DEFAULT_DUE_TIME, catById, dateToStr, escapeHtml, fmtDate, todayStr, uid } from './10-helpers.js';
import { PRIORITY_CONFIG } from './12-render-tasks.js';
import { closeAllTaskMenus, ensureTaskMenuPortal } from './13-portais-de-tarefa.js';
import { RECURRENCE_LABELS } from './16-painel-lateral-de-tarefa.js';
import { addDaysStr } from './25-calendario.js';
import { addOneHourToTime } from './28-calendario-eventos.js';
import { projectById } from './31-projetos.js';
import { render } from './48-render-principal.js';

/* ===================== TEMPLATES DE TAREFA ===================== */
export function templateFromTask(task){
  const linked = G.state.events.filter(ev => ev.linkedTaskId === task.id && ev.date);
  const due = task.dueDate || todayStr();
  const daysBetween = (a, b) => Math.round((Date.UTC(...a.split('-').map((n, i) => i === 1 ? n - 1 : +n)) - Date.UTC(...b.split('-').map((n, i) => i === 1 ? n - 1 : +n))) / 86400000);
  return {
    name: task.title || 'Novo template',
    categoryIds: task.categoryId ? [task.categoryId] : [],
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'media',
    tagIds: (task.tagIds || []).slice(),
    dueTime: task.dueTime || '',
    recurrence: task.recurrence || 'none',
    recurrenceInterval: task.recurrenceInterval || 1,
    subtasks: (task.subtasks || []).map(sub => ({ title: sub.title || '' })).filter(sub => sub.title),
    events: linked.map(ev => ({
      title: ev.title || '',
      offsetDays: daysBetween(ev.date, due),
      startTime: ev.allDay ? '' : (ev.startTime || ''),
      endTime: ev.allDay ? '' : (ev.endTime || ''),
    })),
  };
}

/* Template pertence a um ou mais espaços (categoryIds). Template antigo sem espaço
   definido continua valendo para todos até ser editado. */
export function templateSpaces(tpl){
  if(Array.isArray(tpl.categoryIds) && tpl.categoryIds.length) return tpl.categoryIds.filter(id => catById(id));
  if(tpl.categoryId && catById(tpl.categoryId)) return [tpl.categoryId];
  return [];
}
export function templatesForSpace(catId){
  return (G.state.taskTemplates || []).filter(tp => {
    const sp = templateSpaces(tp);
    return !catId || sp.length === 0 || sp.includes(catId);
  });
}
/* "Retomar em" (task.followUpDate): data para VOLTAR a olhar a tarefa. Não é prazo:
   não conta como atraso nem entra na previsão de projetos. */
export function followUpState(t){
  if(!t.followUpDate || t.done) return null;
  const today = todayStr();
  if(t.followUpDate < today) return 'vencida';
  if(t.followUpDate === today) return 'hoje';
  return 'futura';
}
/* Início da tarefa: opcional. Sem valor próprio (task.startDate), herda o início da etapa do projeto;
   sem etapa, vale "ao abrir" (a data de criação). Só guardamos algo quando o usuário ajusta. */
G.tpStartOpen = false;
export function effectiveStart(t){
  if(t.startDate) return { date: t.startDate, source: 'own' };
  const pr = t.projectId ? projectById(t.projectId) : null;
  const created = t.createdAt ? dateToStr(new Date(t.createdAt)) : todayStr();
  return { date: created, source: 'open' };
}
export function nextMondayStr(){
  const d = new Date(todayStr() + 'T12:00:00');
  const add = ((8 - d.getDay()) % 7) || 7;
  return addDaysStr(todayStr(), add);
}
G.tpFollowOpen = false;
export const FOLLOW_PRESETS = [[0,'Hoje'],[1,'Amanhã'],[3,'3 dias'],[7,'7 dias'],[15,'15 dias']];
export function followWeekday(d){
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' }).replace('.', '');
}
export function followRelative(d){
  const a = new Date(todayStr() + 'T12:00:00'), b = new Date(d + 'T12:00:00');
  const n = Math.round((b - a) / 86400000);
  if(n === 0) return 'hoje';
  if(n === 1) return 'amanhã';
  if(n > 1) return 'em ' + n + ' dias';
  return n === -1 ? 'ontem' : 'há ' + (-n) + ' dias';
}
export function followUpLabel(t){
  const st = followUpState(t);
  if(!st) return '';
  if(st === 'hoje') return 'Retomar hoje';
  if(st === 'vencida') return 'Retomar desde ' + fmtDate(t.followUpDate);
  return 'Retomar ' + fmtDate(t.followUpDate);
}
export function applyTemplateFromPanel(id){
  const tpl = (G.state.taskTemplates || []).find(x => x.id === id);
  if(tpl) createTaskFromTemplate(tpl);
}
export function createTaskFromTemplate(tpl){
  const spaces = templateSpaces(tpl);
  const catId = (G.activeCategoryFilter && spaces.includes(G.activeCategoryFilter)) ? G.activeCategoryFilter
    : (spaces[0] || ((G.activeCategoryFilter && catById(G.activeCategoryFilter)) ? G.activeCategoryFilter : G.state.categories[0].id));
  const today = todayStr();
  G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
  const t = {
    id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'),
    title: tpl.title || tpl.name || '', categoryId: catId, done: false, status: 'nao_iniciado',
    dueDate: today, startDate: today, followUpDate: today, dueTime: tpl.dueTime || DEFAULT_DUE_TIME, priority: tpl.priority || 'media',
    description: tpl.description || '',
    tagIds: (tpl.tagIds || []).filter(id => G.state.tags.some(tg => tg.id === id)),
    recurrence: tpl.recurrence || 'none', recurrenceInterval: tpl.recurrenceInterval || 1,
    recurrenceBaseDate: (tpl.recurrence && tpl.recurrence !== 'none') ? today : null,
    subtasks: (tpl.subtasks || []).map(sub => ({ id: uid('sub'), title: sub.title, done: false })),
    comments: [], attachments: [], createdAt: Date.now(),
  };
  G.state.tasks.push(t);
  const created = [];
  (tpl.events || []).forEach(e => {
    const date = addDaysStr(today, parseInt(e.offsetDays, 10) || 0);
    const allDay = !e.startTime;
    const ev = {
      id: uid('event'), title: e.title || t.title, categoryId: catId, tagIds: t.tagIds.slice(),
      date, endDate: date, startTime: allDay ? '' : e.startTime, endTime: allDay ? '' : (e.endTime || addOneHourToTime(e.startTime)),
      allDay, recurrence: 'none', recurrenceInterval: 1, recurrenceBaseDate: date,
      linkedTaskId: t.id, description: '', createdAt: Date.now(),
    };
    G.state.events.push(ev);
    created.push(ev);
  });
  G.currentView = 'tasks';
  G.activeTaskId = t.id;
  G.creatingNewTask = false;
  markDirty();
  created.forEach(ev => syncEventToOutlook(ev));
  return t;
}

export function openTemplatePickMenu(anchorBtn){
  const portal = ensureTaskMenuPortal();
  const list = templatesForSpace(G.activeCategoryFilter);
  portal.innerHTML = (list.length
    ? list.map(tp => `<button type="button" class="task-menu-item" data-tpl="${tp.id}">${escapeHtml(tp.name || 'Sem nome')}</button>`).join('')
    : '<div class="tpl-menu-empty">Nenhum template para este espaço. Crie em Configurações → Templates ou use "Salvar como template" no menu de uma tarefa.</div>')
    + '<div class="tpl-menu-sep"></div><button type="button" class="task-menu-item" data-tpl-manage="1">Gerenciar templates…</button>';
  const rect = anchorBtn.getBoundingClientRect();
  portal.style.top = Math.round(rect.bottom + 6) + 'px';
  portal.style.left = Math.round(Math.min(rect.left, window.innerWidth - 250)) + 'px';
  portal.style.right = 'auto';
  portal.classList.add('show');
  portal.querySelectorAll('[data-tpl]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      closeAllTaskMenus();
      const tpl = G.state.taskTemplates.find(x => x.id === btn.dataset.tpl);
      if(tpl) createTaskFromTemplate(tpl);
    };
  });
  portal.querySelector('[data-tpl-manage]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    G.settingsTab = 'templates';
    G.currentView = 'settings';
    render();
  };
}

export function ensureTemplateOverlay(){
  let ov = document.getElementById('templateOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'templateOverlay';
    ov.innerHTML = '<div class="modal tpl-overlay-modal" id="templateModal"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { ov._downOnBackdrop = (e.target === ov); });
    ov.addEventListener('click', e => { if(e.target === ov && ov._downOnBackdrop) ov.classList.remove('show'); });
  }
  return ov;
}

export function openTemplateEditor(existing, prefill){
  const ov = ensureTemplateOverlay();
  const modal = ov.querySelector('#templateModal');
  const tpl = existing
    ? JSON.parse(JSON.stringify(existing))
    : Object.assign({ id: uid('tpl'), name: '', categoryIds: (G.activeCategoryFilter && catById(G.activeCategoryFilter)) ? [G.activeCategoryFilter] : [G.state.categories[0].id], title: '', description: '', priority: 'media', tagIds: [], dueTime: '', recurrence: 'none', recurrenceInterval: 1, subtasks: [], events: [] }, prefill || {});
  if(!tpl.id) tpl.id = uid('tpl');
  const selectedTags = new Set(tpl.tagIds || []);
  const selectedSpaces = new Set(templateSpaces(tpl).length ? templateSpaces(tpl) : (tpl.categoryIds === undefined && !tpl.categoryId && existing ? G.state.categories.map(c => c.id) : templateSpaces(tpl)));
  const events = (tpl.events || []).map(e => ({ ...e }));

  function eventsHtml(){
    if(!events.length) return '<p style="font-size:12px; color:var(--ink-faint); margin-bottom:6px;">Nenhuma agenda. Adicione para criar compromissos junto com a tarefa.</p>';
    return events.map((e, i) => `
      <div class="tpl-ev-row" data-i="${i}">
        <input type="text" class="tp-input tpl-ev-title" data-f="title" placeholder="Título da agenda" value="${escapeHtml(e.title || '')}">
        <button type="button" class="tp-attach-del" data-del="${i}" title="Remover">×</button>
        <label class="nm-mini"><span>Dias</span><input type="number" class="tp-input" data-f="offsetDays" value="${parseInt(e.offsetDays, 10) || 0}" title="0 = no dia; negativo = antes; positivo = depois"></label>
        <label class="nm-mini"><span>Início</span><input type="time" class="tp-input" data-f="startTime" value="${e.startTime || ''}"></label>
        <label class="nm-mini"><span>Fim</span><input type="time" class="tp-input" data-f="endTime" value="${e.endTime || ''}"></label>
      </div>`).join('');
  }

  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="tplClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="nm-head">
      <div class="nm-kicker">${existing ? 'Editar template' : 'Novo template'}</div>
      <input type="text" class="nm-title-input" id="tplName" placeholder="Nome do template (ex.: Fechamento mensal)" value="${escapeHtml(tpl.name || '')}">
    </div>
    <div class="nm-cols">
      <div class="nm-col">
        <div class="nm-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>A tarefa</div>
        <div class="tp-field"><label class="tp-label">Título da tarefa</label>
          <input type="text" class="tp-input" id="tplTitle" placeholder="Título que a tarefa nasce com" value="${escapeHtml(tpl.title || '')}"></div>
        <div class="tp-field"><label class="tp-label">Disponível nos espaços <span>(só aparece neles)</span></label>
          <div class="tpl-tags" id="tplSpaces">${G.state.categories.map(c => `<span class="tpl-tag-chip ${selectedSpaces.has(c.id) ? 'on' : ''}" data-space="${c.id}" style="${selectedSpaces.has(c.id) ? 'background:' + c.color : ''}">${escapeHtml(c.name)}</span>`).join('')}</div></div>
        <div class="tpl-grid">
          <div class="tp-field"><label class="tp-label">Prioridade</label>
            <select class="tp-select" id="tplPriority">${PRIORITY_CONFIG.map(p => `<option value="${p.key}" ${tpl.priority === p.key ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
          <div class="tp-field"><label class="tp-label">Horário</label>
            <input type="time" class="tp-input" id="tplTime" value="${tpl.dueTime || ''}"></div>
        </div>
        <div class="tp-field"><label class="tp-label">Repetição</label>
          <div class="tp-row2">
            <select class="tp-select" id="tplRec">${Object.keys(RECURRENCE_LABELS).map(k => `<option value="${k}" ${tpl.recurrence === k ? 'selected' : ''}>${RECURRENCE_LABELS[k]}</option>`).join('')}</select>
            <input type="number" class="tp-input" id="tplRecInterval" min="1" value="${tpl.recurrenceInterval || 1}" title="A cada N">
          </div></div>
        <div class="tp-field"><label class="tp-label">Tags <span>(dos espaços escolhidos e gerais)</span></label>
          <div class="tpl-tags" id="tplTags"></div></div>
      </div>
      <div class="nm-col">
        <div class="nm-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/></svg>O que vem junto</div>
        <div class="tp-field"><label class="tp-label">Subtarefas <span>(uma por linha)</span></label>
          <textarea class="tp-textarea" id="tplSubtasks" rows="4" placeholder="Etapa 1&#10;Etapa 2">${escapeHtml((tpl.subtasks || []).map(x => x.title).join('\n'))}</textarea></div>
        <div class="tp-field"><label class="tp-label">Agendas <span>(criadas junto, em relação ao prazo)</span></label>
          <div id="tplEvents"></div>
          <button type="button" class="nm-add" id="tplAddEvent">+ Adicionar agenda</button></div>
        <div class="tp-field"><label class="tp-label">Descrição</label>
          <textarea class="tp-textarea" id="tplDesc" rows="3" placeholder="Passos, observações...">${escapeHtml(tpl.description || '')}</textarea></div>
      </div>
    </div>
    <p id="tplError" style="display:none; color:var(--danger); font-size:12.5px; margin:4px 0 0;"></p>
    <div class="modal-footer">
      <button type="button" class="btn ghost small" id="tplCancel">Cancelar</button>
      <button type="button" class="btn small" id="tplSave">Salvar template</button>
    </div>`;

  modal.className = 'modal nm nm-900';
  modal.querySelector('#tplClose').onclick = () => ov.classList.remove('show');
  const evBox = modal.querySelector('#tplEvents');
  function renderEvents(){ evBox.innerHTML = eventsHtml(); }
  renderEvents();
  evBox.addEventListener('input', (e) => {
    const row = e.target.closest('.tpl-ev-row'); if(!row) return;
    events[+row.dataset.i][e.target.dataset.f] = e.target.value;
  });
  evBox.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]'); if(!del) return;
    events.splice(+del.dataset.del, 1);
    renderEvents();
  });
  modal.querySelector('#tplAddEvent').onclick = () => { events.push({ title: '', offsetDays: 0, startTime: '', endTime: '' }); renderEvents(); };
  modal.querySelector('#tplTags').addEventListener('click', (e) => {
    const chip = e.target.closest('.tpl-tag-chip'); if(!chip || !chip.dataset.tag) return;
    const id = chip.dataset.tag;
    const tg = G.state.tags.find(x => x.id === id);
    if(selectedTags.has(id)){ selectedTags.delete(id); chip.classList.remove('on'); chip.style.background = ''; }
    else { selectedTags.add(id); chip.classList.add('on'); chip.style.background = tg ? tg.color : ''; }
  });
  // tags visíveis: gerais (sem espaço) + as dos espaços marcados
  function visibleTplTags(){
    return G.state.tags.filter(tg => !tg.categoryId || selectedSpaces.has(tg.categoryId));
  }
  function renderTplTags(){
    const visible = visibleTplTags();
    const visibleIds = new Set(visible.map(t => t.id));
    Array.from(selectedTags).forEach(id => { if(!visibleIds.has(id)) selectedTags.delete(id); });
    const box = modal.querySelector('#tplTags');
    box.innerHTML = visible.length
      ? visible.map(tg => `<span class="tpl-tag-chip ${selectedTags.has(tg.id) ? 'on' : ''}" data-tag="${tg.id}" style="${selectedTags.has(tg.id) ? 'background:' + tg.color : ''}">${escapeHtml(tg.name)}</span>`).join('')
      : '<span style="font-size:12px; color:var(--ink-faint);">Nenhuma tag para os espaços escolhidos.</span>';
  }
  renderTplTags();
  modal.querySelector('#tplSpaces').addEventListener('click', (e) => {
    const chip = e.target.closest('.tpl-tag-chip'); if(!chip || !chip.dataset.space) return;
    const id = chip.dataset.space;
    const c = catById(id);
    if(selectedSpaces.has(id)){ selectedSpaces.delete(id); chip.classList.remove('on'); chip.style.background = ''; }
    else { selectedSpaces.add(id); chip.classList.add('on'); chip.style.background = c ? c.color : ''; }
    renderTplTags();
  });
  modal.querySelector('#tplCancel').onclick = () => ov.classList.remove('show');
  modal.querySelector('#tplSave').onclick = () => {
    const name = modal.querySelector('#tplName').value.trim();
    const err = modal.querySelector('#tplError');
    if(!selectedSpaces.size){ err.textContent = 'Escolha pelo menos um espaço para o template.'; err.style.display = 'block'; return; }
    if(!name){ err.textContent = 'Dê um nome ao template.'; err.style.display = 'block'; modal.querySelector('#tplName').focus(); return; }
    const out = {
      id: tpl.id, name,
      title: modal.querySelector('#tplTitle').value.trim(),
      description: modal.querySelector('#tplDesc').value,
      priority: modal.querySelector('#tplPriority').value,
      categoryIds: Array.from(selectedSpaces),
      dueTime: modal.querySelector('#tplTime').value,
      recurrence: modal.querySelector('#tplRec').value,
      recurrenceInterval: Math.max(1, parseInt(modal.querySelector('#tplRecInterval').value, 10) || 1),
      tagIds: Array.from(selectedTags),
      subtasks: modal.querySelector('#tplSubtasks').value.split('\n').map(x => x.trim()).filter(Boolean).map(title => ({ title })),
      events: events.filter(e => (e.title || '').trim()).map(e => ({
        title: e.title.trim(), offsetDays: parseInt(e.offsetDays, 10) || 0, startTime: e.startTime || '', endTime: e.endTime || '',
      })),
    };
    const i = G.state.taskTemplates.findIndex(x => x.id === out.id);
    if(i >= 0) G.state.taskTemplates[i] = out; else G.state.taskTemplates.push(out);
    ov.classList.remove('show');
    markDirty();
  };
  ov.classList.add('show');
  setTimeout(() => modal.querySelector('#tplName').focus(), 0);
}

export function renderTemplatesPanel(panel){
  const list = G.state.taskTemplates || [];
  const spacesLabel = tp => { const sp = templateSpaces(tp); return sp.length ? sp.map(id => catById(id).name).join(', ') : 'Todos os espaços'; };
  panel.innerHTML = `
    <h3 class="settings-section-title">Templates de tarefa</h3>
    <p class="settings-section-desc">Modelos para criar tarefas já preenchidas: descrição, prioridade, tags, repetição, subtarefas e agendas. Use pelo botão "Template" na lista de Tarefas.</p>
    <button type="button" class="btn small" id="tplNewBtn">+ Novo template</button>
    <div class="tpl-list">
      ${list.length ? list.map(tp => `
        <div class="tpl-card" data-id="${tp.id}">
          <div class="tpl-card-main">
            <div class="tpl-card-name">${escapeHtml(tp.name || 'Sem nome')}</div>
            <div class="tpl-card-meta">${escapeHtml(spacesLabel(tp))} · ${(tp.subtasks||[]).length} subtarefa(s) · ${(tp.events||[]).length} agenda(s)${tp.recurrence && tp.recurrence !== 'none' ? ' · ' + RECURRENCE_LABELS[tp.recurrence].toLowerCase() : ''}</div>
          </div>
          <div class="tpl-card-actions">
            <button type="button" class="btn ghost small" data-act="edit">Editar</button>
            <button type="button" class="btn ghost small" data-act="dup">Duplicar</button>
            <button type="button" class="btn ghost small" data-act="del" style="color:var(--danger);">Excluir</button>
          </div>
        </div>`).join('') : '<p class="settings-section-desc" style="margin-top:8px;">Nenhum template ainda.</p>'}
    </div>`;
  panel.querySelector('#tplNewBtn').onclick = () => openTemplateEditor(null);
  panel.querySelectorAll('.tpl-card').forEach(card => {
    const tpl = G.state.taskTemplates.find(x => x.id === card.dataset.id);
    card.querySelector('[data-act="edit"]').onclick = () => openTemplateEditor(tpl);
    card.querySelector('[data-act="dup"]').onclick = () => {
      const copy = JSON.parse(JSON.stringify(tpl));
      copy.id = uid('tpl'); copy.name = (tpl.name || 'Template') + ' (cópia)';
      G.state.taskTemplates.push(copy);
      markDirty();
    };
    card.querySelector('[data-act="del"]').onclick = () => {
      if(!confirm('Excluir o template "' + (tpl.name || '') + '"?')) return;
      G.state.taskTemplates = G.state.taskTemplates.filter(x => x.id !== tpl.id);
      markDirty();
    };
  });
}

