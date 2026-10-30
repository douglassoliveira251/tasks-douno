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

function loginErrorText(err){
  const code = err && err.code ? String(err.code) : '';
  const msg = err && err.message ? String(err.message) : '';
  if(code === 'user_already_exists' || /already registered/i.test(msg)) return 'Este e-mail já tem conta. Entre ou use "Esqueci minha senha".';
  if(code === 'weak_password') return 'Senha fraca. Use 8 ou mais caracteres, com letras e números.';
  if(code === 'email_address_invalid') return 'E-mail inválido.';
  if(code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || (err && err.status === 429)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if(code === 'otp_expired' || /expired or is invalid/i.test(msg)) return 'Código inválido ou expirado. Peça um novo.';
  return 'Não foi possível concluir agora. Tente de novo.';
}
function passwordIssue(pw){
  if(pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use 8 ou mais caracteres, com letras e números.';
  return '';
}
function passwordStrength(pw){
  let s = 0;
  if(pw.length >= 8) s++;
  if(/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if(pw.length >= 12) s++;
  if(/[^A-Za-z0-9]/.test(pw) && /[A-Z]/.test(pw)) s++;
  return s;
}

function loginPasswordFieldHtml(autocomplete){
  return `<div class="login-field">
    <label for="loginPassword">Senha</label>
    <div class="login-password-wrap">
      <input type="password" id="loginPassword" required autocomplete="${autocomplete}">
      <button type="button" class="login-password-toggle" id="loginPasswordToggle" aria-label="Mostrar senha">${LOGIN_EYE_OPEN}${LOGIN_EYE_CLOSED}</button>
    </div>
  </div>`;
}
function loginTabsHtml(){
  return `<div class="login-tabs" role="tablist">
    <button type="button" class="login-tab${loginMode === 'login' ? ' active' : ''}" data-mode="login" role="tab">Entrar</button>
    <button type="button" class="login-tab${loginMode === 'signup' ? ' active' : ''}" data-mode="signup" role="tab">Criar conta</button>
  </div>`;
}

function renderLoginGate(errorMsg){
  const body = document.getElementById('loginModalBody');
  clearInterval(resendTimer);
  const err = errorMsg ? `<div class="login-error">${LOGIN_ERR_ICON}<span>${escapeHtml(errorMsg)}</span></div>` : '';
  let inner;
  if(loginMode === 'verify'){
    inner = `
      <div class="login-mail-ic">${LOGIN_MAIL_ICON}</div>
      <h1 class="login-title">Confirme seu e-mail</h1>
      <p class="login-subtitle">Enviamos um código de 6 dígitos para <b>${escapeHtml(signupDraft.email)}</b>.</p>
      <form id="verifyForm" class="login-form" novalidate>
        <div class="login-otp" id="loginOtp">${[0,1,2,3,4,5].map(i => `<input type="text" inputmode="numeric" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" maxlength="1" aria-label="Dígito ${i + 1}">`).join('')}</div>
        ${err}
        <button type="submit" class="btn login-submit-btn" id="verifySubmitBtn">Confirmar</button>
        <button type="button" id="loginResendBtn" class="login-forgot-btn"></button>
        <button type="button" id="loginBackBtn" class="login-forgot-btn" style="margin-top:4px;">E-mail errado? Voltar</button>
      </form>`;
  } else if(loginMode === 'signup'){
    inner = `
      <h1 class="login-title">Criar conta</h1>
      <p class="login-subtitle">Leva menos de um minuto.</p>
      ${loginTabsHtml()}
      <form id="signupForm" class="login-form" novalidate>
        <div class="login-field">
          <label for="signupName">Nome</label>
          <input type="text" id="signupName" required autocomplete="name" maxlength="80" value="${escapeHtml(signupDraft.name)}">
        </div>
        <div class="login-field">
          <label for="signupEmail">E-mail</label>
          <input type="email" id="signupEmail" required autocomplete="username" value="${escapeHtml(signupDraft.email)}">
        </div>
        ${loginPasswordFieldHtml('new-password')}
        <div class="login-strength" id="loginStrength"><i></i><i></i><i></i><i></i></div>
        <div class="login-hint">Use 8 ou mais caracteres, com letras e números.</div>
        <label class="login-terms"><input type="checkbox" id="signupTerms"${signupDraft.terms ? ' checked' : ''}><span>Li e aceito os Termos de Uso e a Política de Privacidade.</span></label>
        ${err}
        <button type="submit" class="btn login-submit-btn" id="signupSubmitBtn">Criar conta</button>
      </form>`;
  } else {
    inner = `
      <h1 class="login-title">Entrar</h1>
      <p class="login-subtitle">Acesse sua conta do Douno Tasks.</p>
      ${loginTabsHtml()}
      <form id="loginForm" class="login-form" novalidate>
        <div class="login-field">
          <label for="loginEmail">E-mail</label>
          <input type="email" id="loginEmail" required autocomplete="username">
        </div>
        ${loginPasswordFieldHtml('current-password')}
        ${err}
        <button type="submit" class="btn login-submit-btn" id="loginSubmitBtn">Entrar</button>
        <button type="button" id="loginForgotBtn" class="login-forgot-btn">Esqueci minha senha</button>
      </form>`;
  }
  body.innerHTML = `
    <aside class="login-aside">
      <div class="login-aside-brand login-brand-lockup"><img class="login-wordmark-img" src="${DOUNO_WORDMARK_SRC}" alt="Douno"><span class="login-brand-sub">Tasks</span></div>
      <div class="login-aside-pitch">
        <h2>Organize tarefas, notas e calendário no seu ritmo.</h2>
        <p>Tudo num só lugar, com indicadores claros do que importa — e sincronizado com segurança entre seus dispositivos.</p>
      </div>
      <div class="login-aside-foot">Seus dados protegidos e sincronizados na nuvem.</div>
      <div class="login-aside-watermark">${dounoIconSvg('#ffffff')}</div>
    </aside>
    <div class="login-main">
      <div class="login-main-inner">
        <div class="login-mobile-brand login-brand-lockup"><img class="login-wordmark-img" src="${DOUNO_WORDMARK_SRC}" alt="Douno"><span class="login-brand-sub">Tasks</span></div>
        ${inner}
      </div>
    </div>
  `;
  document.querySelectorAll('.login-tab').forEach(b => {
    b.onclick = () => { loginMode = b.dataset.mode; renderLoginGate(); };
  });
  const toggle = document.getElementById('loginPasswordToggle');
  if(toggle) toggle.onclick = () => {
    const input = document.getElementById('loginPassword');
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    document.getElementById('loginPwEyeOpen').style.display = isPw ? 'none' : 'block';
    document.getElementById('loginPwEyeClosed').style.display = isPw ? 'block' : 'none';
    toggle.setAttribute('aria-label', isPw ? 'Ocultar senha' : 'Mostrar senha');
  };
  if(loginMode === 'verify') bindLoginVerify();
  else if(loginMode === 'signup') bindLoginSignup();
  else bindLoginSignin();
}

function bindLoginSignin(){
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';
    try{
      const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
      if(error) throw error;
      cloudSession = data.session;
      await startCloudSession();
    }catch(err){
      console.error(err);
      if(err && err.code === 'email_not_confirmed'){
        signupDraft.email = email;
        loginMode = 'verify';
        try{ await sbClient.auth.resend({ type: 'signup', email }); resendUntil = Date.now() + 60000; }catch(e2){ console.error(e2); }
        renderLoginGate();
        return;
      }
      renderLoginGate('E-mail ou senha inválidos.');
    }
  });
  document.getElementById('loginForgotBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    if(!email){ renderLoginGate('Digite seu e-mail acima e clique em "Esqueci minha senha" de novo.'); return; }
    try{
      const { error } = await sbClient.auth.resetPasswordForEmail(email);
      if(error) throw error;
      renderLoginGate('Se esse e-mail tiver conta, enviamos um link de redefinição de senha.');
    }catch(err){
      console.error(err);
      renderLoginGate('Não foi possível enviar o e-mail de redefinição agora.');
    }
  };
}

function bindLoginSignup(){
  const pw = document.getElementById('loginPassword');
  const bars = document.querySelectorAll('#loginStrength i');
  pw.addEventListener('input', () => {
    const s = passwordStrength(pw.value);
    bars.forEach((b, i) => { b.className = i < s ? (s <= 2 ? 'warn' : 'on') : ''; });
  });
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = pw.value;
    const terms = document.getElementById('signupTerms').checked;
    signupDraft = { name, email, terms };
    if(!name){ renderLoginGate('Informe seu nome.'); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ renderLoginGate('Informe um e-mail válido.'); return; }
    const issue = passwordIssue(password);
    if(issue){ renderLoginGate(issue); return; }
    if(!terms){ renderLoginGate('Aceite os Termos e a Política de Privacidade para continuar.'); return; }
    const btn = document.getElementById('signupSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Criando...';
    try{
      const { data, error } = await sbClient.auth.signUp({ email, password, options: { data: { name } } });
      if(error) throw error;
      if(data.session){
        cloudSession = data.session;
        await startCloudSession();
        return;
      }
      loginMode = 'verify';
      resendUntil = Date.now() + 60000;
      renderLoginGate();
    }catch(err){
      console.error(err);
      renderLoginGate(loginErrorText(err));
    }
  });
}

function bindLoginVerify(){
  const inputs = Array.from(document.querySelectorAll('#loginOtp input'));
  const submit = async () => {
    const token = inputs.map(i => i.value).join('');
    if(token.length < 6) return;
    inputs.forEach(i => { i.disabled = true; });
    const btn = document.getElementById('verifySubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Confirmando...';
    try{
      const { data, error } = await sbClient.auth.verifyOtp({ email: signupDraft.email, token, type: 'signup' });
      if(error) throw error;
      cloudSession = data.session;
      await startCloudSession();
    }catch(err){
      console.error(err);
      renderLoginGate(loginErrorText(err));
    }
  };
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if(inp.value && inputs[i + 1]) inputs[i + 1].focus();
      if(inputs.every(x => x.value)) submit();
    });
    inp.addEventListener('keydown', (ev) => {
      if(ev.key === 'Backspace' && !inp.value && inputs[i - 1]){ inputs[i - 1].value = ''; inputs[i - 1].focus(); }
    });
    inp.addEventListener('paste', (ev) => {
      const digits = ((ev.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if(!digits) return;
      ev.preventDefault();
      inputs.forEach((x, k) => { x.value = digits[k] || ''; });
      (inputs[Math.min(digits.length, 5)]).focus();
      if(digits.length === 6) submit();
    });
  });
  inputs[0].focus();
  document.getElementById('verifyForm').addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  document.getElementById('loginBackBtn').onclick = () => { loginMode = 'signup'; renderLoginGate(); };
  const rb = document.getElementById('loginResendBtn');
  const tick = () => {
    const s = Math.ceil((resendUntil - Date.now()) / 1000);
    if(s > 0){ rb.disabled = true; rb.textContent = 'Reenviar código (' + s + 's)'; }
    else { rb.disabled = false; rb.textContent = 'Reenviar código'; clearInterval(resendTimer); }
  };
  tick();
  resendTimer = setInterval(tick, 500);
  rb.onclick = async () => {
    rb.disabled = true;
    try{
      const { error } = await sbClient.auth.resend({ type: 'signup', email: signupDraft.email });
      if(error) throw error;
      resendUntil = Date.now() + 60000;
      showToast('Novo código enviado.');
      clearInterval(resendTimer);
      resendTimer = setInterval(tick, 500);
      tick();
    }catch(err){
      console.error(err);
      renderLoginGate(loginErrorText(err));
    }
  };
}

function closeLoginGate(){
  appUnlocked = true;
  document.getElementById('loginOverlay').classList.remove('show');
}

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


