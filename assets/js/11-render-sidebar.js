import { G } from './globais.js';
import { isMobileViewport } from './01-estado.js';
import { clearSearchTerm } from './46-busca-e-notificacoes.js';
import { render } from './48-render-principal.js';

/* ===================== RENDER: SIDEBAR ===================== */
export function selectSpace(catId){
  G.activeCategoryFilter = catId || null;
  if(G.activeCategoryFilter && G.state.categoryGroupModes[G.activeCategoryFilter]) G.taskGroupMode = G.state.categoryGroupModes[G.activeCategoryFilter];
  if(!isMobileViewport() && G.activeCategoryFilter && G.state.categoryCalendarViews[G.activeCategoryFilter]) G.calendarView = G.state.categoryCalendarViews[G.activeCategoryFilter];
  clearSearchTerm();
  render();
}
