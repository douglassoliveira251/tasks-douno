import { G } from './globais.js';
import { DEFAULT_COLORS, currentSpaceFilter } from './01-estado.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { selectSpace } from './11-render-sidebar.js';
import { openNewTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { openNoteComposer } from './24-render-notes.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { openProjectEditor, openStageEditor, projectById } from './31-projetos.js';
import { getOrderedCategories, renderCatRows } from './38-configuracoes-espacos-e-etiquetas.js';
import { clearSearchTerm } from './46-busca-e-notificacoes.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';

/* ===================== NAV / VIEW SWITCH ===================== */
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.onclick = () => {
    const panel = document.querySelector('.task-panel');
    if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
      document.activeElement.blur();
    }
    G.currentView = btn.dataset.view;
    G.activeTaskId = null;
    G.creatingNewTask = false;
    G.creatingNewNote = false;
    G.pendingNoteNotebookId = null;
    clearSearchTerm();
    closeMobileSidebar();
    render();
  };
});

export function openMobileSidebar(){
  document.querySelector('.sidebar').classList.add('mobile-open');
  document.getElementById('sidebarBackdrop').classList.add('show');
}
export function closeMobileSidebar(){
  document.querySelector('.sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}
document.getElementById('mobileMenuBtn').onclick = openMobileSidebar;
document.getElementById('sidebarBackdrop').onclick = closeMobileSidebar;

export function openSettingsView(tab){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  G.currentView = 'settings';
  if(tab) G.settingsTab = tab;
  G.activeTaskId = null;
  G.creatingNewTask = false;
  G.creatingNewNote = false;
  G.pendingNoteNotebookId = null;
  clearSearchTerm();
  render();
}

export function createNewSpace(){
  const color = DEFAULT_COLORS[G.state.categories.length % DEFAULT_COLORS.length];
  const newCat = { id: uid('cat'), name: 'Novo espaço', color };
  G.state.categories.push(newCat);
  openSettingsView('categorias');
  markDirty();
  setTimeout(() => renderCatRows(newCat.id), 0);
}

export function closeSpaceSelectorDropdown(){
  const dd = document.getElementById('spaceSelectorDropdown');
  if(dd) dd.style.display = 'none';
}

export const spaceSelectorMobileMQ = window.matchMedia('(max-width:768px)');
export function placeSpaceSelector(){
  const wrap = document.getElementById('spaceSelectorWrap');
  if(!wrap) return;
  const mobile = spaceSelectorMobileMQ.matches;
  if(mobile){
    const titleWrap = document.getElementById('topbarTitle');
    if(titleWrap && wrap.parentElement !== titleWrap) titleWrap.appendChild(wrap);
  } else {
    // antes da busca: busca, ajuda, notificações e conta ficam no mesmo lugar em todas as telas
    const topbar = document.querySelector('.topbar');
    const search = document.getElementById('searchWrap');
    if(topbar && search && wrap.parentElement !== topbar) topbar.insertBefore(wrap, search);
  }
  wrap.classList.toggle('in-topbar', !mobile);
}
if(spaceSelectorMobileMQ.addEventListener) spaceSelectorMobileMQ.addEventListener('change', placeSpaceSelector);

export function renderSpaceSelector(){
  const wrap = document.getElementById('spaceSelectorWrap');
  if(!wrap) return;
  placeSpaceSelector();
  const showOn = (G.currentView === 'dashboard' || G.currentView === 'tasks' || G.currentView === 'notes' || G.currentView === 'calendar' || G.currentView === 'projects');
  wrap.style.display = showOn ? 'flex' : 'none';
  if(!showOn){ closeSpaceSelectorDropdown(); return; }

  const shown = currentSpaceFilter();
  const cat = shown ? catById(shown) : null;
  document.getElementById('spaceSelectorDot').style.background = cat ? cat.color : 'var(--ink-faint)';
  const nameEl = document.getElementById('spaceSelectorName');
  if(cat) nameEl.textContent = cat.name;
  else nameEl.innerHTML = 'Todos<span class="ssn-extra"> os espaços</span>';
}

document.getElementById('spaceSelectorBtn').onclick = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('spaceSelectorDropdown');
  const wasOpen = dd.style.display !== 'none';
  closeSpaceSelectorDropdown();
  if(wasOpen) return;

  const checkSvg = icon('check', 'regular', ' class="space-selector-check"');
  let html = '<div class="space-selector-label">ESPAÇOS</div>';
  html += getOrderedCategories().map(cat => `
    <div class="space-selector-item" data-cat-id="${cat.id}">
      <span class="space-selector-dot" style="background:${cat.color}"></span>
      <span class="space-selector-item-name">${escapeHtml(cat.name)}</span>
      ${currentSpaceFilter()===cat.id ? checkSvg : ''}
    </div>
  `).join('');
  html += `<div class="space-selector-divider"></div>`;
  html += `
    <div class="space-selector-item" data-cat-id="">
      <span class="space-selector-dot" style="background:var(--ink-faint)"></span>
      <span class="space-selector-item-name">Todos os espaços</span>
      ${currentSpaceFilter()===null ? checkSvg : ''}
    </div>
    <div class="space-selector-divider"></div>
    <div class="space-selector-item action" id="spaceSelectorNewBtn">
      ${icon('plus')}
      <span class="space-selector-item-name">Novo espaço</span>
    </div>
    <div class="space-selector-item action" id="spaceSelectorManageBtn">
      ${icon('gear')}
      <span class="space-selector-item-name">Gerenciar espaços</span>
    </div>
  `;
  dd.innerHTML = html;
  dd.style.display = 'block';
  dd.querySelectorAll('.space-selector-item[data-cat-id]').forEach(item => {
    item.onclick = () => {
      if(G.currentView === 'dashboard'){ G.dashboardSpace = item.dataset.catId || null; render(); }
      else selectSpace(item.dataset.catId);
      closeSpaceSelectorDropdown();
    };
  });
  document.getElementById('spaceSelectorNewBtn').onclick = () => { closeSpaceSelectorDropdown(); createNewSpace(); };
  document.getElementById('spaceSelectorManageBtn').onclick = () => { closeSpaceSelectorDropdown(); openSettingsView('categorias'); };
};
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('spaceSelectorWrap');
  const dd = document.getElementById('spaceSelectorDropdown');
  if(dd && dd.style.display !== 'none' && wrap && !wrap.contains(e.target)){
    closeSpaceSelectorDropdown();
  }
});

document.getElementById('primaryAddBtn').onclick = () => {
  if(G.currentView === 'tasks'){
    openNewTaskPanel();
  } else if(G.currentView === 'notes'){
    openNoteComposer();
  } else if(G.currentView === 'calendar'){
    openEventComposer(null, G.calendarFocusDate);
  } else if(G.currentView === 'projects'){
    const openProject = G.activeProjectId ? projectById(G.activeProjectId) : null;
    if(openProject) openStageEditor(openProject, null);
    else openProjectEditor(null);
  }
};

