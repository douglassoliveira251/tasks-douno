import { G } from './globais.js';
import { expandedNotebookIds } from './01-estado.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { escapeHtml, fold, uid } from './10-helpers.js';
import { pinIconSvg } from './12-render-tasks.js';
import { openConfirmPortal } from './13-portais-de-tarefa.js';
import { openMoveGroupPortal } from './15-portais-de-grupo-e-etiquetas.js';
import { stripHtml } from './23-texto-rico-utilitarios.js';
import { buildNoteComposer } from './24-render-notes.js';
import { icon } from './icones.js';
import { NOTAS_UI } from './estado-ui.js';
import { selectSpace } from './11-render-sidebar.js';

export function noteSpaceKey(){ return G.activeCategoryFilter || '_all'; }
let lastRenderedNoteSpaceKey = null;

export function closeNotebookMenu(){
  const m = document.getElementById('notebookMenuPopover');
  if(m) m.remove();
}

export function renderNotes(){
  const view = document.getElementById('notesView');
  const titleWasFocused = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('note-title');
  const titleCursor = titleWasFocused ? document.activeElement.selectionStart : null;
  view.innerHTML = '';

  const term = fold(G.searchTerm.trim());
  function matches(n){
    if(term && !fold(n.title + stripHtml(n.body)).includes(term)) return false;
    return true;
  }

  const spaceNotebooks = G.state.notebooks
    .filter(nb => !G.activeCategoryFilter || nb.categoryId === G.activeCategoryFilter)
    .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));

  // se o espaço mudou desde o último render, soltar a nota ativa para restaurar a do novo espaço
  if(lastRenderedNoteSpaceKey !== null && lastRenderedNoteSpaceKey !== noteSpaceKey()){
    if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
    G.activeNoteId = null;
    NOTAS_UI.creatingNewNote = false;
  }
  lastRenderedNoteSpaceKey = noteSpaceKey();

  // restaurar última nota aberta deste espaço, se ainda não houver nota/edição ativa
  if(!G.activeNoteId && !NOTAS_UI.creatingNewNote){
    const lastId = G.state.lastActiveNoteBySpace[noteSpaceKey()];
    if(lastId){
      const n = G.state.notes.find(x => x.id === lastId && !x.archived && (!G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter));
      if(n){ G.activeNoteId = n.id; if(n.notebookId) expandedNotebookIds.add(n.notebookId); }
    }
  }
  if(G.activeNoteId) G.state.lastActiveNoteBySpace[noteSpaceKey()] = G.activeNoteId;

  if(NOTAS_UI.notebookFilter !== 'all' && !spaceNotebooks.some(nb => nb.id === NOTAS_UI.notebookFilter)) NOTAS_UI.notebookFilter = 'all';
  const layout = document.createElement('div');
  layout.className = 'notes-layout';

  const notebooksCol = document.createElement('div');
  notebooksCol.className = 'notebooks-col';
  const desktop = window.matchMedia('(min-width:1100px)').matches; // no computador largo: cadernos | lista de notas | editor
  notebooksCol.style.width = (desktop ? Math.max(G.state.notebooksColWidth || 270, 240) : (G.state.notebooksColWidth || 260)) + 'px';
  function noteOrderOf(n){ return n.noteOrder!=null ? n.noteOrder : (n.createdAt||0); }
  function notebookGroupHtml(nb){
    const nbNotes = G.state.notes.filter(n => n.notebookId === nb.id && !n.archived && matches(n))
      .sort((a,b) => (b.pinned - a.pinned) || (noteOrderOf(a) - noteOrderOf(b)));
    const expanded = expandedNotebookIds.has(nb.id);
    return `
      <div class="notebook-group">
        <div class="notebook-row${desktop && NOTAS_UI.notebookFilter === nb.id ? ' on' : ''}" data-nb-id="${nb.id}" draggable="true">
          ${icon('caret-right', 'regular', ' class="notebook-chevron ${expanded?\'expanded\':\'\'}"')}
          ${icon('book', 'regular', ' class="notebook-icon"')}
          <span class="notebook-name">${escapeHtml(nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome')}</span>
          <span class="notebook-count">${nbNotes.length}</span>
          <button type="button" class="notebook-menu-btn" data-nb-id="${nb.id}" title="Opções">${icon('dots-three-vertical')}</button>
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
      if(G.state.categories.filter(c => spaceNotebooks.some(nb => nb.categoryId === c.id)).length > 1) nbHtml += `<div class="notebooks-space-header"><span class="cat-swatch" style="background:${cat.color}"></span>${escapeHtml(cat.name)}</div>`;
      catNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
    });
  }
  notebooksCol.innerHTML = `
    <div class="notebooks-col-header-row">
      <div class="notebooks-col-header">Cadernos</div>
      <button type="button" class="notebook-new-btn-top" id="newNotebookBtn" title="Novo caderno">
        ${icon('plus')}
      </button>
      <button type="button" class="notebooks-col-close" id="notebooksColCloseBtn" title="Fechar" aria-label="Fechar cadernos">
        ${icon('x')}
      </button>
    </div>
    <div class="notebooks-list">${desktop ? `<div class="notebook-row nb-all-row${NOTAS_UI.notebookFilter === 'all' ? ' on' : ''}" id="nbAllRow">${icon('note')}<span class="notebook-name">Todas as notas</span><span class="notebook-count">${G.state.notes.filter(n => !n.archived && (!G.activeCategoryFilter || n.categoryId === G.activeCategoryFilter) && matches(n)).length}</span></div>` : ''}${nbHtml}${desktop ? `<button type="button" class="notebook-row nb-new-row" id="newNotebookRow">${icon('plus')}<span class="notebook-name">Novo caderno</span></button>` : ''}</div>
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
    NOTAS_UI.currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
  } else if(NOTAS_UI.creatingNewNote){
    const { element, commit } = buildNoteComposer(null, NOTAS_UI.pendingNotePrefillTaskId, NOTAS_UI.pendingNoteNotebookId);
    NOTAS_UI.currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
    setTimeout(() => { const t = element.querySelector('.note-title'); if(t) t.focus(); }, 0);
  } else {
    NOTAS_UI.currentNoteComposerCommit = null;
    detailCol.innerHTML = `<div class="note-detail-empty">
      ${icon('file-text')}
      <p>Selecione uma nota na lista de cadernos, ou crie uma nova para começar.</p>
    </div>`;
  }

  // barra do celular: caderno/nota atuais abrem a gaveta de cadernos; botão de modo foco
  const barNotebook = activeNote ? G.state.notebooks.find(x => x.id === activeNote.notebookId)
    : (NOTAS_UI.creatingNewNote && NOTAS_UI.pendingNoteNotebookId ? G.state.notebooks.find(x => x.id === NOTAS_UI.pendingNoteNotebookId) : null);
  const barNoteTitle = activeNote ? (activeNote.title || 'Sem título') : (NOTAS_UI.creatingNewNote ? 'Nova nota' : '');
  const mbar = document.createElement('div');
  mbar.className = 'notes-mbar';
  mbar.innerHTML = `
    <button type="button" class="notes-mbar-pill" id="notesDrawerBtn" aria-haspopup="dialog">
      ${icon('book')}
      <span class="mb-text">${escapeHtml(barNotebook ? (barNotebook.name && barNotebook.name.trim() ? barNotebook.name : 'Caderno sem nome') : 'Cadernos')}${barNoteTitle ? ` <span class="mb-note">› ${escapeHtml(barNoteTitle)}</span>` : ''}</span>
      ${icon('caret-down', 'regular', ' class="mb-chev"')}
    </button>
    <button type="button" class="notes-mbar-focus" id="notesFocusBtn" title="Modo foco" aria-label="Modo foco">
      ${icon('arrows-out-simple', 'regular', ' class="ico-expand"')}
      ${icon('arrows-in-simple', 'regular', ' class="ico-collapse"')}
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
  if(desktop) layout.appendChild(buildNotesListCol(matches, noteOrderOf));
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
    if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
    G.activeNoteId = noteId;
    NOTAS_UI.creatingNewNote = false;
    G.notesDrawerOpen = false;
    G.state.lastActiveNoteBySpace[noteSpaceKey()] = noteId;
    markDirty();
    renderNotes();
  }

  const allRow = notebooksCol.querySelector('#nbAllRow');
  if(allRow) allRow.onclick = () => { NOTAS_UI.notebookFilter = 'all'; renderNotes(); };
  notebooksCol.querySelectorAll('.notebook-row[data-nb-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if(e.target.closest('.notebook-menu-btn')) return;
      const id = row.dataset.nbId;
      if(!id) return;
      if(desktop){ NOTAS_UI.notebookFilter = id; renderNotes(); return; }
      if(expandedNotebookIds.has(id)) expandedNotebookIds.delete(id);
      else expandedNotebookIds.add(id);
      renderNotes();
    });
    row.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      NOTAS_UI.draggedNotebookId = row.dataset.nbId;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      NOTAS_UI.draggedNotebookId = null;
      row.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before','drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if(NOTAS_UI.draggedNoteId){
        e.preventDefault();
        row.classList.add('drag-over');
      } else if(NOTAS_UI.draggedNotebookId && NOTAS_UI.draggedNotebookId !== row.dataset.nbId){
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
      if(NOTAS_UI.draggedNoteId){
        const n = G.state.notes.find(x => x.id === NOTAS_UI.draggedNoteId);
        const nb = G.state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!n || !nb || n.notebookId === nb.id) return;
        if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
        n.notebookId = nb.id;
        n.categoryId = nb.categoryId;
        expandedNotebookIds.add(nb.id);
        markDirty();
        renderNotes();
      } else if(NOTAS_UI.draggedNotebookId && NOTAS_UI.draggedNotebookId !== row.dataset.nbId){
        const draggedNb = G.state.notebooks.find(x => x.id === NOTAS_UI.draggedNotebookId);
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
  layout.querySelectorAll('.notebook-note-item[data-note-id], .notes-list-item[data-note-id]').forEach(item => {
    item.addEventListener('click', () => selectNote(item.dataset.noteId));
    item.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      NOTAS_UI.draggedNoteId = item.dataset.noteId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      NOTAS_UI.draggedNoteId = null;
      item.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(el => el.classList.remove('drag-over','drop-before','drop-after'));
    });
    item.addEventListener('dragover', (e) => {
      if(!NOTAS_UI.draggedNoteId || NOTAS_UI.draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = item.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < rect.height/2;
      item.classList.toggle('drop-before', isBefore);
      item.classList.toggle('drop-after', !isBefore);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-before','drop-after'));
    item.addEventListener('drop', (e) => {
      if(!NOTAS_UI.draggedNoteId || NOTAS_UI.draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const isBefore = item.classList.contains('drop-before');
      item.classList.remove('drop-before','drop-after');
      const targetNote = G.state.notes.find(n => n.id === item.dataset.noteId);
      const draggedNote = G.state.notes.find(n => n.id === NOTAS_UI.draggedNoteId);
      if(!targetNote || !draggedNote) return;
      if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
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
  layout.querySelectorAll('.nb-note-pin-btn[data-pin-note-id]').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = G.state.notes.find(x => x.id === pin.dataset.pinNoteId);
      if(!n) return;
      n.pinned = !n.pinned;
      n.pinnedAt = n.pinned ? Date.now() : null;
      if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-add-note-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
      G.activeNoteId = null;
      NOTAS_UI.creatingNewNote = true;
      NOTAS_UI.pendingNotePrefillTaskId = null;
      NOTAS_UI.pendingNoteNotebookId = btn.dataset.nbId;
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
        <button type="button" class="task-menu-item" data-act="rename">${icon('pencil-simple')}Renomear</button>
        <button type="button" class="task-menu-item" data-act="move-space">${icon('folder')}Mover de Espaço</button>
        <button type="button" class="task-menu-item danger" data-act="delete">${icon('trash')}Excluir caderno</button>
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
  const addNotebook = () => {
    const catId = G.activeCategoryFilter || G.state.categories[0].id;
    const nb = { id: uid('nb'), name: 'Novo caderno', categoryId: catId, createdAt: Date.now() };
    G.state.notebooks.push(nb);
    expandedNotebookIds.add(nb.id);
    if(desktop) NOTAS_UI.notebookFilter = nb.id;
    markDirty();
    renderNotes();
  };
  document.getElementById('newNotebookBtn').onclick = addNotebook;
  const newNbRow = document.getElementById('newNotebookRow');
  if(newNbRow) newNbRow.onclick = addNotebook;
}


/* ---------- Computador largo: coluna com a lista de notas (prévia) e filtros no topo da página ---------- */
const SORTS = [['updated', 'Atualização'], ['created', 'Criação'], ['title', 'Título'], ['manual', 'Manual']];

function fmtNoteWhen(ts){
  if(!ts) return '';
  const d = new Date(ts), now = new Date();
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if(same(d, now)) return 'hoje ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if(same(d, y)) return 'ontem';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function scopedNotes(matches){
  const nbf = NOTAS_UI.notebookFilter;
  return G.state.notes.filter(n => !n.archived
    && (!G.activeCategoryFilter || n.categoryId === G.activeCategoryFilter)
    && (nbf === 'all' || n.notebookId === nbf)
    && matches(n));
}

function buildNotesListCol(matches, noteOrderOf){
  const tagIds = NOTAS_UI.tagFilter;
  let list = scopedNotes(matches);
  if(tagIds.length) list = list.filter(n => (n.tagIds || []).some(id => tagIds.includes(id)));
  const by = NOTAS_UI.sort;
  const cmp = {
    updated: (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0),
    created: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    title: (a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'),
    manual: (a, b) => noteOrderOf(a) - noteOrderOf(b),
  }[by] || (() => 0);
  list = list.slice().sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || cmp(a, b));
  const nbName = id => { const nb = G.state.notebooks.find(x => x.id === id); return nb ? (nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome') : 'Sem caderno'; };
  const col = document.createElement('div');
  col.className = 'notes-list-col';
  col.innerHTML = list.length ? list.map(n => `
    <div class="notes-list-item${n.id === G.activeNoteId ? ' on' : ''}" data-note-id="${n.id}" draggable="true">
      <div class="nli-top"><b>${escapeHtml(n.title || 'Sem título')}</b><button type="button" class="nb-note-pin-btn ${n.pinned ? 'pinned' : ''}" data-pin-note-id="${n.id}" title="${n.pinned ? 'Tirar dos favoritos' : 'Favoritar'}">${icon('star', n.pinned ? 'bold' : 'regular')}</button></div>
      <p>${escapeHtml(stripHtml((n.body || '').replace(/<\/(div|p|li|h[1-6])>|<br\s*\/?>/gi, '$& ')).replace(/\s+/g, ' ').trim().slice(0, 160))}</p>
      <small>${escapeHtml(nbName(n.notebookId))} · ${fmtNoteWhen(n.updatedAt || n.createdAt)}</small>
    </div>`).join('') : '<div class="notes-list-empty">Nenhuma nota aqui.</div>';
  col.querySelectorAll('.notes-list-item').forEach(it => {
    it.addEventListener('click', (e) => {
      if(e.target.closest('.nb-note-pin-btn')) return;
      if(NOTAS_UI.currentNoteComposerCommit) NOTAS_UI.currentNoteComposerCommit();
      G.activeNoteId = it.dataset.noteId;
      NOTAS_UI.creatingNewNote = false;
      G.state.lastActiveNoteBySpace[noteSpaceKey()] = it.dataset.noteId;
      markDirty();
      renderNotes();
    });
  });
  renderNotesFilters();
  return col;
}

/* Filtros no topo (mesmo padrão de Tarefas): Ordenar, Tags e Espaço */
function renderNotesFilters(){
  const host = document.getElementById('topbarFilters');
  if(!host) return;
  host.querySelectorAll('.notes-filters').forEach(el => el.remove());
  const usedTagIds = new Set();
  G.state.notes.filter(n => !n.archived && (!G.activeCategoryFilter || n.categoryId === G.activeCategoryFilter)).forEach(n => (n.tagIds || []).forEach(id => usedTagIds.add(id)));
  const tags = G.state.tags.filter(t => usedTagIds.has(t.id));
  NOTAS_UI.tagFilter = NOTAS_UI.tagFilter.filter(id => usedTagIds.has(id));
  const curSort = (SORTS.find(x => x[0] === NOTAS_UI.sort) || SORTS[0])[1];
  const curSpace = G.activeCategoryFilter ? ((G.state.categories.find(c => c.id === G.activeCategoryFilter) || {}).name || 'Espaço') : 'Todos';
  const wrap = document.createElement('div');
  wrap.className = 'notes-filters';
  wrap.innerHTML = `
    <div class="tag-filter-control"><button type="button" class="tag-filter-btn" data-pop="sort">${icon('rows')}<span><i class="nf-k">Ordenar:</i> <b>${curSort}</b></span>${icon('caret-down')}</button>
      <div class="tag-filter-popover" data-popover="sort" style="display:none;">${SORTS.map(([k, l]) => `<label class="tag-filter-row"><input type="radio" name="notesSort" value="${k}" ${NOTAS_UI.sort === k ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
    <div class="tag-filter-control"><button type="button" class="tag-filter-btn" data-pop="tags">${icon('tag')}<span>Tags${NOTAS_UI.tagFilter.length ? ' · ' + NOTAS_UI.tagFilter.length : ''}</span></button>
      <div class="tag-filter-popover" data-popover="tags" style="display:none;">${tags.length ? tags.map(t => `<label class="tag-filter-row"><input type="checkbox" data-tag="${t.id}" ${NOTAS_UI.tagFilter.includes(t.id) ? 'checked' : ''}><span class="cat-swatch" style="background:${t.color}"></span>${escapeHtml(t.name)}</label>`).join('') : '<div style="font-size:12px;color:var(--ink-faint);padding:4px 2px;">Nenhuma tag em uso nas notas</div>'}
        <button type="button" class="filter-clear-btn" data-clear="tags" ${NOTAS_UI.tagFilter.length ? '' : 'disabled'}>Limpar filtro</button></div></div>
    <div class="tag-filter-control"><button type="button" class="tag-filter-btn" data-pop="space">${icon('kanban')}<span><i class="nf-k">Espaço:</i> <b>${escapeHtml(curSpace)}</b></span>${icon('caret-down')}</button>
      <div class="tag-filter-popover" data-popover="space" style="display:none;"><label class="tag-filter-row"><input type="radio" name="notesSpace" value="" ${!G.activeCategoryFilter ? 'checked' : ''}>Todos os espaços</label>${G.state.categories.map(c => `<label class="tag-filter-row"><input type="radio" name="notesSpace" value="${c.id}" ${G.activeCategoryFilter === c.id ? 'checked' : ''}><span class="cat-swatch" style="background:${c.color}"></span>${escapeHtml(c.name)}</label>`).join('')}</div></div>`;
  host.prepend(wrap);
  wrap.querySelectorAll('[data-pop]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const pop = wrap.querySelector(`[data-popover="${b.dataset.pop}"]`);
      const open = pop.style.display === 'block';
      wrap.querySelectorAll('[data-popover]').forEach(p => { p.style.display = 'none'; });
      pop.style.display = open ? 'none' : 'block';
    };
  });
  wrap.querySelectorAll('[data-popover]').forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  wrap.querySelectorAll('input[name="notesSort"]').forEach(r => r.addEventListener('change', () => { NOTAS_UI.sort = r.value; renderNotes(); }));
  wrap.querySelectorAll('input[data-tag]').forEach(c => c.addEventListener('change', () => {
    const id = c.dataset.tag;
    NOTAS_UI.tagFilter = c.checked ? NOTAS_UI.tagFilter.concat(id) : NOTAS_UI.tagFilter.filter(x => x !== id);
    renderNotes();
  }));
  const clr = wrap.querySelector('[data-clear="tags"]');
  if(clr) clr.onclick = () => { NOTAS_UI.tagFilter = []; renderNotes(); };
  wrap.querySelectorAll('input[name="notesSpace"]').forEach(r => r.addEventListener('change', () => selectSpace(r.value || null)));
}
document.addEventListener('click', () => { document.querySelectorAll('.notes-filters [data-popover]').forEach(p => { p.style.display = 'none'; }); });
