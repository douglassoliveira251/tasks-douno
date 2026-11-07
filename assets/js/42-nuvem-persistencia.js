import { G } from './globais.js';
import { SYNC_BASE_KEY, SYNC_PENDING_KEY, claimLocalCache, sbClient } from './02-nuvem.js';
import { applyTheme, handleOutlookRedirectFeedback } from './03-outlook.js';
import { normalizeState } from './07-normalizacao-do-estado.js';
import { isEditingSomething, markDirty, saveToLocalStorage, scheduleAutoSave } from './08-persistencia.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { closeLoginGate } from './43-tela-de-login.js';
import { loadUiSession, render } from './48-render-principal.js';
import { icon } from './icones.js';
G.fetchCloudStateRow = fetchCloudStateRow; G.writeStateToCloud = writeStateToCloud; G.startCloudSession = startCloudSession;

/* ===================== NUVEM: persistência ===================== */
async function fetchCloudStateRow(){
  const { data, error } = await sbClient
    .from('taskin_state')
    .select('data, updated_at')
    .eq('user_id', G.cloudSession.user.id)
    .maybeSingle();
  if(error) throw error;
  return data;
}

/* ---------- Sincronização com mais de uma sessão aberta ----------
   O estado inteiro é um único registro na nuvem. Antes, cada escrita
   sobrescrevia tudo às cegas: abrir o sistema em dois navegadores, alterar
   tarefas num e depois salvar qualquer coisa no outro (que ainda tinha a foto
   antiga) desfazia as alterações do primeiro — tarefas voltavam ao status
   anterior. Agora cada sessão lembra qual versão da nuvem ela leu
   (cloudBaseUpdatedAt) e uma "foto" do que leu (cloudBaseSnapshot). Ao salvar:
   1. se a nuvem mudou desde então, faz uma mesclagem de três vias, item a item
      (o que só eu mudei fica, o que só o outro mudou entra, e os dois lados
      são preservados);
   2. grava só se a versão da nuvem ainda é a que foi mesclada; se alguém
      gravou no meio, repete. */
export const SYNC_COLLECTIONS = ['categories', 'tags', 'tasks', 'notes', 'events', 'notebooks', 'taskTemplates', 'projects', 'completedLog'];
let cloudBaseUpdatedAt = null;
let cloudBaseSnapshot = null;

