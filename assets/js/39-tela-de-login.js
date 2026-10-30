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

