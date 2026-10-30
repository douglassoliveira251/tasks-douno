/* ===================== NUVEM: persistência ===================== */
async function fetchCloudStateRow(){
  const { data, error } = await sbClient
    .from('taskin_state')
    .select('data, updated_at')
    .eq('user_id', cloudSession.user.id)
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
const SYNC_COLLECTIONS = ['categories', 'tags', 'tasks', 'notes', 'events', 'notebooks', 'taskTemplates', 'projects'];
let cloudBaseUpdatedAt = null;
let cloudBaseSnapshot = null;

function syncHash(value){
  const str = JSON.stringify(value === undefined ? null : value);
  let h = 0x811c9dc5;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + ':' + str.length;
}
function makeSyncSnapshot(st){
  const snap = { cols: {}, keys: {} };
  SYNC_COLLECTIONS.forEach(c => {
    const m = {};
    (Array.isArray(st[c]) ? st[c] : []).forEach(it => { if(it && it.id !== undefined) m[it.id] = syncHash(it); });
    snap.cols[c] = m;
  });
  Object.keys(st).forEach(k => { if(!SYNC_COLLECTIONS.includes(k)) snap.keys[k] = syncHash(st[k]); });
  return snap;
}
function mergeStates(base, local, remote){
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
function normalizeRemoteData(data){
  const saved = state;
  state = data;
  try{ normalizeState(); } finally { state = saved; }
  return data;
}
function adoptCloudRow(row){
  cloudBaseUpdatedAt = row ? row.updated_at : null;
  cloudBaseSnapshot = makeSyncSnapshot(state);
}

async function loadStateFromCloud(){
  const row = await fetchCloudStateRow();
  if(row && row.data && typeof row.data === 'object'){
    state = row.data;
  }
  normalizeState();
  if(!row){
    await writeStateToCloud();
  } else {
    adoptCloudRow(row);
  }
}

async function writeStateToCloud(){
  if(!cloudSession) return;
  const uid = cloudSession.user.id;
  let mergedFromRemote = false;
  for(let attempt = 0; attempt < 4; attempt++){
    const row = await fetchCloudStateRow();
    if(row && row.data && typeof row.data === 'object'){
      const changedRemotely = !cloudBaseUpdatedAt || Date.parse(row.updated_at) !== Date.parse(cloudBaseUpdatedAt);
      if(changedRemotely){
        const remote = normalizeRemoteData(row.data);
        const base = cloudBaseSnapshot || makeSyncSnapshot(remote);
        state = mergeStates(base, state, remote);
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
        .update({ data: state, updated_at: stamp })
        .eq('user_id', uid)
        .eq('updated_at', row.updated_at)
        .select('updated_at');
    } else {
      result = await sbClient.from('taskin_state')
        .insert({ user_id: uid, data: state, updated_at: stamp })
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
  claimLocalCache(cloudSession.user);
  try{
    await loadStateFromCloud();
  }catch(e){ console.error('Erro ao carregar dados da nuvem', e); }
  if(cloudSession.user.email && state.profile.email !== cloudSession.user.email){
    state.profile.email = cloudSession.user.email;
  }
  const metaName = cloudSession.user.user_metadata && cloudSession.user.user_metadata.name;
  if(metaName && !state.profile.name){
    state.profile.name = String(metaName).trim().slice(0, 80);
    markDirty();
  }
  applyTheme();
  if(state.defaultCategoryFilter) activeCategoryFilter = state.defaultCategoryFilter;
  if(state.calendarViewDefault) calendarView = state.calendarViewDefault;
  loadUiSession();
  closeLoginGate();
  handleOutlookRedirectFeedback();
  render();
  updateFileStatus();
  if(pendingOutlookToast){ showToast(pendingOutlookToast); pendingOutlookToast = null; }
}

function showToast(message){
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

function dounoIconSvg(color){
  return `<svg viewBox="0 0 512 512" fill="none"><path d="M112 152H292 C364 152 408 192 408 256 C408 320 364 360 292 360 H112 V300" stroke="${color}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const DOUNO_WORDMARK_SRC = document.querySelector('.sidebar-wordmark-img').getAttribute('src');

let loginMode = 'login'; // 'login' | 'signup' | 'verify'
let signupDraft = { name: '', email: '', terms: false };
let resendUntil = 0;
let resendTimer = null;

const LOGIN_EYE_OPEN = '<svg id="loginPwEyeOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const LOGIN_EYE_CLOSED = '<svg id="loginPwEyeClosed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.4 21.4 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a21.4 21.4 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
const LOGIN_ERR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; flex-shrink:0; margin-top:1px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
const LOGIN_MAIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