export function syncHash(value){
  const str = JSON.stringify(value === undefined ? null : value);
  let h = 0x811c9dc5;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + ':' + str.length;
}
export function makeSyncSnapshot(st){
  const snap = { cols: {}, keys: {} };
  SYNC_COLLECTIONS.forEach(c => {
    const m = {};
    (Array.isArray(st[c]) ? st[c] : []).forEach(it => { if(it && it.id !== undefined) m[it.id] = syncHash(it); });
    snap.cols[c] = m;
  });
  Object.keys(st).forEach(k => { if(!SYNC_COLLECTIONS.includes(k)) snap.keys[k] = syncHash(st[k]); });
  return snap;
}
export function mergeStates(base, local, remote){
  const out = {};
  const isStrArr = v => Array.isArray(v) && v.every(x => typeof x === 'string');
  const keys = new Set(Object.keys(local).concat(Object.keys(remote)).filter(k => !SYNC_COLLECTIONS.includes(k)));
  keys.forEach(k => {
    const hasL = k in local, hasR = k in remote;
    const lh = hasL ? syncHash(local[k]) : null;
    const rh = hasR ? syncHash(remote[k]) : null;
    const bh = (base.keys && k in base.keys) ? base.keys[k] : null;
    const lChanged = lh !== bh, rChanged = rh !== bh;
    if(lChanged && !rChanged){ if(hasL) out[k] = local[k]; }
    else if(rChanged && !lChanged){ if(hasR) out[k] = remote[k]; }
    else if(hasL && hasR && isStrArr(local[k]) && isStrArr(remote[k])){
      out[k] = Array.from(new Set(local[k].concat(remote[k])));
    } else if(hasL){ out[k] = local[k]; }
    else if(hasR){ out[k] = remote[k]; }
  });
  SYNC_COLLECTIONS.forEach(c => {
    const localArr = Array.isArray(local[c]) ? local[c] : [];
    const remoteArr = Array.isArray(remote[c]) ? remote[c] : [];
    const L = new Map(localArr.filter(i => i && i.id !== undefined).map(i => [i.id, i]));
    const R = new Map(remoteArr.filter(i => i && i.id !== undefined).map(i => [i.id, i]));
    const B = (base.cols && base.cols[c]) || {};
    const order = localArr.map(i => i && i.id).concat(remoteArr.map(i => i && i.id)).filter(id => id !== undefined && id !== null);
    const seen = new Set();
    const merged = [];
    order.forEach(id => {
      if(seen.has(id)) return;
      seen.add(id);
      const l = L.get(id), r = R.get(id);
      const bh = Object.prototype.hasOwnProperty.call(B, id) ? B[id] : undefined;
      if(l && r){
        const lh = syncHash(l), rh = syncHash(r);
        if(lh === rh){ merged.push(l); return; }
        const lChanged = bh === undefined || lh !== bh;
        const rChanged = bh === undefined || rh !== bh;
        if(lChanged && !rChanged) merged.push(l);
        else if(rChanged && !lChanged) merged.push(r);
        else {
          // os dois lados mudaram o mesmo item: vale o mais recente (empate: o daqui)
          const lt = l.updatedAt || l.completedAt || l.createdAt || 0;
          const rt = r.updatedAt || r.completedAt || r.createdAt || 0;
          merged.push(rt > lt ? r : l);
        }
      } else if(l){
        // sumiu na nuvem: se existia na base, outra sessão excluiu — só mantém se eu mexi nele
        if(bh === undefined || syncHash(l) !== bh) merged.push(l);
      } else if(r){
        // não tenho: se existia na base, eu excluí aqui; senão, é novo de outra sessão
        if(bh === undefined) merged.push(r);
      }
    });
    out[c] = merged;
  });
  return out;
}
export function normalizeRemoteData(data){
  const saved = G.state;
  G.state = data;
  try{ normalizeState(); } finally { G.state = saved; }
  return data;
}
export function adoptCloudRow(row){
  cloudBaseUpdatedAt = row ? row.updated_at : null;
  cloudBaseSnapshot = makeSyncSnapshot(G.state);
  /* guarda a base no aparelho: se a pessoa editar sem internet e reabrir o app, a mesclagem
     com a nuvem continua partindo da última versão que este aparelho viu */
  try{
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify({ uid: G.cloudSession && G.cloudSession.user ? G.cloudSession.user.id : null, updatedAt: cloudBaseUpdatedAt, snap: cloudBaseSnapshot }));
  }catch(e){}
}
export function hasPendingSync(){
  try{ return localStorage.getItem(SYNC_PENDING_KEY) === '1'; }catch(e){ return false; }
}
function restoreSyncBase(){
  try{
    const saved = JSON.parse(localStorage.getItem(SYNC_BASE_KEY) || 'null');
    if(saved && saved.snap && G.cloudSession && saved.uid === G.cloudSession.user.id){
      cloudBaseUpdatedAt = saved.updatedAt || null;
      cloudBaseSnapshot = saved.snap;
      return true;
    }
  }catch(e){}
  return false;
}

export async function loadStateFromCloud(){
  /* Alterações feitas sem internet e ainda não enviadas: NÃO podem ser trocadas pelo que está na nuvem.
     Mantém os dados do aparelho e deixa a escrita mesclar (três vias) e enviar. */
  const pending = hasPendingSync();
  restoreSyncBase();
  let row;
  try{
    row = await G.fetchCloudStateRow();
  }catch(e){
    G.dirty = pending; // sem conexão: segue com os dados guardados no aparelho
    throw e;
  }
  if(pending){
    normalizeState();
    G.dirty = true;
    return;
  }
  if(row && row.data && typeof row.data === 'object'){
    G.state = row.data;
  }
  normalizeState();
  if(!row){
    await G.writeStateToCloud();
  } else {
    adoptCloudRow(row);
  }
}

