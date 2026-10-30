import { G } from './globais.js';
import { deleteEventFromOutlook, refreshOutlookStatus, syncEventToOutlook } from './03-outlook.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { catById, escapeHtml, todayStr, uid } from './10-helpers.js';
import { openConfirmPortal, renderTaskLinkPicker, renderUnifiedTagPicker } from './13-portais-de-tarefa.js';
import { openRecurrencePortal } from './14-portal-de-recorrencia.js';
import { closeTagsPortal, ensureTagsPortal, openMoveGroupPortal, positionTagsPortalNear } from './15-portais-de-grupo-e-etiquetas.js';
import { recurrenceSummaryLabel } from './16-painel-lateral-de-tarefa.js';
import { timeToMinutes } from './27-calendario-vistas.js';

export function addOneHourToTime(timeStr){
  if(!timeStr) return '';
  const [h,m] = timeStr.split(':').map(Number);
  const newH = Math.min((h||0)+1, 23);
  return String(newH).padStart(2,'0') + ':' + String(m||0).padStart(2,'0');
}

export function applyTaskDataToEvent(ev, task){
  ev.title = task.title || ev.title;
  ev.tagIds = (task.tagIds||[]).slice();
  ev.date = task.dueDate || ev.date;
  ev.endDate = task.dueDate || ev.date;
  ev.startTime = task.dueTime || '';
  ev.endTime = ev.startTime ? addOneHourToTime(ev.startTime) : '';
  ev.allDay = !task.dueTime;
  ev.description = task.description || ev.description;
}

export function nextRoundedHourTimes(){
  const now = new Date();
  let hour = now.getHours();
  if(now.getMinutes() > 0) hour = Math.min(hour + 1, 23);
  const start = String(hour).padStart(2,'0') + ':00';
  const end = String(Math.min(hour + 1, 23)).padStart(2,'0') + ':00';
  return { start, end };
}

