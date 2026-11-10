import { markDirty } from './08-persistencia.js';
import { escapeHtml, uid } from './10-helpers.js';
import { openRecurrencePortal } from './14-portal-de-recorrencia.js';
import { currentCommentKey, getOrCreateActiveTask, recurrenceSummaryLabel, saveCommentDrafts, toggleSubtaskDone } from './16-painel-lateral-de-tarefa.js';
import { icon } from './icones.js';
import { gripHtml, makeSortable } from './56-arrastar-ordem.js';
import { PAINEL_TAREFA } from './estado-ui.js';

/* Recorrência e subtarefas. */
export function bindTpRecurrenceAndSubtasks(panel, task){
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
  (task.subtasks||[]).forEach(st => {
    const row = document.createElement('div');
    row.className = 'tp-subtask-row' + (st.done ? ' done' : '');
    row.dataset.id = st.id;
    row.innerHTML = `
      ${st.done ? '<span class="drag-grip-spacer"></span>' : gripHtml('Arrastar para reordenar a subtarefa')}
      <div class="task-check ${st.done?'done':''}">${icon('check')}</div>
      <span class="tp-subtask-title" contenteditable="true" spellcheck="false">${escapeHtml(st.title)}</span>
      <button type="button" class="tp-subtask-del">${icon('trash')}</button>
    `;
    row.querySelector('.task-check').onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      const sub = t.subtasks.find(s => s.id === st.id);
      if(sub){
        toggleSubtaskDone(t, sub);
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
    row.querySelector('.tp-subtask-del').onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.subtasks = t.subtasks.filter(s => s.id !== st.id);
      markDirty();
    };
    subtaskList.appendChild(row);
  });
  /* só as pendentes se arrastam; as concluídas ficam no fim, como estão */
  makeSortable(subtaskList, { rowSel: '.tp-subtask-row', onReorder: ids => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const map = new Map(t.subtasks.filter(x => !x.done).map(x => [x.id, x]));
    let k = 0;
    t.subtasks = t.subtasks.map(x => x.done ? x : (map.get(ids[k++]) || x));
    markDirty();
  } });
  document.getElementById('tpNewSubtask').addEventListener('keydown', e => {
    if(e.key === 'Enter' && e.target.value.trim()){
      const t = getOrCreateActiveTask(); if(!t) return;
      t.subtasks = t.subtasks || [];
      /* A nova entra depois das pendentes e antes das concluídas (que ficam sempre no fim). */
      const firstDone = t.subtasks.findIndex(x => x.done);
      t.subtasks.splice(firstDone < 0 ? t.subtasks.length : firstDone, 0, { id: uid('sub'), title: e.target.value.trim(), done:false });
      markDirty();
    }
  });
}

/* Comentários (com rascunho). */
export function bindTpComments(panel, task){
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
          <button type="button" class="tp-comment-edit" title="Editar">${icon('pencil-simple')}</button>
          <button type="button" class="tp-comment-del" title="Excluir">${icon('trash')}</button>
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
    if(PAINEL_TAREFA.tpCommentDrafts[key]) ta.value = PAINEL_TAREFA.tpCommentDrafts[key];
    ta.addEventListener('input', () => {
      const k = currentCommentKey();
      if(ta.value) PAINEL_TAREFA.tpCommentDrafts[k] = ta.value; else delete PAINEL_TAREFA.tpCommentDrafts[k];
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
    delete PAINEL_TAREFA.tpCommentDrafts[keyBefore];
    delete PAINEL_TAREFA.tpCommentDrafts[t.id];
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
