/* ===================== RENDER PRINCIPAL ===================== */
const VIEW_TITLES = { dashboard:'Visão geral', tasks:'Tarefas', notes:'Notas', projects:'Projetos', calendar:'Calendário', settings:'Configurações' };
function saveUiSession(){
  try{
    sessionStorage.setItem('taskinUiSession', JSON.stringify({ currentView, activeCategoryFilter }));
  }catch(e){}
}
function loadUiSession(){
  try{
    const raw = sessionStorage.getItem('taskinUiSession');
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(saved && (typeof saved.activeCategoryFilter === 'string' || saved.activeCategoryFilter === null)) activeCategoryFilter = saved.activeCategoryFilter;
  }catch(e){}
}
let lastRenderedView = null;
function render_syncStages(){ try{ syncStageDates(); }catch(e){} }
var lastGroupModeKey = null; // var: pode ser zerada por normalizeState antes desta linha rodar
const DEFAULT_GROUP_MODE = 'retomada'; // visão principal: espaço sem escolha própria abre por Retomada
const GROUP_MODES = ['periodo','grupos','prioridade','status','tags','retomada'];
function groupModeKey(){ return activeCategoryFilter || '__all'; }
function render(){
  saveUiSession();
  syncRouteToView();
  render_syncStages();
  // trocou de espaço (ou acabou de abrir): usa o agrupamento guardado para ele
  if(groupModeKey() !== lastGroupModeKey){
    lastGroupModeKey = groupModeKey();
    const saved = state.categoryGroupModes && state.categoryGroupModes[lastGroupModeKey];
    taskGroupMode = GROUP_MODES.includes(saved) ? saved : DEFAULT_GROUP_MODE;
  }
  if(currentView !== lastRenderedView){
    lastRenderedView = currentView;
    refreshFromCloudIfSafe();
  }
  if(currentView !== 'notes') notesDrawerOpen = false;
  document.body.classList.toggle('notes-focus', notesFocusMode && currentView === 'notes');
  renderSpaceSelector();
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
  const viewTitleEl = document.getElementById('viewTitle');
  if(currentView === 'dashboard'){
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Bom dia' : (hr < 18 ? 'Boa tarde' : 'Boa noite');
    const first = ((state.profile && state.profile.name) || '').trim().split(/\s+/)[0];
    viewTitleEl.innerHTML = first ? `${greet}, <span>${escapeHtml(first)}</span>` : greet;
  } else {
    viewTitleEl.textContent = VIEW_TITLES[currentView];
  }
  renderPageHeaderMeta();
  const subtitleEl = document.getElementById('viewSubtitle');
  if(currentView === 'dashboard'){
    const focusD = new Date(todayStr()+'T00:00:00');
    subtitleEl.textContent = `${WEEKDAY_FULL_LABELS[focusD.getDay()]}, ${focusD.getDate()} de ${MONTH_LABELS[focusD.getMonth()].toLowerCase()} · suas tarefas, do seu jeito`;
    subtitleEl.style.display = 'block';
  } else {
    subtitleEl.style.display = 'none';
  }
  document.getElementById('dashboardView').style.display = currentView === 'dashboard' ? 'block' : 'none';
  document.getElementById('tasksView').style.display = currentView === 'tasks' ? 'block' : 'none';
  document.getElementById('notesView').style.display = currentView === 'notes' ? 'block' : 'none';
  document.getElementById('calendarView').style.display = currentView === 'calendar' ? 'block' : 'none';
  document.getElementById('projectsView').style.display = currentView === 'projects' ? 'block' : 'none';
  document.getElementById('settingsView').style.display = currentView === 'settings' ? 'block' : 'none';
  document.getElementById('searchWrap').style.display = 'flex';
  const addBtn = document.getElementById('primaryAddBtn');
  if(currentView === 'settings' || currentView === 'dashboard'){
    addBtn.style.display = 'none';
  } else {
    addBtn.style.display = 'flex';
    addBtn.title = currentView === 'tasks' ? 'Nova tarefa' : currentView === 'calendar' ? 'Nova agenda' : currentView === 'projects' ? (activeProjectId ? 'Nova etapa' : 'Novo projeto') : 'Nova nota';
  }
  addBtn.classList.toggle('shifted', (currentView === 'tasks' || currentView === 'projects') && (activeTaskId || creatingNewTask));
  renderProfileCard();
  updateNotifBadge();
  updateWhatsNewDot();
  maybeShowWhatsNew();
  if(document.getElementById('helpPanel').classList.contains('show')) renderHelpPanelContent();
  renderSidebarCats();
  if(currentView === 'dashboard') renderDashboard();
  else if(currentView === 'tasks') renderTasks();
  else if(currentView === 'notes') renderNotes();
  else if(currentView === 'calendar') renderCalendar();
  else if(currentView === 'projects') renderProjects();
  else renderSettingsView();
  updateFileStatus();
}

