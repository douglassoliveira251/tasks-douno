import { G } from './globais.js';
import { LS_KEY, freshState } from './01-estado.js';
import { LS_OWNER_KEY, sbClient } from './02-nuvem.js';
import { applyTheme } from './03-outlook.js';
import { normalizeState } from './07-normalizacao-do-estado.js';
import { saveToLocalStorage } from './08-persistencia.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { openConfirmPortal } from './13-portais-de-tarefa.js';
import { idbDeleteHandle, idbGetHandle, idbSetHandle } from './40-indexeddb.js';
import { FS_SUPPORTED, closeLinkOverlay, openLinkOverlay, renderLinkModal, syncStateFromFile, writeStateToFile } from './41-vinculo-de-arquivo-base.js';
import { renderLoginGate } from './43-tela-de-login.js';
import { render } from './48-render-principal.js';

export async function linkOpenExisting(){
  try{
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
    });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(!(parsed && parsed.categories)){ alert('Arquivo inválido para o DOUNO Tasks.'); return; }
    G.state = parsed;
    normalizeState();
    applyTheme();
    G.fileHandle = handle;
    await idbSetHandle('main', handle);
    localStorage.removeItem('tyvraSkipFileLink');
    G.dirty = false;
    saveToLocalStorage();
    closeLinkOverlay();
    updateFileStatus();
    render();
  }catch(e){ if(e.name !== 'AbortError') console.error(e); }
}

export async function linkCreateNew(){
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: 'douno-tasks.json',
      types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
    });
    G.fileHandle = handle;
    await writeStateToFile();
    await idbSetHandle('main', handle);
    localStorage.removeItem('tyvraSkipFileLink');
    G.dirty = false;
    closeLinkOverlay();
    updateFileStatus();
    render();
  }catch(e){ if(e.name !== 'AbortError') console.error(e); }
}

export function skipLinking(){
  localStorage.setItem('tyvraSkipFileLink','1');
  closeLinkOverlay();
  render();
}

export async function disconnectFile(e){
  if(e) e.stopPropagation();
  const anchor = (e && e.currentTarget) || document.getElementById('avatarMenuLogoutBtn') || document.getElementById('topbarAvatarBtn');
  if(G.cloudSession){
    openConfirmPortal(anchor, 'Sair da sua conta? Você vai precisar entrar de novo com seu e-mail e senha.', async () => {
      try{ await sbClient.auth.signOut(); }catch(e2){ console.error(e2); }
      G.cloudSession = null;
      G.dirty = false;
      try{ localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_OWNER_KEY); }catch(e3){}
      G.state = freshState();
      G.loginMode = 'login';
      renderLoginGate();
      document.getElementById('loginOverlay').classList.add('show');
    }, 'Sair');
    return;
  }
  openConfirmPortal(anchor, 'Desconectar o arquivo base? O sistema ficará indisponível até que você conecte um arquivo novamente.', async () => {
    G.fileHandle = null;
    await idbDeleteHandle('main');
    localStorage.removeItem('tyvraSkipFileLink');
    G.dirty = false;
    updateFileStatus();
    renderLinkModal('choose', null, true);
    openLinkOverlay();
  }, 'Desconectar');
}

export async function initFileLink(){
  if(!FS_SUPPORTED){ updateFileStatus(); return; }
  const storedHandle = await idbGetHandle('main');
  if(storedHandle){
    try{
      const perm = await storedHandle.queryPermission({ mode:'readwrite' });
      if(perm === 'granted'){
        G.fileHandle = storedHandle;
        await syncStateFromFile();
        updateFileStatus();
        render();
        return;
      }
      renderLinkModal('reconnect', storedHandle);
      openLinkOverlay();
      return;
    }catch(e){ console.error(e); }
  }
  if(localStorage.getItem('tyvraSkipFileLink')){ updateFileStatus(); return; }
  renderLinkModal('choose');
  openLinkOverlay();
}

/* ===================== ESPAÇOS: ver funções na seção de Configurações acima ===================== */