async function writeStateToCloud(){
  if(!G.cloudSession) return;
  const uid = G.cloudSession.user.id;
  let mergedFromRemote = false;
  for(let attempt = 0; attempt < 4; attempt++){
    const row = await G.fetchCloudStateRow();
    if(row && row.data && typeof row.data === 'object'){
      const changedRemotely = !cloudBaseUpdatedAt || Date.parse(row.updated_at) !== Date.parse(cloudBaseUpdatedAt);
      if(changedRemotely){
        const remote = normalizeRemoteData(row.data);
        const base = cloudBaseSnapshot || makeSyncSnapshot(remote);
        G.state = mergeStates(base, G.state, remote);
        normalizeState();
        mergedFromRemote = true;
        // a partir daqui a base passa a ser a versão da nuvem que acabou de ser mesclada
        cloudBaseSnapshot = makeSyncSnapshot(remote);
        cloudBaseUpdatedAt = row.updated_at;
      }
    }
    const stamp = new Date().toISOString();
    let result;
    if(row){
      result = await sbClient.from('taskin_state')
        .update({ data: G.state, updated_at: stamp })
        .eq('user_id', uid)
        .eq('updated_at', row.updated_at)
        .select('updated_at');
    } else {
      result = await sbClient.from('taskin_state')
        .insert({ user_id: uid, data: G.state, updated_at: stamp })
        .select('updated_at');
    }
    if(result.error) throw result.error;
    if(row && (!result.data || result.data.length === 0)) continue; // alguém gravou no meio: mescla de novo
    adoptCloudRow({ updated_at: (result.data && result.data[0] && result.data[0].updated_at) || stamp });
    if(mergedFromRemote){
      saveToLocalStorage();
      if(!isEditingSomething()) render();
    }
    return;
  }
  throw new Error('Conflito de sincronização: não foi possível mesclar com a nuvem.');
}

async function startCloudSession(){
  claimLocalCache(G.cloudSession.user);
  try{
    await loadStateFromCloud();
  }catch(e){ console.error('Erro ao carregar dados da nuvem', e); }
  if(G.cloudSession.user.email && G.state.profile.email !== G.cloudSession.user.email){
    G.state.profile.email = G.cloudSession.user.email;
  }
  const metaName = G.cloudSession.user.user_metadata && G.cloudSession.user.user_metadata.name;
  if(metaName && !G.state.profile.name){
    G.state.profile.name = String(metaName).trim().slice(0, 80);
    markDirty();
  }
  applyTheme();
  if(G.state.defaultCategoryFilter) G.activeCategoryFilter = G.state.defaultCategoryFilter;
  if(G.state.calendarViewDefault) G.calendarView = G.state.calendarViewDefault;
  loadUiSession();
  closeLoginGate();
  handleOutlookRedirectFeedback();
  render();
  updateFileStatus();
  if(G.dirty) scheduleAutoSave(); // havia alterações feitas sem internet: envia agora
  if(G.pendingOutlookToast){ showToast(G.pendingOutlookToast); G.pendingOutlookToast = null; }
}

export function showToast(message){
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = 'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ink); color:var(--surface); padding:10px 18px; border-radius:10px; font-size:13px; font-weight:500; box-shadow:var(--shadow-md); z-index:9999; opacity:0; transition:opacity .2s;';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* Aviso com um botão de ação (ex.: "Desfazer"). Fica visível por mais tempo e só um por vez. */
let undoToastEl = null;
export function showUndoToast(message, actionLabel, onAction){
  if(undoToastEl){ undoToastEl.remove(); undoToastEl = null; }
  const el = document.createElement('div');
  el.className = 'undo-toast';
  el.setAttribute('role', 'status');
  const msg = document.createElement('span');
  msg.textContent = message;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = actionLabel;
  el.append(msg, btn);
  document.body.appendChild(el);
  undoToastEl = el;
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => {
    if(undoToastEl === el) undoToastEl = null;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  };
  btn.onclick = () => { close(); onAction(); };
  setTimeout(close, 8000);
}

export function dounoIconSvg(color){
  return `<svg viewBox="0 0 512 512" fill="none"><path d="M112 152H292 C364 152 408 192 408 256 C408 320 364 360 292 360 H112 V300" stroke="${color}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export const DOUNO_WORDMARK_SRC = document.querySelector('.sidebar-wordmark-img').getAttribute('src');

G.loginMode = 'login'; // 'login' | 'signup' | 'verify'
G.signupDraft = { name: '', email: '', terms: false };
G.resendUntil = 0;
G.resendTimer = null;

export const LOGIN_EYE_OPEN = icon('eye', 'regular', ' id="loginPwEyeOpen"');
export const LOGIN_EYE_CLOSED = icon('eye-slash', 'regular', ' id="loginPwEyeClosed" style="display:none;"');
export const LOGIN_ERR_ICON = icon('warning-circle', 'regular', ' style="width:16px; height:16px; flex-shrink:0; margin-top:1px;"');
export const LOGIN_MAIL_ICON = icon('envelope-simple', 'regular', ' style="width:22px; height:22px;"');

