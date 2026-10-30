import { G } from './globais.js';
import { expandedNotebookIds } from './01-estado.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { pinIconSvg } from './12-render-tasks.js';
import { openConfirmPortal, renderTaskLinkPicker } from './13-portais-de-tarefa.js';
import { closeTagsPortal, ensureTagsPortal, openMoveGroupPortal, openNotebookMovePortal, positionTagsPortalNear } from './15-portais-de-grupo-e-etiquetas.js';
import { buildRichToolbar } from './22-texto-rico.js';
import { attachFormattedPaste, attachTabIndent, openNoteExportMenu } from './23-texto-rico-utilitarios.js';
import { noteSpaceKey, renderNotes } from './29-notas-lista.js';

/* ===================== RENDER: NOTES ===================== */
G.currentNoteComposerCommit = null;

export function buildNoteComposer(existingNote, prefillTaskId, forcedNotebookId){
  const composerSpaceKeyAtOpen = noteSpaceKey();
  const composer = document.createElement('div');
  composer.className = 'composer note-composer-inline';
  const isEditing = !!existingNote;
  const prefillTask = (!isEditing && prefillTaskId) ? G.state.tasks.find(x => x.id === prefillTaskId) : null;
  const defaultCatId = isEditing
    ? existingNote.categoryId
    : (prefillTask ? prefillTask.categoryId : ((G.activeCategoryFilter && catById(G.activeCategoryFilter)) ? G.activeCategoryFilter : G.state.categories[0].id));
  let noteCategoryId = isEditing ? existingNote.categoryId : defaultCatId;
  let noteNotebookId = isEditing ? existingNote.notebookId : forcedNotebookId;

  composer.innerHTML = `
    <div class="note-breadcrumb" id="noteBreadcrumb">
      <button type="button" class="note-breadcrumb-seg" id="noteBreadcrumbSpace"></button>
      <span>›</span>
      <button type="button" class="note-breadcrumb-seg" id="noteBreadcrumbNotebook"></button>
      <span>›</span>
    </div>
    <div class="note-detail-header">
      <input type="text" class="note-title" placeholder="${isEditing?'':'Título da nota'}" value="${isEditing ? escapeHtml(existingNote.title||'') : (prefillTask ? escapeHtml(prefillTask.title||'') : '')}">
      <div class="note-header-actions">
        ${isEditing ? `<button type="button" class="note-header-icon-btn" id="composerDuplicateBtn" title="Duplicar nota"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 16H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>` : ''}
        ${isEditing ? `<button type="button" class="note-header-icon-btn" id="composerPinBtn" title="${existingNote.pinned?'Desafixar':'Fixar'}">${pinIconSvg(existingNote.pinned)}</button>` : ''}
        ${isEditing ? `<button type="button" class="note-header-icon-btn" id="composerExportBtn" title="Exportar nota"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></button>` : ''}
        ${isEditing ? `<button type="button" class="note-header-icon-btn danger" id="composerDeleteBtn" title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>` : ''}
      </div>
    </div>
    <div class="note-toolbar-row" id="noteToolbarRow">
      <div class="rt-toolbar-slot"></div>
      <span class="note-toolbar-sep"></span>
      <div class="note-meta-row">
        <button type="button" class="note-attach-btn" id="composerAttachBtn" title="Anexar imagem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.19 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>
        <input type="file" id="composerAttachInput" accept="image/*" multiple style="display:none;">
        <button type="button" class="note-linked-task-btn" id="noteLinkedTaskBtn" title="Vincular tarefa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span id="noteLinkedTaskLabel">Vincular tarefa</span>
        </button>
      </div>
    </div>
    <div class="note-body-input" contenteditable="true" spellcheck="false" data-placeholder="Escreva uma nota..."></div>
    <div class="note-attach-row" id="composerAttachRow"></div>
    <div class="note-status" id="noteStatus"></div>
  `;
  const bodyInputEl = composer.querySelector('.note-body-input');
  const noteStatusEl = composer.querySelector('#noteStatus');
  function updateNoteStatus(){
    const words = (bodyInputEl.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    noteStatusEl.textContent = 'Salvo automaticamente · ' + words + (words === 1 ? ' palavra' : ' palavras');
  }
  bodyInputEl.addEventListener('input', updateNoteStatus);
  if(isEditing) bodyInputEl.innerHTML = existingNote.body || '';
  updateNoteStatus();
  attachFormattedPaste(bodyInputEl);
  attachTabIndent(bodyInputEl);
  const toolbarEl = buildRichToolbar(bodyInputEl);
  composer.querySelector('.rt-toolbar-slot').replaceWith(toolbarEl);

  let noteLinkedTaskId = isEditing ? (existingNote.linkedTaskId || null) : (prefillTask ? prefillTask.id : null);
  function renderNoteLinkedTaskLabel(){
    const label = composer.querySelector('#noteLinkedTaskLabel');
    if(!label) return;
    const t = noteLinkedTaskId ? G.state.tasks.find(x => x.id === noteLinkedTaskId) : null;
    label.textContent = t ? (t.title||'Sem título') : 'Vincular tarefa';
    const btn = composer.querySelector('#noteLinkedTaskBtn');
    if(btn) btn.classList.toggle('linked', !!t);
  }
  composer.querySelector('#noteLinkedTaskBtn').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderTaskLinkPicker(portal, {
      currentTaskId: noteLinkedTaskId,
      onSelect: (taskId) => {
        noteLinkedTaskId = taskId;
        renderNoteLinkedTaskLabel();
        closeTagsPortal();
      }
    });
  };
  renderNoteLinkedTaskLabel();

  function renderNoteGroupChip(){
    const cat = catById(noteCategoryId);
    const nb = noteNotebookId ? G.state.notebooks.find(x => x.id === noteNotebookId) : null;
    const spaceSeg = composer.querySelector('#noteBreadcrumbSpace');
    const notebookSeg = composer.querySelector('#noteBreadcrumbNotebook');
    if(spaceSeg) spaceSeg.textContent = cat ? cat.name : 'Sem espaço';
    if(notebookSeg) notebookSeg.textContent = nb && nb.name ? nb.name : 'Notas';
  }
  renderNoteGroupChip();
  composer.querySelector('#noteBreadcrumbSpace').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, noteCategoryId, (newCatId) => {
      noteCategoryId = newCatId;
      let nb = G.state.notebooks.find(x => x.categoryId === newCatId);
      if(!nb){
        nb = { id: uid('nb'), name: 'Notas', categoryId: newCatId, createdAt: Date.now() };
        G.state.notebooks.push(nb);
      }
      noteNotebookId = nb.id;
      expandedNotebookIds.add(nb.id);
      renderNoteGroupChip();
    });
  };
  composer.querySelector('#noteBreadcrumbNotebook').onclick = (e) => {
    e.stopPropagation();
    openNotebookMovePortal(e.currentTarget, noteCategoryId, noteNotebookId, (newNbId) => {
      noteNotebookId = newNbId;
      expandedNotebookIds.add(newNbId);
      renderNoteGroupChip();
    });
  };

  let attachments = isEditing ? (existingNote.attachments || []).slice() : [];
  function renderComposerAttachments(){
    const row = composer.querySelector('#composerAttachRow');
    row.innerHTML = '';
    attachments.forEach(att => {
      const thumb = document.createElement('div');
      thumb.className = 'note-attach-thumb';
      thumb.innerHTML = `<img src="${att.dataUrl}" alt=""><button type="button" class="note-attach-del">×</button>`;
      thumb.querySelector('img').onclick = () => window.open(att.dataUrl, '_blank');
      thumb.querySelector('.note-attach-del').onclick = () => {
        attachments = attachments.filter(a => a.id !== att.id);
        renderComposerAttachments();
      };
      row.appendChild(thumb);
    });
  }
  renderComposerAttachments();
  composer.querySelector('#composerAttachBtn').onclick = () => composer.querySelector('#composerAttachInput').click();
  composer.querySelector('#composerAttachInput').addEventListener('change', e => {
    Array.from(e.target.files||[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        attachments.push({ id: uid('att'), name: file.name, dataUrl: ev.target.result });
        renderComposerAttachments();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  let deleted = false;
  if(isEditing){
    composer.querySelector('#composerDuplicateBtn').onclick = (e) => {
      e.stopPropagation();
      commit();
      const dup = {
        ...existingNote,
        id: uid('note'),
        title: existingNote.title ? existingNote.title + ' (cópia)' : '',
        pinned: false,
        pinnedAt: null,
        attachments: (existingNote.attachments || []).map(a => ({ ...a, id: uid('att') })),
        tagIds: (existingNote.tagIds || []).slice(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      delete dup.noteOrder;
      G.state.notes.unshift(dup);
      G.activeNoteId = dup.id;
      G.creatingNewNote = false;
      G.state.lastActiveNoteBySpace[noteSpaceKey()] = dup.id;
      markDirty();
      if(G.currentView === 'notes') renderNotes();
    };
    const pinBtn = composer.querySelector('#composerPinBtn');
    pinBtn.onclick = (e) => {
      e.stopPropagation();
      existingNote.pinned = !existingNote.pinned;
      existingNote.pinnedAt = existingNote.pinned ? Date.now() : null;
      pinBtn.classList.toggle('active', existingNote.pinned);
      pinBtn.title = existingNote.pinned ? 'Desafixar' : 'Fixar';
      pinBtn.innerHTML = pinIconSvg(existingNote.pinned);
      markDirty();
    };
    composer.querySelector('#composerExportBtn').onclick = (e) => {
      e.stopPropagation();
      commit();
      openNoteExportMenu(e.currentTarget, existingNote);
    };
    composer.querySelector('#composerDeleteBtn').onclick = (e) => {
      e.stopPropagation();
      openConfirmPortal(e.currentTarget, 'Excluir esta nota?', () => {
        G.state.notes = G.state.notes.filter(x => x.id !== existingNote.id);
        deleted = true;
        G.currentNoteComposerCommit = null;
        if(G.activeNoteId === existingNote.id){ G.activeNoteId = null; G.creatingNewNote = false; }
        markDirty();
        if(G.currentView === 'notes') renderNotes();
      });
    };
  }

  const bodyInput = composer.querySelector('.note-body-input');

  let createdNoteRef = null;
  function commit(){
    if(deleted) return;
    const title = composer.querySelector('.note-title').value.trim();
    const body = bodyInput.innerHTML;
    if(!title && !bodyInput.textContent.trim() && attachments.length === 0) return;
    const categoryId = noteCategoryId;
    const targetNote = isEditing ? existingNote : createdNoteRef;
    if(targetNote){
      targetNote.title = title;
      targetNote.body = body;
      targetNote.categoryId = categoryId;
      targetNote.notebookId = noteNotebookId;
      targetNote.attachments = attachments;
      targetNote.linkedTaskId = noteLinkedTaskId;
      targetNote.updatedAt = Date.now();
    } else {
      const newNote = {
        id: uid('note'), title, body,
        categoryId, notebookId: noteNotebookId,
        pinned:false, archived:false,
        attachments,
        tagIds: [],
        linkedTaskId: noteLinkedTaskId,
        createdAt: Date.now(), updatedAt: Date.now()
      };
      G.state.notes.unshift(newNote);
      createdNoteRef = newNote;
      G.activeNoteId = newNote.id;
      G.creatingNewNote = false;
    }
    G.state.lastActiveNoteBySpace[composerSpaceKeyAtOpen] = targetNote ? targetNote.id : createdNoteRef.id;
    persistOnly();
  }
  const titleInputEl = composer.querySelector('.note-title');
  let titleLiveTimer = null;
  titleInputEl.addEventListener('blur', () => { clearTimeout(titleLiveTimer); commit(); });
  titleInputEl.addEventListener('input', () => {
    clearTimeout(titleLiveTimer);
    titleLiveTimer = setTimeout(() => {
      commit();
      if(G.currentView === 'notes') renderNotes();
    }, 500);
  });
  /* O corpo (contenteditable) so salvava no blur - se o usuario digitasse e saisse
     da tela sem clicar fora da nota antes (ex: trocar de aba, dar refresh), a edicao
     nunca era commitada. Agora tambem salva sozinho apos alguns segundos sem digitar. */
  let bodyLiveTimer = null;
  bodyInput.addEventListener('blur', () => { clearTimeout(bodyLiveTimer); commit(); });
  bodyInput.addEventListener('input', () => {
    clearTimeout(bodyLiveTimer);
    bodyLiveTimer = setTimeout(commit, 3000);
  });

  return { element: composer, commit };
}

export function openNoteComposer(existingNote, prefillTaskId){
  if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
  if(existingNote){
    G.activeNoteId = existingNote.id;
    G.creatingNewNote = false;
    G.pendingNotePrefillTaskId = null;
    G.pendingNoteNotebookId = null;
    if(existingNote.notebookId) expandedNotebookIds.add(existingNote.notebookId);
  } else {
    // caderno de destino, em ordem de preferência: nota atualmente aberta > caderno
    // selecionado (expandido mais recentemente) no espaço > primeiro caderno do espaço
    const previousActiveNote = G.activeNoteId ? G.state.notes.find(x => x.id === G.activeNoteId) : null;
    G.activeNoteId = null;
    G.creatingNewNote = true;
    G.pendingNotePrefillTaskId = prefillTaskId || null;
    const prefillTask = prefillTaskId ? G.state.tasks.find(x => x.id === prefillTaskId) : null;
    const catId = prefillTask ? prefillTask.categoryId : (previousActiveNote ? previousActiveNote.categoryId : (G.activeCategoryFilter || G.state.categories[0].id));
    let nb = null;
    if(prefillTask){
      nb = G.state.notebooks.find(x => x.categoryId === catId);
    } else if(previousActiveNote && previousActiveNote.notebookId){
      nb = G.state.notebooks.find(x => x.id === previousActiveNote.notebookId);
    }
    if(!nb){
      const expandedInSpace = G.state.notebooks.filter(x => x.categoryId === catId && expandedNotebookIds.has(x.id));
      nb = expandedInSpace[expandedInSpace.length-1] || G.state.notebooks.find(x => x.categoryId === catId);
    }
    if(!nb){
      nb = { id: uid('nb'), name: 'Notas', categoryId: catId, createdAt: Date.now() };
      G.state.notebooks.push(nb);
    }
    G.pendingNoteNotebookId = nb.id;
    expandedNotebookIds.add(nb.id);
  }
  if(G.currentView === 'notes') renderNotes();
}

export function closeNoteComposer(){
  if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
}
export function hideNoteComposerOverlay(){
  closeNoteComposer();
}