export function icsDateStamp(dateStr, timeStr){
  const datePart = (dateStr || todayStr()).replace(/-/g, '');
  if(!timeStr) return datePart;
  const timePart = timeStr.replace(':', '') + '00';
  return `${datePart}T${timePart}`;
}
export function icsEscape(text){
  return String(text||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
export function downloadEventAsICS(ev){
  const isAllDay = !!ev.allDay || !ev.startTime;
  const dtStart = isAllDay ? icsDateStamp(ev.date) : icsDateStamp(ev.date, ev.startTime);
  const dtEnd = isAllDay ? icsDateStamp(ev.endDate || ev.date) : icsDateStamp(ev.endDate || ev.date, ev.endTime || ev.startTime);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DOUNO Tasks//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + ev.id + '@taskin',
    'DTSTAMP:' + icsDateStamp(todayStr(), '00:00'),
    isAllDay ? ('DTSTART;VALUE=DATE:' + dtStart) : ('DTSTART:' + dtStart),
    isAllDay ? ('DTEND;VALUE=DATE:' + dtEnd) : ('DTEND:' + dtEnd),
    'SUMMARY:' + icsEscape(ev.title || 'Sem título'),
    ev.description ? ('DESCRIPTION:' + icsEscape(ev.description)) : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (ev.title || 'agenda').replace(/[^\w\-]+/g, '_') + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => { try{ URL.revokeObjectURL(url); }catch(e){} }, 1000);
}

export function openEventComposer(existingEvent, defaultDate, prefillTaskId){
  const isEditing = !!existingEvent;
  const defaultTimes = nextRoundedHourTimes();
  /* Edita uma cópia (rascunho): mudar tags/campos e fechar sem salvar não altera a
     agenda real. Ao salvar, o rascunho é aplicado de volta na agenda original. */
  const ev = existingEvent ? JSON.parse(JSON.stringify(existingEvent)) : {
    id: uid('event'), title:'', categoryId: G.activeCategoryFilter || G.state.categories[0].id,
    tagIds: [], date: defaultDate || todayStr(), endDate: defaultDate || todayStr(),
    startTime: defaultTimes.start, endTime: defaultTimes.end, allDay:false,
    recurrence:'none', recurrenceInterval:1, recurrenceBaseDate: defaultDate || todayStr(),
    linkedTaskId: null, description:'', createdAt: Date.now()
  };
  if(ev.endDate === undefined) ev.endDate = ev.date;
  if(!isEditing && prefillTaskId){
    const t = G.state.tasks.find(x => x.id === prefillTaskId);
    if(t){
      ev.linkedTaskId = t.id;
      ev.categoryId = t.categoryId;
      applyTaskDataToEvent(ev, t);
    }
  }
  const modal = document.getElementById('eventComposerModal');

  modal.innerHTML = `
    <div class="ev-flag"></div>
    <button type="button" class="ev-x" id="evCloseX" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="ev-head">
      <div class="ev-kicker">${isEditing?'Editar agenda':'Nova agenda'}</div>
      <input type="text" class="ev-title-input" id="evTitle" placeholder="Nome da agenda" value="${escapeHtml(ev.title||'')}">
      <div class="ev-spacefield" style="position:relative;">
        <label class="tp-label">Espaço</label>
        <div class="cat-tags-combined-row">
          <div class="group-move-row">
            <button type="button" class="move-group-btn" id="evMoveGroupBtn" title="Mover de espaço"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg></button>
            <span class="group-current-chip" id="evGroupChip"></span>
          </div>
          <div class="tp-tags-selected" id="evTagsSelected">
            ${(ev.tagIds||[]).map(id => G.state.tags.find(tg=>tg.id===id)).filter(Boolean).map(tg => `<span class="tp-tag-chip active" data-tag-id="${tg.id}" title="Clique para remover" style="background:${tg.color}">${escapeHtml(tg.name)}</span>`).join('')}
            <button type="button" class="tp-tags-add-btn" id="evTagsToggleBtn">+ Tag</button>
          </div>
          <span class="ev-space-hint">As tags definem a cor da agenda.</span>
        </div>
      </div>
    </div>
    <div class="ev-cols">
      <div class="ev-col">
        <div class="ev-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>Quando</div>
        <div class="tp-field">
          <div class="ev-daterange-row">
            <div class="ev-daterange-col">
              <label class="tp-label">Início</label>
              <div class="tp-row2">
                <input type="date" class="tp-input" id="evDate" value="${ev.date||''}">
                <input type="time" class="tp-input tp-time-input" id="evStartTime" value="${ev.startTime||''}" style="display:${ev.allDay?'none':'block'};">
              </div>
            </div>
            <div class="ev-daterange-col">
              <label class="tp-label">Fim</label>
              <div class="tp-row2">
                <input type="date" class="tp-input" id="evEndDate" value="${ev.endDate||ev.date||''}">
                <input type="time" class="tp-input tp-time-input" id="evEndTime" value="${ev.endTime||''}" style="display:${ev.allDay?'none':'block'};">
              </div>
            </div>
          </div>
          <div class="ev-dur-row">
            <button type="button" class="ev-dur" data-dur="30">30 min</button>
            <button type="button" class="ev-dur" data-dur="60">1 h</button>
            <button type="button" class="ev-dur" data-dur="90">1 h 30</button>
            <button type="button" class="ev-dur" data-dur="120">2 h</button>
            <label class="ev-allday" id="evAllDayToggleLabel"><span>Dia todo</span>
              <span class="completed-toggle" style="margin-left:0;"><input type="checkbox" id="evAllDay" ${ev.allDay?'checked':''}><span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span></span>
            </label>
          </div>
        </div>
        <div class="tp-field">
          <label class="tp-label">Recorrência</label>
          <button type="button" class="tp-status-trigger" id="evRecurrenceTrigger">
            <svg class="tp-recurrence-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2a4 4 0 01-4 4H3"/></svg>
            <span class="tp-status-trigger-label" id="evRecurrenceTriggerLabel">${recurrenceSummaryLabel(ev)}</span>
            <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
        <div class="tp-field" style="position:relative;">
          <label class="tp-label">Tarefa vinculada <span>(opcional: traz título, tags e horário)</span></label>
          <button type="button" class="tp-status-trigger" id="evLinkedTaskTrigger">
            <span class="tp-status-trigger-label" id="evLinkedTaskLabel"></span>
            <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="ev-col">
        <div class="ev-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 010 6M18 14c2 .6 3 2.2 3 4"/></svg>Quem</div>
        <div class="tp-field">
          <label class="tp-label">Convidados <span>(separados por vírgula)</span></label>
          <div class="ev-suggest-wrap">
            <input type="text" class="tp-input" id="evAttendees" autocomplete="off" placeholder="nome@empresa.com, outra@empresa.com" value="${escapeHtml((ev.attendees||[]).join(', '))}">
            <div class="ev-suggest" id="evAttendeesSuggest" role="listbox"></div>
          </div>
          <p id="evAttendeesError" style="display:none; font-size:11.5px; color:var(--danger); margin-top:4px;"></p>
          <label class="ev-invite-row" for="evSendInvite">
            <span>
              <span class="ev-invite-title">Enviar convite pelo Outlook</span>
              <span class="ev-invite-desc" id="evInviteDesc"></span>
            </span>
            <span class="completed-toggle" style="margin-left:0;">
              <input type="checkbox" id="evSendInvite" ${(ev.sendInvite || (!isEditing && G.outlookStatusCache && G.outlookStatusCache.connected)) ? 'checked' : ''}>
              <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
            </span>
          </label>
        </div>
        <div class="tp-field">
          <label class="tp-label">Descrição</label>
          <textarea class="tp-textarea" id="evDescription" rows="4" placeholder="Detalhes da agenda...">${escapeHtml(ev.description||'')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${isEditing ? `<button type="button" class="btn ghost small" id="evDeleteBtn" style="margin-right:auto; color:var(--danger); border-color:var(--danger-light);">Excluir</button>` : ''}
      ${isEditing ? `<button type="button" class="btn ghost small" id="evDuplicateBtn" title="Duplicar agenda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>` : ''}
      ${isEditing ? `<button type="button" class="btn ghost small" id="evExportIcsBtn" title="Exportar convite .ics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>Exportar .ics</button>` : ''}
      <button type="button" class="btn small" id="evSaveBtn">${isEditing?'Salvar':'Criar agenda'}</button>
    </div>
  `;

  function renderEvGroupChip(){
    const cat = catById(ev.categoryId);
    const chip = modal.querySelector('#evGroupChip');
    chip.style.background = cat ? cat.color + '22' : 'var(--surface-2)';
    chip.style.color = cat ? cat.color : 'var(--ink-soft)';
    chip.innerHTML = `<span class="cat-swatch" style="background:${cat?cat.color:'var(--ink-faint)'}"></span>${escapeHtml(cat?cat.name:'Sem espaço')}`;
  }
  renderEvGroupChip();
  modal.querySelector('#evMoveGroupBtn').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, ev.categoryId, (newCatId) => {
      ev.categoryId = newCatId;
      ev.tagIds = (ev.tagIds||[]).filter(id => {
        const tg = G.state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === newCatId);
      });
      renderEvGroupChip();
      renderEvTagsSelected();
    });
  };

  function renderEvTagsSelected(){
    const box = modal.querySelector('#evTagsSelected');
    const addBtn = box.querySelector('#evTagsToggleBtn');
    box.querySelectorAll('.tp-tag-chip').forEach(el => el.remove());
    (ev.tagIds||[]).map(id => G.state.tags.find(tg=>tg.id===id)).filter(Boolean).forEach(tg => {
      const chip = document.createElement('span');
      chip.className = 'tp-tag-chip active';
      chip.style.background = tg.color;
      chip.textContent = tg.name;
      chip.title = 'Clique para remover';
      chip.onclick = (e) => {
        e.stopPropagation();
        ev.tagIds = (ev.tagIds||[]).filter(id => id !== tg.id);
        renderEvTagsSelected();
      };
      box.insertBefore(chip, addBtn);
    });
  }
  modal.querySelector('#evTagsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderUnifiedTagPicker(portal, {
      categoryId: ev.categoryId,
      isSelected: (tagId) => (ev.tagIds||[]).includes(tagId),
      onToggle: (tagId) => {
        ev.tagIds = ev.tagIds || [];
        if(ev.tagIds.includes(tagId)) ev.tagIds = ev.tagIds.filter(id => id !== tagId);
        else ev.tagIds.push(tagId);
        renderEvTagsSelected();
      },
      onChanged: () => renderEvTagsSelected()
    });
  };

  // histórico de e-mails: sugere enquanto digita; "×" tira o e-mail do histórico
  (function setupAttendeeSuggest(){
    const input = modal.querySelector('#evAttendees');
    const box = modal.querySelector('#evAttendeesSuggest');
    function tokenInfo(){
      const v = input.value;
      const cut = Math.max(v.lastIndexOf(','), v.lastIndexOf(';'));
      return { head: v.slice(0, cut + 1), token: v.slice(cut + 1).trim() };
    }
    function chosenEmails(){
      return input.value.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    }
    function renderSuggestions(){
      const t = tokenInfo().token.toLowerCase();
      const taken = new Set(chosenEmails());
      const items = (G.state.emailHistory || []).filter(e => !taken.has(e) && (!t || e.includes(t))).slice(0, 8);
      if(!items.length){ box.classList.remove('show'); box.innerHTML = ''; return; }
      box.innerHTML = '<div class="ev-suggest-label">E-mails usados antes</div>' + items.map(e =>
        `<div class="ev-suggest-item" data-email="${escapeHtml(e)}" role="option"><span>${escapeHtml(e)}</span><button type="button" class="ev-suggest-del" data-del="${escapeHtml(e)}" title="Excluir do histórico" aria-label="Excluir ${escapeHtml(e)} do histórico">×</button></div>`).join('');
      box.classList.add('show');
    }
    // mousedown (e não click) para o campo não perder o foco antes da escolha
    box.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const del = e.target.closest('.ev-suggest-del');
      if(del){
        G.state.emailHistory = G.state.emailHistory.filter(x => x !== del.dataset.del);
        persistOnly();
        renderSuggestions();
        return;
      }
      const item = e.target.closest('.ev-suggest-item');
      if(!item) return;
      const { head } = tokenInfo();
      const sep = head && !/\s$/.test(head) ? ' ' : '';
      input.value = head + sep + item.dataset.email + ', ';
      renderSuggestions();
      input.focus();
    });
    input.addEventListener('input', renderSuggestions);
    input.addEventListener('focus', renderSuggestions);
    input.addEventListener('blur', () => { box.classList.remove('show'); });
    input.addEventListener('keydown', (e) => { if(e.key === 'Escape' && box.classList.contains('show')){ e.stopPropagation(); box.classList.remove('show'); } });
  })();

  function refreshInviteDesc(){
    const d = modal.querySelector('#evInviteDesc');
    if(!d) return;
    const connected = !!(G.outlookStatusCache && G.outlookStatusCache.connected);
    d.textContent = connected
      ? 'Ao salvar, o Outlook envia o convite aos convidados e avisa quando a agenda mudar ou for excluída.'
      : 'Conecte o Outlook em Configurações → Integrações para o convite ser enviado.';
  }
  refreshInviteDesc();
  renderEvTagsSelected(); // as tags já existentes passam a poder ser removidas com um clique
  // com o Outlook conectado, agenda nova já vem com "enviar convite" ligado (a menos que a pessoa mexa)
  let inviteTouched = false;
  modal.querySelector('#evSendInvite').addEventListener('change', () => { inviteTouched = true; });
  const applyInviteDefault = () => {
    if(!isEditing && !inviteTouched && G.outlookStatusCache && G.outlookStatusCache.connected){
      const cb = modal.querySelector('#evSendInvite'); if(cb) cb.checked = true;
    }
  };
  if(!G.outlookStatusCache && G.cloudSession) refreshOutlookStatus().then(() => { refreshInviteDesc(); applyInviteDefault(); }).catch(() => {});

  // atalhos de duração: o fim passa a ser início + duração (no mesmo dia)
  function minutesBetweenInputs(){
    const st = modal.querySelector('#evStartTime').value, en = modal.querySelector('#evEndTime').value;
    if(!st || !en || modal.querySelector('#evDate').value !== modal.querySelector('#evEndDate').value) return null;
    return timeToMinutes(en) - timeToMinutes(st);
  }
  function refreshDurChips(){
    const d = minutesBetweenInputs();
    modal.querySelectorAll('.ev-dur').forEach(b => b.classList.toggle('on', d !== null && parseInt(b.dataset.dur, 10) === d));
  }
  modal.querySelectorAll('.ev-dur').forEach(b => {
    b.onclick = () => {
      const st = modal.querySelector('#evStartTime');
      if(!st.value) st.value = nextRoundedHourTimes().start;
      const total = timeToMinutes(st.value) + parseInt(b.dataset.dur, 10);
      const endMin = Math.min(total, 23 * 60 + 59);
      modal.querySelector('#evEndDate').value = modal.querySelector('#evDate').value;
      modal.querySelector('#evEndTime').value = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
      if(ev.allDay){ modal.querySelector('#evAllDay').checked = false; ev.allDay = false; syncTimeFieldsVisibility(); }
      refreshDurChips();
    };
  });
  ['#evDate', '#evEndDate', '#evStartTime', '#evEndTime'].forEach(sel => modal.querySelector(sel).addEventListener('change', refreshDurChips));
  refreshDurChips();
  modal.querySelector('#evCloseX').onclick = () => closeEventComposer();

  function syncTimeFieldsVisibility(){
    const show = !ev.allDay;
    modal.querySelector('#evStartTime').style.display = show ? 'block' : 'none';
    modal.querySelector('#evEndTime').style.display = show ? 'block' : 'none';
  }
  modal.querySelector('#evAllDay').addEventListener('change', e => {
    ev.allDay = e.target.checked;
    syncTimeFieldsVisibility();
  });
  modal.querySelector('#evDate').addEventListener('change', e => {
    modal.querySelector('#evEndDate').value = e.target.value;
  });
  modal.querySelector('#evStartTime').addEventListener('change', e => {
    const endInput = modal.querySelector('#evEndTime');
    if(e.target.value && !endInput.value){
      endInput.value = addOneHourToTime(e.target.value);
    }
  });

  const evRecurrenceTrigger = modal.querySelector('#evRecurrenceTrigger');
  evRecurrenceTrigger.onclick = (e) => {
    e.stopPropagation();
    openRecurrencePortal(evRecurrenceTrigger, ev, () => {
      const freshLabel = document.getElementById('evRecurrenceTriggerLabel');
      if(freshLabel) freshLabel.textContent = recurrenceSummaryLabel(ev);
    });
  };

  function renderEvLinkedTaskLabel(){
    const label = modal.querySelector('#evLinkedTaskLabel');
    if(!label) return;
    const t = ev.linkedTaskId ? G.state.tasks.find(x => x.id === ev.linkedTaskId) : null;
    label.textContent = t ? (t.title||'Sem título') : 'Nenhuma tarefa vinculada';
  }
  renderEvLinkedTaskLabel();

  function reloadFieldsFromEv(){
    modal.querySelector('#evTitle').value = ev.title || '';
    modal.querySelector('#evDate').value = ev.date || '';
    modal.querySelector('#evEndDate').value = ev.endDate || ev.date || '';
    modal.querySelector('#evStartTime').value = ev.startTime || '';
    modal.querySelector('#evEndTime').value = ev.endTime || '';
    modal.querySelector('#evAllDay').checked = !!ev.allDay;
    syncTimeFieldsVisibility();
    renderEvTagsSelected();
  }

  modal.querySelector('#evLinkedTaskTrigger').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderTaskLinkPicker(portal, {
      currentTaskId: ev.linkedTaskId,
      onSelect: (taskId) => {
        // Só sincroniza data/hora da tarefa quando a agenda nasce a partir da tarefa
        // (fluxo prefillTaskId, acima). Vincular uma tarefa a uma agenda já existente
        // aqui no calendário nunca deve sobrescrever a data que o usuário já definiu.
        ev.linkedTaskId = taskId;
        renderEvLinkedTaskLabel();
        reloadFieldsFromEv();
        closeTagsPortal();
      }
    });
  };

  if(isEditing){
    modal.querySelector('#evDeleteBtn').onclick = (e) => {
      e.stopPropagation();
      openConfirmPortal(e.currentTarget, 'Excluir esta agenda?', () => {
        deleteEventFromOutlook(ev);
        G.state.events = G.state.events.filter(x => x.id !== ev.id);
        closeEventComposer();
        markDirty();
      });
    };
    modal.querySelector('#evDuplicateBtn').onclick = (e) => {
      e.stopPropagation();
      const dup = {
        ...ev,
        id: uid('event'),
        title: ev.title ? ev.title + ' (cópia)' : '',
        linkedTaskId: null,
        outlookEventId: null,
        createdAt: Date.now(),
      };
      G.state.events.push(dup);
      markDirty();
      closeEventComposer();
      // Reabre já editando a copia, com a mesma data de origem - o usuario troca a
      // data direto no campo do formulario, que ja abre em foco nesse fluxo de edicao.
      openEventComposer(dup);
    };
    modal.querySelector('#evExportIcsBtn').onclick = (e) => {
      e.stopPropagation();
      downloadEventAsICS(ev);
    };
  }

  modal.querySelector('#evSaveBtn').onclick = () => {
    const rawAttendees = modal.querySelector('#evAttendees').value.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
    const badEmails = rawAttendees.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    const errEl = modal.querySelector('#evAttendeesError');
    if(badEmails.length){
      errEl.textContent = 'E-mail inválido: ' + badEmails.join(', ');
      errEl.style.display = 'block';
      modal.querySelector('#evAttendees').focus();
      return;
    }
    errEl.style.display = 'none';
    ev.attendees = Array.from(new Set(rawAttendees.map(x => x.toLowerCase())));
    // histórico de e-mails: os mais recentes primeiro, sem repetir (até 100)
    G.state.emailHistory = ev.attendees.concat((G.state.emailHistory || []).filter(x => !ev.attendees.includes(x))).slice(0, 100);
    ev.sendInvite = modal.querySelector('#evSendInvite').checked && ev.attendees.length > 0;
    ev.title = modal.querySelector('#evTitle').value.trim();
    ev.date = modal.querySelector('#evDate').value || todayStr();
    ev.endDate = modal.querySelector('#evEndDate').value || ev.date;
    ev.startTime = modal.querySelector('#evStartTime').value || '';
    ev.endTime = modal.querySelector('#evEndTime').value || '';
    ev.description = modal.querySelector('#evDescription').value;
    ev.updatedAt = Date.now();
    ev.wasEdited = isEditing;
    if(ev.recurrence && ev.recurrence !== 'none') ev.recurrenceBaseDate = ev.date;
    let target = ev;
    if(isEditing){
      target = existingEvent;
      Object.keys(target).forEach(k => { if(!(k in ev)) delete target[k]; });
      Object.assign(target, ev);
    } else {
      G.state.events.push(ev);
    }
    closeEventComposer();
    markDirty();
    syncEventToOutlook(target);
  };

  document.getElementById('eventComposerOverlay').classList.add('show');
  setTimeout(() => modal.querySelector('#evTitle').focus(), 0);
}

export function closeEventComposer(){
  document.getElementById('eventComposerOverlay').classList.remove('show');
}

G.eventOverlayMouseDownOnBackdrop = false;
document.getElementById('eventComposerOverlay').addEventListener('mousedown', e => {
  G.eventOverlayMouseDownOnBackdrop = (e.target.id === 'eventComposerOverlay');
});
document.getElementById('eventComposerOverlay').addEventListener('click', e => {
  if(e.target.id === 'eventComposerOverlay' && G.eventOverlayMouseDownOnBackdrop) closeEventComposer();
});

