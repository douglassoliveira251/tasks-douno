import { G } from './globais.js';
import { applyTheme } from './03-outlook.js';
import { normalizeState } from './07-normalizacao-do-estado.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { linkCreateNew, linkOpenExisting, skipLinking } from './44-vinculo-de-arquivo-e-init.js';
import { render } from './48-render-principal.js';

/* ===================== VÍNCULO DE ARQUIVO BASE ===================== */
export const FS_SUPPORTED = !!window.showOpenFilePicker && !!window.showSaveFilePicker;

export function openLinkOverlay(){ document.getElementById('linkOverlay').classList.add('show'); }
export function closeLinkOverlay(){ G.appUnlocked = true; document.getElementById('linkOverlay').classList.remove('show'); }

export function renderLinkModal(mode, storedHandle, forced){
  const body = document.getElementById('linkModalBody');
  if(mode === 'reconnect'){
    body.innerHTML = `
      <h3>Reconectar arquivo base</h3>
      <p class="link-desc">Encontramos um vínculo anterior com <strong>douno-tasks.json</strong>. Reconecte para continuar sincronizando suas tarefas e notas com esse arquivo.</p>
      <button class="link-option primary" id="btnReconnect"><span class="icon">🔗</span><span class="txt"><strong>Reconectar douno-tasks.json</strong><span>Concede permissão novamente ao arquivo já vinculado</span></span></button>
      <button class="link-option" id="btnLinkNewInstead"><span class="icon">📂</span><span class="txt"><strong>Vincular outro arquivo</strong><span>Escolher ou criar um arquivo diferente</span></span></button>
      ${forced ? '' : '<button class="link-skip" id="btnSkipLink">Continuar sem conectar (usar apenas este navegador)</button>'}
    `;
    document.getElementById('btnReconnect').onclick = () => reconnectHandle(storedHandle);
    document.getElementById('btnLinkNewInstead').onclick = () => renderLinkModal('choose', null, forced);
    if(!forced) document.getElementById('btnSkipLink').onclick = skipLinking;
  } else {
    body.innerHTML = `
      <h3>${forced ? 'Conecte um arquivo para continuar' : 'Vincular arquivo base'}</h3>
      <p class="link-desc">${forced ? 'O sistema fica indisponível sem um arquivo base conectado. Abra um <strong>douno-tasks.json</strong> existente ou crie um novo para continuar.' : 'O DOUNO Tasks ainda não está vinculado a um arquivo local. Vincule um <strong>douno-tasks.json</strong> para manter tarefas, notas e perfil salvos e sincronizados entre sessões.'}</p>
      <button class="link-option primary" id="btnOpenExisting"><span class="icon">📂</span><span class="txt"><strong>Abrir arquivo existente</strong><span>Já tenho um douno-tasks.json salvo</span></span></button>
      <button class="link-option" id="btnCreateNew"><span class="icon">🆕</span><span class="txt"><strong>Criar novo arquivo</strong><span>Começar do zero e salvar um novo douno-tasks.json</span></span></button>
      ${forced ? '' : '<button class="link-skip" id="btnSkipLink">Continuar sem conectar (usar apenas este navegador)</button>'}
    `;
    document.getElementById('btnOpenExisting').onclick = linkOpenExisting;
    document.getElementById('btnCreateNew').onclick = linkCreateNew;
    if(!forced) document.getElementById('btnSkipLink').onclick = skipLinking;
  }
}

export async function reconnectHandle(handle){
  try{
    const perm = await handle.requestPermission({ mode:'readwrite' });
    if(perm === 'granted'){
      G.fileHandle = handle;
      await syncStateFromFile();
      G.dirty = false;
      closeLinkOverlay();
      updateFileStatus();
      render();
    } else {
      alert('Permissão não concedida. Você pode tentar novamente pelo botão "Conectar arquivo base".');
      closeLinkOverlay();
    }
  }catch(e){ console.error(e); closeLinkOverlay(); }
}

export async function syncStateFromFile(){
  try{
    const file = await G.fileHandle.getFile();
    const text = await file.text();
    if(text && text.trim()){
      const parsed = JSON.parse(text);
      if(parsed && parsed.categories){
        G.state = parsed;
        normalizeState();
        applyTheme();
      }
    } else {
      await writeStateToFile();
    }
  }catch(e){ console.error(e); }
}

export async function writeStateToFile(){
  const writable = await G.fileHandle.createWritable();
  await writable.write(JSON.stringify(G.state, null, 2));
  await writable.close();
}

