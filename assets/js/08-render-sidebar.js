/* ===================== RENDER: SIDEBAR ===================== */
function closeCatCollapsedPopover(){
  const p = document.getElementById('catCollapsedPopover');
  if(p) p.remove();
}
function selectSpace(catId){
  activeCategoryFilter = catId || null;
  if(activeCategoryFilter && state.categoryGroupModes[activeCategoryFilter]) taskGroupMode = state.categoryGroupModes[activeCategoryFilter];
  if(activeCategoryFilter && state.categoryCalendarViews[activeCategoryFilter]) calendarView = state.categoryCalendarViews[activeCategoryFilter];
  clearSearchTerm();
  render();
}

function renderSidebarCats(){
  const tasksInScope = state.tasks.filter(t => !activeCategoryFilter || t.categoryId === activeCategoryFilter);
  const notesInScope = state.notes.filter(n => !activeCategoryFilter || n.categoryId === activeCategoryFilter);
  document.getElementById('taskNavCount').textContent = tasksInScope.filter(t=>!t.done).length;
  document.getElementById('noteNavCount').textContent = notesInScope.filter(n=>!n.archived).length;
}

