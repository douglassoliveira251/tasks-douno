function noteSpaceKey(){ return activeCategoryFilter || '_all'; }
let lastRenderedNoteSpaceKey = null;

function closeNotebookMenu(){
  const m = document.getElementById('notebookMenuPopover');
  if(m) m.remove();
}

function renderNotes(){
  const view = document.getElementById('notesView');
  const titleWasFocused = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('note-title');
  const titleCursor = titleWasFocused ? document.activeElement.selectionStart : null;
  view.innerHTML = '';

  const term = searchTerm.trim().toLowerCase();
  function matches(n){
    if(term && !(n.title + stripHtml(n.body)).toLowerCase().includes(term)) return false;
    return true;
  }

  const spaceNotebooks = state.notebooks
    .filter(nb => !activeCategoryFilter || nb.categoryId === activeCategoryFilter)
    .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));

  // se o espaço mudou desde o último render, soltar a nota ativa para restaurar a do novo espaço
  if(lastRenderedNoteSpaceKey !== null && lastRenderedNoteSpaceKey !== noteSpaceKey()){
    if(currentNoteComposerCommit) currentNoteComposerCommit();
    activeNoteId = null;
    creatingNewNote = false;
  }
  lastRenderedNoteSpaceKey = noteSpaceKey();

  // restaurar última nota aberta deste espaço, se ainda não houver nota/edição ativa
  if(!activeNoteId && !creatingNewNote){
    const lastId = state.lastActiveNoteBySpace[noteSpaceKey()];
    if(lastId){
      const n = state.notes.find(x => x.id === lastId && !x.archived && (!activeCategoryFilter || x.categoryId === activeCategoryFilter));
      if(n){ activeNoteId = n.id; if(n.notebookId) expandedNotebookIds.add(n.notebookId); }
    }
  }
  if(activeNoteId) state.lastActiveNoteBySpace[noteSpaceKey()] = activeNoteId;

  const layout = document.createElement('div');
  layout.className = 'notes-layout';

  const notebooksCol = document.createElement('div');
  notebooksCol.className = 'notebooks-col';
  notebooksCol.style.width = (state.notebooksColWidth || 260) + 'px';
  function noteOrderOf(n){ return n.noteOrder!=null ? n.noteOrder : (n.createdAt||0); }
  function notebookGroupHtml(nb){
    const nbNotes = state.notes.filter(n => n.notebookId === nb.id && !n.archived && matches(n))
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
          ${nbNotes.map(n => `<div class="notebook-note-item ${n.id===activeNoteId?'active':''} ${n.pinned?'is-pinned':''}" data-note-id="${n.id}" draggable="true"><button type="button" class="nb-note-pin-btn ${n.pinned?'pinned':''}" data-pin-note-id="${n.id}" title="${n.pinned?'Desafixar':'Fixar'}">${pinIconSvg(n.pinned)}</button><span>${escapeHtml(n.title||'Sem título')}</span></div>`).join('')}
          <button type="button" class="notebook-add-note-btn" data-nb-id="${nb.id}">+ Nova nota</button>
        </div>` : ''}
      </div>
    `;
  }
  let nbHtml = '';
  if(activeCategoryFilter){
    spaceNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
  } else {
    // sem filtro de espaço: agrupar os cadernos por espaço, mantendo a estrutura de cada um separada
    state.categories.forEach(cat => {
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
  notebooksCol.classList.toggle('open', notesDrawerOpen);
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
      state.notebooksColWidth = Math.round(notebooksCol.getBoundingClientRect().width);
      persistOnly();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  const detailCol = document.createElement('div');
  detailCol.className = 'note-detail-col';
  const activeNote = activeNoteId ? state.notes.find(n => n.id === activeNoteId) : null;
  if(activeNote){
    const { element, commit } = buildNoteComposer(activeNote);
    currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
  } else if(creatingNewNote){
    const { element, commit } = buildNoteComposer(null, pendingNotePrefillTaskId, pendingNoteNotebookId);
    currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
    setTimeout(() => { const t = element.querySelector('.note-title'); if(t) t.focus(); }, 0);
  } else {
    currentNoteComposerCommit = null;
    detailCol.innerHTML = `<div class="note-detail-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
      <p>Selecione uma nota na lista de cadernos, ou crie uma nova para começar.</p>
    </div>`;
  }

  // barra do celular: caderno/nota atuais abrem a gaveta de cadernos; botão de modo foco
  const barNotebook = activeNote ? state.notebooks.find(x => x.id === activeNote.notebookId)
    : (creatingNewNote && pendingNoteNotebookId ? state.notebooks.find(x => x.id === pendingNoteNotebookId) : null);
  const barNoteTitle = activeNote ? (activeNote.title || 'Sem título') : (creatingNewNote ? 'Nova nota' : '');
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
  drawerBackdrop.className = 'notes-drawer-backdrop' + (notesDrawerOpen ? ' open' : '');
  function setDrawer(open){
    notesDrawerOpen = open;
    notebooksCol.classList.toggle('open', open);
    drawerBackdrop.classList.toggle('open', open);
  }
  mbar.querySelector('#notesDrawerBtn').onclick = () => setDrawer(!notesDrawerOpen);
  mbar.querySelector('#notesFocusBtn').onclick = () => {
    notesFocusMode = !notesFocusMode;
    document.body.classList.toggle('notes-focus', notesFocusMode);
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
    if(currentNoteComposerCommit) currentNoteComposerCommit();
    activeNoteId = noteId;
    creatingNewNote = false;
    notesDrawerOpen = false;
    state.lastActiveNoteBySpace[noteSpaceKey()] = noteId;
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
      draggedNotebookId = row.dataset.nbId;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      draggedNotebookId = null;
      row.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before','drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if(draggedNoteId){
        e.preventDefault();
        row.classList.add('drag-over');
      } else if(draggedNotebookId && draggedNotebookId !== row.dataset.nbId){
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
      if(draggedNoteId){
        const n = state.notes.find(x => x.id === draggedNoteId);
        const nb = state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!n || !nb || n.notebookId === nb.id) return;
        if(currentNoteComposerCommit) currentNoteComposerCommit();
        n.notebookId = nb.id;
        n.categoryId = nb.categoryId;
        expandedNotebookIds.add(nb.id);
        markDirty();
        renderNotes();
      } else if(draggedNotebookId && draggedNotebookId !== row.dataset.nbId){
        const draggedNb = state.notebooks.find(x => x.id === draggedNotebookId);
        const targetNb = state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!draggedNb || !targetNb || draggedNb.categoryId !== targetNb.categoryId) return;
        const siblingsSorted = state.notebooks.filter(x => x.categoryId === targetNb.categoryId)
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
      draggedNoteId = item.dataset.noteId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      draggedNoteId = null;
      item.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(el => el.classList.remove('drag-over','drop-before','drop-after'));
    });
    item.addEventListener('dragover', (e) => {
      if(!draggedNoteId || draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = item.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < rect.height/2;
      item.classList.toggle('drop-before', isBefore);
      item.classList.toggle('drop-after', !isBefore);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-before','drop-after'));
    item.addEventListener('drop', (e) => {
      if(!draggedNoteId || draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const isBefore = item.classList.contains('drop-before');
      item.classList.remove('drop-before','drop-after');
      const targetNote = state.notes.find(n => n.id === item.dataset.noteId);
      const draggedNote = state.notes.find(n => n.id === draggedNoteId);
      if(!targetNote || !draggedNote) return;
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      draggedNote.notebookId = targetNote.notebookId;
      draggedNote.categoryId = targetNote.categoryId;
      const nbNotesSorted = state.notes.filter(n => n.notebookId === targetNote.notebookId && !n.archived)
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
      const n = state.notes.find(x => x.id === pin.dataset.pinNoteId);
      if(!n) return;
      n.pinned = !n.pinned;
      n.pinnedAt = n.pinned ? Date.now() : null;
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-add-note-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      activeNoteId = null;
      creatingNewNote = true;
      pendingNotePrefillTaskId = null;
      pendingNoteNotebookId = btn.dataset.nbId;
      expandedNotebookIds.add(btn.dataset.nbId);
      notesDrawerOpen = false;
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-menu-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('notebookMenuPopover');
      closeNotebookMenu();
      if(existing && existing.dataset.nbId === btn.dataset.nbId) return;
      const nb = state.notebooks.find(x => x.id === btn.dataset.nbId);
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
          state.notes.forEach(n => { if(n.notebookId === nb.id) n.categoryId = newCatId; });
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
          state.notes.forEach(n => { if(n.notebookId === nb.id) n.notebookId = null; });
          state.notebooks = state.notebooks.filter(x => x.id !== nb.id);
          if(activeNote && activeNote.notebookId === nb.id){ activeNoteId = null; }
          markDirty();
          renderNotes();
        });
      };
    });
  });
  document.getElementById('newNotebookBtn').onclick = () => {
    const catId = activeCategoryFilter || state.categories[0].id;
    const nb = { id: uid('nb'), name: 'Novo caderno', categoryId: catId, createdAt: Date.now() };
    state.notebooks.push(nb);
    expandedNotebookIds.add(nb.id);
    markDirty();
    renderNotes();
  };
}

