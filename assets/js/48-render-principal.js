import { G } from './globais.js';
import { maybeShowWhatsNew, updateWhatsNewDot } from './05-novidades-painel.js';
import { maybeShowOnboarding } from './51-primeiro-uso.js';
import { renderHelpPanelContent, renderPageHeaderMeta } from './06-cabecalho-e-ajuda.js';
import { isMobileViewport } from './01-estado.js';
import { refreshFromCloudIfSafe } from './08-persistencia.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { escapeHtml, todayStr } from './10-helpers.js';
import { renderTasks } from './12-render-tasks.js';
import { MONTH_LABELS, WEEKDAY_FULL_LABELS } from './25-calendario.js';
import { renderDashboard } from './26-dashboard.js';
import { renderCalendar } from './27-calendario-vistas.js';
import { renderNotes } from './29-notas-lista.js';
import { renderProfileCard, renderSettingsView } from './30-perfil-e-configuracoes.js';
import { syncStageDates } from './31-projetos.js';
import { renderProjects } from './32-projetos-lista-e-detalhe.js';
import { renderLibrary } from './57-biblioteca.js';
import { renderSpaceSelector } from './45-nav-view-switch.js';
import { updateNotifBadge } from './46-busca-e-notificacoes.js';
import { syncRouteToView } from './49-rotas.js';

/* ===================== RENDER PRINCIPAL ===================== */
export const VIEW_TITLES = { dashboard:'Visão geral', tasks:'Tarefas', notes:'Notas', projects:'Projetos', calendar:'Calendário', library:'Biblioteca', settings:'Configurações' };
export function saveUiSession(){
  try{
    sessionStorage.setItem('taskinUiSession', JSON.stringify({ currentView: G.currentView, activeCategoryFilter: G.activeCategoryFilter }));
  }catch(e){}
}
export function loadUiSession(){
  try{
    const raw = sessionStorage.getItem('taskinUiSession');
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(saved && (typeof saved.activeCategoryFilter === 'string' || saved.activeCategoryFilter === null)) G.activeCategoryFilter = saved.activeCategoryFilter;
  }catch(e){}
}
let lastRenderedView = null;
export function render_syncStages(){ try{ syncStageDates(); }catch(e){} }
G.lastGroupModeKey = null; // var: pode ser zerada por normalizeState antes desta linha rodar
export const DEFAULT_GROUP_MODE = 'retomada'; // visão principal: espaço sem escolha própria abre por Retomada
export const GROUP_MODES = ['periodo','grupos','prioridade','status','tags','retomada'];
export function groupModeKey(){ return G.activeCategoryFilter || '__all'; }
export function render(){
  /* celular: não há Visão geral; quem cair nela (endereço, atalho) vai para Tarefas */
  if(G.currentView === 'dashboard' && isMobileViewport()) G.currentView = 'tasks';
  saveUiSession();
  syncRouteToView();
  render_syncStages();
  // trocou de espaço (ou acabou de abrir): usa o agrupamento guardado para ele
  if(groupModeKey() !== G.lastGroupModeKey){
    G.lastGroupModeKey = groupModeKey();
    const saved = G.state.categoryGroupModes && G.state.categoryGroupModes[G.lastGroupModeKey];
    G.taskGroupMode = GROUP_MODES.includes(saved) ? saved : DEFAULT_GROUP_MODE;
  }
  /* celular: ao abrir o calendário, começa sempre na visão Agenda (de hoje), qualquer que seja a escolha do computador */
  if(G.currentView === 'calendar' && lastRenderedView !== 'calendar' && isMobileViewport()){
    if(G.calendarView !== 'agenda') G.calendarFocusDate = todayStr();
    G.calendarView = 'agenda';
  }
  if(G.currentView !== lastRenderedView){
    lastRenderedView = G.currentView;
    refreshFromCloudIfSafe();
  }
  if(G.currentView !== 'notes') G.notesDrawerOpen = false;
  document.body.classList.toggle('notes-focus', G.notesFocusMode && G.currentView === 'notes');
  document.body.classList.toggle('view-dashboard', G.currentView === 'dashboard');
  document.body.dataset.view = G.currentView;
  document.body.dataset.proj = (G.currentView === 'projects' && G.activeProjectId) ? 'open' : '';
  if(G.currentView !== 'tasks') document.querySelectorAll('#topbarFilters .group-mode-bar, #topbarFilters .view-mode-toggle').forEach(el => el.remove());
  if(G.currentView !== 'notes') document.querySelectorAll('#topbarFilters .notes-filters').forEach(el => el.remove());
  if(G.currentView !== 'library') document.querySelectorAll('#topbarFilters .lib-topsearch').forEach(el => el.remove());
  if(G.currentView !== 'projects' || G.activeProjectId) document.querySelectorAll('#topbarFilters .proj-filters').forEach(el => el.remove());
  renderSpaceSelector();
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === G.currentView));
  const viewTitleEl = document.getElementById('viewTitle');
  if(G.currentView === 'dashboard'){
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Bom dia' : (hr < 18 ? 'Boa tarde' : 'Boa noite');
    const first = ((G.state.profile && G.state.profile.name) || '').trim().split(/\s+/)[0];
    viewTitleEl.innerHTML = first ? `${greet}, <span>${escapeHtml(first)}</span>` : greet;
  } else {
    viewTitleEl.textContent = VIEW_TITLES[G.currentView];
  }
  renderPageHeaderMeta();
  const subtitleEl = document.getElementById('viewSubtitle');
  if(G.currentView === 'dashboard'){
    const focusD = new Date(todayStr()+'T00:00:00');
    subtitleEl.textContent = `${WEEKDAY_FULL_LABELS[focusD.getDay()]}, ${focusD.getDate()} de ${MONTH_LABELS[focusD.getMonth()].toLowerCase()}${window.matchMedia('(max-width:768px)').matches ? '' : ' · acompanhe suas tarefas, prazos e compromissos'}`;
    subtitleEl.style.display = 'block';
  } else {
    subtitleEl.style.display = 'none';
  }
  document.getElementById('dashboardView').style.display = G.currentView === 'dashboard' ? 'block' : 'none';
  document.getElementById('tasksView').style.display = G.currentView === 'tasks' ? 'block' : 'none';
  document.getElementById('notesView').style.display = G.currentView === 'notes' ? 'block' : 'none';
  document.getElementById('calendarView').style.display = G.currentView === 'calendar' ? 'block' : 'none';
  document.getElementById('projectsView').style.display = G.currentView === 'projects' ? 'block' : 'none';
  document.getElementById('libraryView').style.display = G.currentView === 'library' ? 'block' : 'none';
  document.getElementById('settingsView').style.display = G.currentView === 'settings' ? 'block' : 'none';
  document.getElementById('searchWrap').style.display = 'flex';
  renderProfileCard();
  updateNotifBadge();
  updateWhatsNewDot();
  maybeShowOnboarding();
  maybeShowWhatsNew();
  if(document.getElementById('helpPanel').classList.contains('show')) renderHelpPanelContent();
  if(G.currentView === 'dashboard') renderDashboard();
  else if(G.currentView === 'tasks') renderTasks();
  else if(G.currentView === 'notes') renderNotes();
  else if(G.currentView === 'calendar') renderCalendar();
  else if(G.currentView === 'projects') renderProjects();
  else if(G.currentView === 'library') renderLibrary();
  else renderSettingsView();
  updateFileStatus();
  document.dispatchEvent(new Event('douno:rendered'));
}

