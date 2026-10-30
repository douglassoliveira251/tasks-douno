import { G } from './globais.js';
import { APP_VERSION } from './00-versao.js';
import { applyTheme } from './03-outlook.js';
import { normalizeState } from './07-normalizacao-do-estado.js';
import { commitOpenEditors, flushAutoSave, saveToLocalStorage } from './08-persistencia.js';
import { idbSetHandle } from './40-indexeddb.js';
import { writeStateToFile } from './41-vinculo-de-arquivo-base.js';
import { render } from './48-render-principal.js';
G.fetchPublishedVersion = fetchPublishedVersion; G.reloadForUpdate = reloadForUpdate;

/* ===== Atualização do sistema =====
   O sistema é um único arquivo publicado na web. Quem deixa a aba aberta fica rodando a versão
   antiga depois de um deploy. Aqui o app relê o próprio index.html de tempos em tempos (e ao voltar
   para a aba), compara o APP_VERSION publicado com o carregado e, se houver versão mais nova,
   mostra um aviso obrigatório: salva o que estiver pendente e recarrega. */
G.updatePromptShown = false;
G.lastUpdateCheck = 0;
export function versionIsNewer(remote, local){
  const a = String(remote).split('.').map(n => parseInt(n, 10) || 0), b = String(local).split('.').map(n => parseInt(n, 10) || 0);
  for(let i = 0; i < Math.max(a.length, b.length); i++){
    if((a[i] || 0) > (b[i] || 0)) return true;
    if((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}
async function fetchPublishedVersion(){
  // publicado: version.json (gerado no build). Em desenvolvimento, sem build, lê o próprio arquivo da versão.
  const res = await fetch('/version.json?_v=' + Date.now(), { cache: 'no-store' });
  if(res.ok && (res.headers.get('content-type') || '').includes('json')){
    const v = (await res.json()).version;
    return /^\d+(?:\.\d+)+$/.test(v) ? v : null;
  }
  const src = await fetch('/assets/js/00-versao.js?_v=' + Date.now(), { cache: 'no-store' });
  if(!src.ok) return null;
  // só números: a própria expressão (que aparece neste arquivo) não pode casar consigo mesma
  const m = (await src.text()).match(/const APP_VERSION = '(\d+(?:\.\d+)+)'/);
  return m ? m[1] : null;
}
export async function checkForAppUpdate(force){
  if(G.updatePromptShown || location.protocol === 'file:') return;
  if(!force && Date.now() - G.lastUpdateCheck < 60000) return;
  G.lastUpdateCheck = Date.now();
  try{
    const remote = await G.fetchPublishedVersion();
    if(remote && versionIsNewer(remote, APP_VERSION)) showUpdatePrompt(remote);
  }catch(e){ /* sem rede: tenta de novo mais tarde */ }
}
function reloadForUpdate(){
  // busca a página e os arquivos novos ignorando o cache do navegador e só então recarrega
  const urls = [location.pathname].concat(Array.from(document.querySelectorAll('script[type="module"][src], link[rel="stylesheet"][href]')).map(el => el.getAttribute('src') || el.getAttribute('href')));
  Promise.all(urls.map(u => fetch(u, { cache: 'reload' }).catch(() => {}))).then(() => location.reload());
}
export function showUpdatePrompt(remoteVersion){
  if(G.updatePromptShown) return;
  G.updatePromptShown = true;
  const ov = document.createElement('div');
  ov.className = 'overlay show update-overlay';
  ov.id = 'updateOverlay';
  ov.setAttribute('role', 'alertdialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-labelledby', 'updateTitle');
  ov.innerHTML = `
    <div class="modal update-modal">
      <div class="update-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 4v5h-5"/></svg></div>
      <h3 id="updateTitle">Nova versão disponível</h3>
      <p>O sistema foi atualizado e traz novos recursos. Para continuar, atualize agora. O que você estava fazendo fica salvo.</p>
      <button type="button" class="btn" id="updateNowBtn">Atualizar agora</button>
    </div>`;
  document.body.appendChild(ov);
  const btn = ov.querySelector('#updateNowBtn');
  btn.focus();
  // aviso obrigatório: Esc e clique fora não fecham
  ov.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); } });
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Atualizando…';
    try{ commitOpenEditors(); }catch(e){}
    try{ await Promise.race([flushAutoSave(), new Promise(r => setTimeout(r, 5000))]); }catch(e){}
    G.reloadForUpdate();
  };
}
setInterval(() => { if(!document.hidden) checkForAppUpdate(); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) checkForAppUpdate(); });
window.addEventListener('focus', () => checkForAppUpdate());
setTimeout(() => checkForAppUpdate(true), 20000);

