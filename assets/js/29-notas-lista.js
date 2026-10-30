import { G } from './globais.js';
import { expandedNotebookIds } from './01-estado.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { escapeHtml, uid } from './10-helpers.js';
import { pinIconSvg } from './12-render-tasks.js';
import { openConfirmPortal } from './13-portais-de-tarefa.js';
import { openMoveGroupPortal } from './15-portais-de-grupo-e-etiquetas.js';
import { stripHtml } from './23-texto-rico-utilitarios.js';
import { buildNoteComposer } from './24-render-notes.js';

export function noteSpaceKey(){ return G.activeCategoryFilter || '_all'; }
G.lastRenderedNoteSpaceKey = null;

export function closeNotebookMenu(){
  const m = document.getElementById('notebookMenuPopover');
  if(m) m.remove();
}

export function renderNotes(){
  const view = document.getElementById('notesView');
  const titleWasFocused = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('note-title');
  const titleCursor = titleWasFocused ? document.activeElement.selectionStart : null;
  view.innerHTML = '';

  const term = G.searchTerm.trim().toLowerCase();
  function matches(n){
    if(term && !(n.title + stripHtml(n.body)).toLowerCase().includes(term)) return false;
    return true;
  }

  const spaceNotebooks = G.state.notebooks
    .filter(nb => !G.activeCategoryFilter || nb.categoryId === G.activeCategoryFilter)
    .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));

  // se o espaço mudou desde o último render, soltar a nota ativa para restaurar a do novo espaço
  if(G.lastRenderedNoteSpaceKey !== null && G.lastRenderedNoteSpaceKey !== noteSpaceKey()){
    if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
    G.activeNoteId = null;
    G.creatingNewNote = false;
  }
  G.lastRenderedNoteSpaceKey = noteSpaceKey();

  // restaurar última nota aberta deste espaço, se ainda não houver nota/edição ativa
  if(!G.activeNoteId && !G.creatingNewNote){
    const lastId = G.state.lastActiveNoteBySpace[noteSpaceKey()];
    if(lastId){
      const n = G.state.notes.find(x => x.id === lastId && !x.archived && (!G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter));
      if(n){ G.activeNoteId = n.id; if(n.notebookId) expandedNotebookIds.add(n.notebookId); }
    }
  }
  if(G.activeNoteId) G.state.lastActiveNoteBySpace[noteSpaceKey()] = G.activeNoteId;

  const layout = document.createElement('div');
  layout.className = 'notes-layout';

  const notebooksCol = document.createElement('div');
  notebooksCol.className = 'notebooks-col';
  notebooksCol.style.width = (G.state.notebooksColWidth || 260) + 'px';
  function noteOrderOf(n){ return n.noteOrder!=null ? n.noteOrder : (n.createdAt||0); }
  function notebookGroupHtml(nb){
    const nbNotes = G.state.notes.filter(n => n.notebookId === nb.id && !n.archived && matches(n))
      .sort((a,b) => (b.pinned - a.pinned) || (noteOrderOf(a) - noteOrderOf(b)));
    const expanded = expandedNotebookIds.has(nb.id);
    return `
      <div class="notebook-group">
        <div class="notebook-row" data-nb-id="${nb.id}" draggable="true">
          <svg class="notebook-chevron ${expanded?'expanded':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          <svg class="notebook-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span class="notebook-name">${escapeHtml(nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome')}</span>
          <span class="notebook-count">${nbNotes.length}</span>
          <button type="button" class="notebook-menu-btn" data-nb-id="${nb.id}" title="Opções"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg></button>
        </div>
        ${expanded ? `
        <div class="notebook-notes" data-nb-id="${nb.id}">
          ${nbNotes.map(n => `<div class="notebook-note-item ${n.id===G.activeNoteId?'active':''} ${n.pinned?'is-pinned':''}" data-note-id="${n.id}" draggable="true"><button type="button" class="nb-note-pin-btn ${n.pinned?'pinned':''}" data-pin-note-id="${n.id}" title="${n.pinned?'Desafixar':'Fixar'}">${pinIconSvg(n.pinned)}</button><span>${escapeHtml(n.title||'Sem título')}</span></div>`).join('')}
          <button type="button" class="notebook-add-note-btn" data-nb-id="${nb.id}">+ Nova nota</button>
        </div>` : ''}
      </div>
    `;
  }
  let nbHtml = '';
  if(G.activeCategoryFilter){
    spaceNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
  } else {
    // sem filtro de espaço: agrupar os cadernos por espaço, mantendo a estrutura de cada um separada
    G.state.categories.forEach(cat => {
      const catNotebooks = spaceNotebooks.filter(nb => nb.categoryId === cat.id);
      if(catNotebooks.length === 0) return;
      nbHtml += `<div class="notebooks-space-header"><span class="cat-swatch" style="background:${cat.color}"></span>${escapeHtml(cat.name)}</div>`;
      catNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
    });
  }
  notebooksCol.innerHTML = `
    <div class="notebooks-col-header-row">
      <div class="notebooks-col-header">Cadernos</div>
      <button type="button" class="notebook-new-btn-top" id="newNotebookBtn" title="Novo caderno">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button type="button" class="notebooks-col-close" id="notebooksColCloseBtn" title="Fechar" aria-label="Fechar cadernos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="notebooks-list">${nbHtml}</div>
    <div class="notebooks-col-resize-handle" id="notebooksColResizeHandle" title="Arrastar para redimensionar"></div>
  `;
  notebooksCol.classList.toggle('open', G.notesDrawerOpen);
  const resizeHandle = notebooksCol.querySelector('#notebooksColResizeHandle');
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = notebooksCol.getBoundingClientRect().width;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    function onMove(e2){
      const newWidth = Math.min(480, Math.max(200, startWidth + (e2.clientX - startX)));
      notebooksCol.style.width = newWidth + 'px';
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      G.state.notebooksColWidth = Math.round(notebooksCol.getBoundingClientRect().width);
      persistOnly();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  const detailCol = document.createElement('div');
  detailCol.className = 'note-detail-col';
  const activeNote = G.activeNoteId ? G.state.notes.find(n => n.id === G.activeNoteId) : null;
  if(activeNote){
    const { element, commit } = buildNoteComposer(activeNote);
    G.currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
  } else if(G.creatingNewNote){
    const { element, commit } = buildNoteComposer(null, G.pendingNotePrefillTaskId, G.pendingNoteNotebookId);
    G.currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
    setTimeout(() => { const t = element.querySelector('.note-title'); if(t) t.focus(); }, 0);
  } else {
    G.currentNoteComposerCommit = null;
    detailCol.innerHTML = `<div class="note-detail-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
      <p>Selecione uma nota na lista de cadernos, ou crie uma nova para começar.</p>
    </div>`;
  }

  // barra do celular: caderno/nota atuais abrem a gaveta de cadernos; botão de modo foco
  const barNotebook = activeNote ? G.state.notebooks.find(x => x.id === activeNote.notebookId)
    : (G.creatingNewNote && G.pendingNoteNotebookId ? G.state.notebooks.find(x => x.id === G.pendingNoteNotebookId) : null);
  const barNoteTitle = activeNote ? (activeNote.title || 'Sem título') : (G.creatingNewNote ? 'Nova nota' : '');
  const mbar = document.createElement('div');
  mbar.className = 'notes-mbar';
  mbar.innerHTML = `
    <button type="button" class="notes-mbar-pill" id="notesDrawerBtn" aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      <span class="mb-text">${escapeHtml(barNotebook ? (barNotebook.name && barNotebook.name.trim() ? barNotebook.name : 'Caderno sem nome') : 'Cadernos')}${barNoteTitle ? ` <span class="mb-note">› ${escapeHtml(barNoteTitle)}</span>` : ''}</span>
      <svg class="mb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <button type="button" class="notes-mbar-focus" id="notesFocusBtn" title="Modo foco" aria-label="Modo foco">
      <svg class="ico-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
      <svg class="ico-collapse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
    </button>`;
  const drawerBackdrop = document.createElement('div');
  drawerBackdrop.className = 'notes-drawer-backdrop' + (G.notesDrawerOpen ? ' open' : '');
  function setDrawer(open){
    G.notesDrawerOpen = open;
    notebooksCol.classList.toggle('open', open);
    drawerBackdrop.classList.toggle('open', open);
  }
  mbar.querySelector('#notesDrawerBtn').onclick = () => setDrawer(!G.notesDrawerOpen);
  mbar.querySelector('#notesFocusBtn').onclick = () => {
    G.notesFocusMode = !G.notesFocusMode;
    document.body.classList.toggle('notes-focus', G.notesFocusMode);
  };
  drawerBackdrop.onclick = () => setDrawer(false);
  notebooksCol.querySelector('#notebooksColCloseBtn').onclick = () => setDrawer(false);

  layout.appendChild(mbar);
  layout.appendChild(notebooksCol);
  layout.appendChild(drawerBackdrop);
  layout.appendChild(detailCol);
  view.appendChild(layout);
  if(titleWasFocused){
    const newTitle = detailCol.querySelector('.note-title');
    if(newTitle){
      newTitle.focus();
      if(titleCursor != null) newTitle.setSelectionRange(titleCursor, titleCursor);
    }
  }

  function selectNote(noteId){
    if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
    G.activeNoteId = noteId;
    G.creatingNewNote = false;
    G.notesDrawerOpen = false;
    G.state.lastActiveNoteBySpace[noteSpaceKey()] = noteId;
    markDirty();
    renderNotes();
  }

  notebooksCol.querySelectorAll('.notebook-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if(e.target.closest('.notebook-menu-btn')) return;
      const id = row.dataset.nbId;
      if(expandedNotebookIds.has(id)) expandedNotebookIds.delete(id);
      else expandedNotebookIds.add(id);
      renderNotes();
    });
    row.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      G.draggedNotebookId = row.dataset.nbId;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      G.draggedNotebookId = null;
      row.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before','drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if(G.draggedNoteId){
        e.preventDefault();
        row.classList.add('drag-over');
      } else if(G.draggedNotebookId && G.draggedNotebookId !== row.dataset.nbId){
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const isBefore = (e.clientY - rect.top) < rect.height/2;
        row.classList.toggle('drop-before', isBefore);
        row.classList.toggle('drop-after', !isBefore);
      }
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over','drop-before','drop-after'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const isBefore = row.classList.contains('drop-before');
      row.classList.remove('drag-over','drop-before','drop-after');
      if(G.draggedNoteId){
        const n = G.state.notes.find(x => x.id === G.draggedNoteId);
        const nb = G.state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!n || !nb || n.notebookId === nb.id) return;
        if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
        n.notebookId = nb.id;
        n.categoryId = nb.categoryId;
        expandedNotebookIds.add(nb.id);
        markDirty();
        renderNotes();
      } else if(G.draggedNotebookId && G.draggedNotebookId !== row.dataset.nbId){
        const draggedNb = G.state.notebooks.find(x => x.id === G.draggedNotebookId);
        const targetNb = G.state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!draggedNb || !targetNb || draggedNb.categoryId !== targetNb.categoryId) return;
        const siblingsSorted = G.state.notebooks.filter(x => x.categoryId === targetNb.categoryId)
          .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));
        const withoutDragged = siblingsSorted.filter(x => x.id !== draggedNb.id);
        let idx = withoutDragged.findIndex(x => x.id === targetNb.id);
        if(idx < 0) idx = withoutDragged.length;
        if(!isBefore) idx += 1;
        withoutDragged.splice(idx, 0, draggedNb);
        withoutDragged.forEach((x,i) => { x.notebookOrder = i; });
        markDirty();
        renderNotes();
      }
    });
  });
  notebooksCol.querySelectorAll('.notebook-note-item[data-note-id]').forEach(item => {
    item.addEventListener('click', () => selectNote(item.dataset.noteId));
    item.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      G.draggedNoteId = item.dataset.noteId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      G.draggedNoteId = null;
      item.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(el => el.classList.remove('drag-over','drop-before','drop-after'));
    });
    item.addEventListener('dragover', (e) => {
      if(!G.draggedNoteId || G.draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = item.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < rect.height/2;
      item.classList.toggle('drop-before', isBefore);
      item.classList.toggle('drop-after', !isBefore);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-before','drop-after'));
    item.addEventListener('drop', (e) => {
      if(!G.draggedNoteId || G.draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const isBefore = item.classList.contains('drop-before');
      item.classList.remove('drop-before','drop-after');
      const targetNote = G.state.notes.find(n => n.id === item.dataset.noteId);
      const draggedNote = G.state.notes.find(n => n.id === G.draggedNoteId);
      if(!targetNote || !draggedNote) return;
      if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
      draggedNote.notebookId = targetNote.notebookId;
      draggedNote.categoryId = targetNote.categoryId;
      const nbNotesSorted = G.state.notes.filter(n => n.notebookId === targetNote.notebookId && !n.archived)
        .sort((a,b) => (b.pinned - a.pinned) || (noteOrderOf(a) - noteOrderOf(b)));
      const withoutDragged = nbNotesSorted.filter(n => n.id !== draggedNote.id);
      let idx = withoutDragged.findIndex(n => n.id === targetNote.id);
      if(idx < 0) idx = withoutDragged.length;
      if(!isBefore) idx += 1;
      withoutDragged.splice(idx, 0, draggedNote);
      withoutDragged.forEach((n,i) => { n.noteOrder = i; });
      expandedNotebookIds.add(targetNote.notebookId);
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.nb-note-pin-btn[data-pin-note-id]').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = G.state.notes.find(x => x.id === pin.dataset.pinNoteId);
      if(!n) return;
      n.pinned = !n.pinned;
      n.pinnedAt = n.pinned ? Date.now() : null;
      if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-add-note-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(G.currentNoteComposerCommit) G.currentNoteComposerCommit();
      G.activeNoteId = null;
      G.creatingNewNote = true;
      G.pendingNotePrefillTaskId = null;
      G.pendingNoteNotebookId = btn.dataset.nbId;
      expandedNotebookIds.add(btn.dataset.nbId);
      G.notesDrawerOpen = false;
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-menu-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('notebookMenuPopover');
      closeNotebookMenu();
      if(existing && existing.dataset.nbId === btn.dataset.nbId) return;
      const nb = G.state.notebooks.find(x => x.id === btn.dataset.nbId);
      if(!nb) return;
      const pop = document.createElement('div');
      pop.id = 'notebookMenuPopover';
      pop.className = 'task-menu-portal show';
      pop.dataset.nbId = nb.id;
      pop.innerHTML = `
        <button type="button" class="task-menu-item" data-act="rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Renomear</button>
        <button type="button" class="task-menu-item" data-act="move-space"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>Mover de Espaço</button>
        <button type="button" class="task-menu-item danger" data-act="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir caderno</button>
      `;
      document.body.appendChild(pop);
      const r = btn.getBoundingClientRect();
      pop.style.left = Math.min(r.left, window.innerWidth - 190) + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      pop.onclick = e2 => e2.stopPropagation();
      pop.querySelector('[data-act=move-space]').onclick = (e2) => {
        openMoveGroupPortal(e2.currentTarget, nb.categoryId, (newCatId) => {
          nb.categoryId = newCatId;
          G.state.notes.forEach(n => { if(n.notebookId === nb.id) n.categoryId = newCatId; });
          closeNotebookMenu();
          markDirty();
          renderNotes();
        });
      };
      pop.querySelector('[data-act=rename]').onclick = () => {
        closeNotebookMenu();
        const row = notebooksCol.querySelector(`.notebook-row[data-nb-id="${nb.id}"] .notebook-name`);
        if(!row) return;
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'notebook-rename-input'; input.value = nb.name;
        row.replaceWith(input);
        input.focus(); input.select();
        const finish = () => {
          const v = input.value.trim();
          if(v) nb.name = v;
          markDirty();
          renderNotes();
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', e2 => { if(e2.key==='Enter') input.blur(); if(e2.key==='Escape'){ input.value = nb.name; input.blur(); } });
        input.addEventListener('click', e2 => e2.stopPropagation());
      };
      pop.querySelector('[data-act=delete]').onclick = () => {
        closeNotebookMenu();
        openConfirmPortal(btn, `Excluir o caderno "${nb.name}"? As notas dele ficarão sem caderno.`, () => {
          G.state.notes.forEach(n => { if(n.notebookId === nb.id) n.notebookId = null; });
          G.state.notebooks = G.state.notebooks.filter(x => x.id !== nb.id);
          if(activeNote && activeNote.notebookId === nb.id){ G.activeNoteId = null; }
          markDirty();
          renderNotes();
        });
      };
    });
  });
  document.getElementById('newNotebookBtn').onclick = () => {
    const catId = G.activeCategoryFilter || G.state.categories[0].id;
    const nb = { id: uid('nb'), name: 'Novo caderno', categoryId: catId, createdAt: Date.now() };
    G.state.notebooks.push(nb);
    expandedNotebookIds.add(nb.id);
    markDirty();
    renderNotes();
  };
}

