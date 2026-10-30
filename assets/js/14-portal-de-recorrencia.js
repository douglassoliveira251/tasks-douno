import { markDirty, persistOnly } from './08-persistencia.js';
import { todayStr } from './10-helpers.js';
import { positionTagsPortalNear } from './15-portais-de-grupo-e-etiquetas.js';

export function ensureRecurrencePortal(){
  let portal = document.getElementById('recurrencePortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'recurrencePortal';
    portal.className = 'tp-tags-popover tags-picker-portal recurrence-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
export function closeRecurrencePortal(e){
  const portal = document.getElementById('recurrencePortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
export function renderRecurrencePortalContent(portal, task, onChange){
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
export function openRecurrencePortal(anchorBtn, task, onChange){
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