export function updateFileStatus(){
  const dotSettings = document.getElementById('statusDotSettings');
  const textSettings = document.getElementById('statusTextSettings');
  const cls = 'status-dot ' + (G.dirty ? 'dirty' : 'saved');
  const title = G.dirty ? 'Alterações não salvas' : 'Sincronizado';
  const badge = document.getElementById('saveErrorBadge');
  if(badge) badge.style.display = G.cloudWriteFailed ? 'flex' : 'none';
  if(G.cloudSession){
    if(dotSettings){ dotSettings.className = G.cloudWriteFailed ? 'status-dot dirty' : cls; dotSettings.title = G.cloudWriteFailed ? 'Falha ao salvar na nuvem — tentando de novo' : title; }
    if(textSettings) textSettings.textContent = `${G.cloudSession.user.email} (nuvem)`;
  } else if(G.fileHandle){
    const name = G.fileHandle.name || 'douno-tasks.json';
    if(dotSettings){ dotSettings.className = cls; dotSettings.title = title; }
    if(textSettings) textSettings.textContent = name;
  } else {
    if(dotSettings){ dotSettings.className = 'status-dot'; dotSettings.title = ''; }
    if(textSettings) textSettings.textContent = 'Sem arquivo conectado';
  }
}

export async function saveFileAs(){
  if(!window.showSaveFilePicker){ downloadFallback(); return; }
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
    updateFileStatus();
  }catch(e){ if(e.name !== 'AbortError') console.error(e); }
}

export async function openFile(){
  if(!window.showOpenFilePicker){
    alert('Seu navegador não suporta a File System Access API. Use Chrome ou Edge para abrir/salvar o douno-tasks.json diretamente. Enquanto isso, os dados continuam salvos no navegador.');
    return;
  }
  try{
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
    });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(parsed && parsed.categories){
      G.state = parsed;
      normalizeState();
      applyTheme();
      G.fileHandle = handle;
      await idbSetHandle('main', handle);
      localStorage.removeItem('tyvraSkipFileLink');
      G.dirty = false;
      saveToLocalStorage();
      updateFileStatus();
      render();
    } else {
      alert('Arquivo inválido para o DOUNO Tasks.');
    }
  }catch(e){
    if(e.name !== 'AbortError') console.error(e);
  }
}

export async function saveFile(){
  if(!window.showSaveFilePicker){
    downloadFallback();
    return;
  }
  try{
    if(!G.fileHandle){
      G.fileHandle = await window.showSaveFilePicker({
        suggestedName: 'douno-tasks.json',
        types: [{ description: 'DOUNO Tasks JSON', accept: {'application/json': ['.json']} }]
      });
      await idbSetHandle('main', G.fileHandle);
      localStorage.removeItem('tyvraSkipFileLink');
    }
    const writable = await G.fileHandle.createWritable();
    await writable.write(JSON.stringify(G.state, null, 2));
    await writable.close();
    G.dirty = false;
    updateFileStatus();
  }catch(e){
    if(e.name !== 'AbortError') console.error(e);
  }
}

export function downloadFallback(){
  const blob = new Blob([JSON.stringify(G.state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'douno-tasks.json'; a.click();
  URL.revokeObjectURL(url);
}

