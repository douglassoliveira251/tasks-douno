import { G } from './globais.js';
import { sbClient } from './02-nuvem.js';
import { applyTheme } from './03-outlook.js';
import { loadFromLocalStorage } from './08-persistencia.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { idbGetHandle } from './40-indexeddb.js';
import { FS_SUPPORTED, openLinkOverlay, renderLinkModal, syncStateFromFile } from './41-vinculo-de-arquivo-base.js';
import { renderLoginGate } from './43-tela-de-login.js';
import { initFileLink } from './44-vinculo-de-arquivo-e-init.js';
import { loadUiSession, render } from './48-render-principal.js';

/* ===================== INIT ===================== */
export async function boot(){
  loadFromLocalStorage();
  applyTheme();
  if(G.state.defaultCategoryFilter) G.activeCategoryFilter = G.state.defaultCategoryFilter;
  if(G.state.calendarViewDefault) G.calendarView = G.state.calendarViewDefault;

  if(sbClient){
    try{
      const { data } = await sbClient.auth.getSession();
      if(data && data.session){
        G.cloudSession = data.session;
        await G.startCloudSession();
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
          G.fileHandle = storedHandle;
          await syncStateFromFile();
          applyTheme();
          if(G.state.defaultCategoryFilter) G.activeCategoryFilter = G.state.defaultCategoryFilter;
          if(G.state.calendarViewDefault) G.calendarView = G.state.calendarViewDefault;
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
