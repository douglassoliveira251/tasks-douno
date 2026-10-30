/* ===================== INIT ===================== */
async function boot(){
  loadFromLocalStorage();
  applyTheme();
  if(state.defaultCategoryFilter) activeCategoryFilter = state.defaultCategoryFilter;
  if(state.calendarViewDefault) calendarView = state.calendarViewDefault;

  if(sbClient){
    try{
      const { data } = await sbClient.auth.getSession();
      if(data && data.session){
        cloudSession = data.session;
        await startCloudSession();
        return;
      }
    }catch(e){ console.error(e); }
    render();
    renderLoginGate();
    document.getElementById('loginOverlay').classList.add('show');
    return;
  }

  if(FS_SUPPORTED){
    try{
      const storedHandle = await idbGetHandle('main');
      if(storedHandle){
        const perm = await storedHandle.queryPermission({ mode:'readwrite' });
        if(perm === 'granted'){
          fileHandle = storedHandle;
          await syncStateFromFile();
          applyTheme();
          if(state.defaultCategoryFilter) activeCategoryFilter = state.defaultCategoryFilter;
          if(state.calendarViewDefault) calendarView = state.calendarViewDefault;
          loadUiSession();
          render();
          updateFileStatus();
          return;
        }
        render();
        renderLinkModal('reconnect', storedHandle);
        openLinkOverlay();
        updateFileStatus();
        return;
      }
    }catch(e){ console.error(e); }
  }

  render();
  initFileLink();
}
boot();
