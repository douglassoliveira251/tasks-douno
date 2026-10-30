async function linkOpenExisting(){
  try{
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
    });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(!(parsed && parsed.categories)){ alert('Arquivo inválido para o DOUNO Tasks.'); return; }
    state = parsed;
    normalizeState();
    applyTheme();
    fileHandle = handle;
    await idbSetHandle('main', handle);
    localStorage.removeItem('tyvraSkipFileLink');
    dirty = false;
    saveToLocalStorage();
    closeLinkOverlay();
    updateFileStatus();
    render();
  }catch(e){ if(e.name !== 'AbortError') console.error(e); }
}

async function linkCreateNew(){
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: 'douno-tasks.json',
      types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
    });
    fileHandle = handle;
    await writeStateToFile();
    await idbSetHandle('main', handle);
    localStorage.removeItem('tyvraSkipFileLink');
    dirty = false;
    closeLinkOverlay();
    updateFileStatus();
    render();
  }catch(e){ if(e.name !== 'AbortError') console.error(e); }
}

function skipLinking(){
  localStorage.setItem('tyvraSkipFileLink','1');
  closeLinkOverlay();
  render();
}

async function disconnectFile(e){
  if(e) e.stopPropagation();
  const anchor = (e && e.currentTarget) || document.getElementById('avatarMenuLogoutBtn') || document.getElementById('topbarAvatarBtn');
  if(cloudSession){
    openConfirmPortal(anchor, 'Sair da sua conta? Você vai precisar entrar de novo com seu e-mail e senha.', async () => {
      try{ await sbClient.auth.signOut(); }catch(e2){ console.error(e2); }
      cloudSession = null;
      dirty = false;
      try{ localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_OWNER_KEY); }catch(e3){}
      state = freshState();
      loginMode = 'login';
      renderLoginGate();
      document.getElementById('loginOverlay').classList.add('show');
    }, 'Sair');
    return;
  }
  openConfirmPortal(anchor, 'Desconectar o arquivo base? O sistema ficará indisponível até que você conecte um arquivo novamente.', async () => {
    fileHandle = null;
    await idbDeleteHandle('main');
    localStorage.removeItem('tyvraSkipFileLink');
    dirty = false;
    updateFileStatus();
    renderLinkModal('choose', null, true);
    openLinkOverlay();
  }, 'Desconectar');
}

async function initFileLink(){
  if(!FS_SUPPORTED){ updateFileStatus(); return; }
  const storedHandle = await idbGetHandle('main');
  if(storedHandle){
    try{
      const perm = await storedHandle.queryPermission({ mode:'readwrite' });
      if(perm === 'granted'){
        fileHandle = storedHandle;
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


