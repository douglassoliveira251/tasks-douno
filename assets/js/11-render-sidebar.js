import { G } from './globais.js';
import { clearSearchTerm } from './46-busca-e-notificacoes.js';
import { render } from './48-render-principal.js';

/* ===================== RENDER: SIDEBAR ===================== */
export function closeCatCollapsedPopover(){
  const p = document.getElementById('catCollapsedPopover');
  if(p) p.remove();
}
export function selectSpace(catId){
  G.activeCategoryFilter = catId || null;
  if(G.activeCategoryFilter && G.state.categoryGroupModes[G.activeCategoryFilter]) G.taskGroupMode = G.state.categoryGroupModes[G.activeCategoryFilter];
  if(G.activeCategoryFilter && G.state.categoryCalendarViews[G.activeCategoryFilter]) G.calendarView = G.state.categoryCalendarViews[G.activeCategoryFilter];
  clearSearchTerm();
  render();
}

export function renderSidebarCats(){
  const tasksInScope = G.state.tasks.filter(t => !G.activeCategoryFilter || t.categoryId === G.activeCategoryFilter);
  const notesInScope = G.state.notes.filter(n => !G.activeCategoryFilter || n.categoryId === G.activeCategoryFilter);
  document.getElementById('taskNavCount').textContent = tasksInScope.filter(t=>!t.done).length;
  document.getElementById('noteNavCount').textContent = notesInScope.filter(n=>!n.archived).length;
}

