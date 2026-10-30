import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { escapeHtml, uid } from './10-helpers.js';
import { openRecurrencePortal } from './14-portal-de-recorrencia.js';
import { currentCommentKey, getOrCreateActiveTask, recurrenceSummaryLabel, saveCommentDrafts, toggleSubtaskDone } from './16-painel-lateral-de-tarefa.js';

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
    if(G.tpCommentDrafts[key]) ta.value = G.tpCommentDrafts[key];
    ta.addEventListener('input', () => {
      const k = currentCommentKey();
      if(ta.value) G.tpCommentDrafts[k] = ta.value; else delete G.tpCommentDrafts[k];
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
    delete G.tpCommentDrafts[keyBefore];
    delete G.tpCommentDrafts[t.id];
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
