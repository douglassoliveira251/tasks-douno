function renderPersonalizationPanel(panel){
  const isDark = state.theme === 'dark';
  const WEEKDAY_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  panel.innerHTML = `
    <h3 class="settings-section-title">Personalização</h3>
    <p class="settings-section-desc">Ajuste a aparência do sistema.</p>
    <label class="theme-toggle-switch">
      <span class="settings-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14A8 8 0 1110 4a6.5 6.5 0 0010 10z"/></svg></span>
      <div style="flex:1; min-width:0;">
        <div class="theme-toggle-title">Modo escuro</div>
        <div class="theme-toggle-desc">Interface com fundo escuro, mais confortável em ambientes com pouca luz.</div>
      </div>
      <input type="checkbox" id="personalizationThemeInput" ${isDark?'checked':''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>

    <h3 class="settings-section-title" style="margin-top:28px;">Calendário</h3>
    <p class="settings-section-desc">Preferências de exibição do calendário.</p>
    <div class="settings-row">
      <span class="settings-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg></span>
      <div style="flex:1; min-width:0;">
        <div class="theme-toggle-title">Dia de início da semana</div>
        <div class="theme-toggle-desc">Define a primeira coluna da semana e do mês no calendário.</div>
      </div>
      <select class="tp-select settings-row-select" id="weekStartDaySelect">
        ${WEEKDAY_FULL.map((name, idx) => `<option value="${idx}" ${state.weekStartDay===idx?'selected':''}>${name}</option>`).join('')}
      </select>
    </div>
    <label class="theme-toggle-switch" style="margin-top:10px;">
      <span class="settings-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></span>
      <div style="flex:1; min-width:0;">
        <div class="theme-toggle-title">Feriados nacionais</div>
        <div class="theme-toggle-desc">Mostra os feriados do Brasil no mês, na semana e no dia.</div>
      </div>
      <input type="checkbox" id="showHolidaysInput" ${state.showHolidays !== false ? 'checked' : ''}>
      <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
    </label>
  `;
  panel.querySelector('#showHolidaysInput').addEventListener('change', e => {
    state.showHolidays = e.target.checked;
    markDirty();
  });
  panel.querySelector('#personalizationThemeInput').addEventListener('change', () => {
    toggleTheme();
  });
  panel.querySelector('#weekStartDaySelect').addEventListener('change', e => {
    state.weekStartDay = parseInt(e.target.value, 10);
    markDirty();
  });
}

function importBackupFile(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if(!file) return;
    try{
      const parsed = JSON.parse(await file.text());
      if(!(parsed && parsed.categories && Array.isArray(parsed.tasks))){
        alert('Arquivo inválido para o DOUNO Tasks.');
        return;
      }
      const summary = `${parsed.tasks.length} tarefas, ${(parsed.notes||[]).length} notas e ${(parsed.events||[]).length} agendas`;
      if(!confirm(`Importar este backup (${summary})? Isso substitui tudo que está salvo na sua conta agora.`)) return;
      state = parsed;
      normalizeState();
      applyTheme();
      markDirty();
    }catch(e){
      console.error(e);
      alert('Não foi possível ler esse arquivo.');
    }
  };
  input.click();
}

function renderFilePanel(panel){
  if(cloudSession){
    panel.innerHTML = `
      <h3 class="settings-section-title">Backup</h3>
      <p class="settings-section-desc">Seus dados ficam salvos na nuvem. Baixe uma cópia em arquivo para guardar, ou importe uma cópia anterior (substitui o que está na conta).</p>
      <div class="file-bar-name" style="margin-bottom:16px; font-size:13px;">
        <span class="status-dot" id="statusDotSettings"></span><span id="statusTextSettings"></span>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="file-bar-btn primary" id="downloadBackupBtn">Baixar backup</button>
        <button class="file-bar-btn" id="importBackupBtn">Importar backup</button>
      </div>
    `;
    document.getElementById('downloadBackupBtn').onclick = downloadFallback;
    document.getElementById('importBackupBtn').onclick = importBackupFile;
    updateFileStatus();
    return;
  }
  panel.innerHTML = `
    <h3 class="settings-section-title">Arquivo base</h3>
    <p class="settings-section-desc">Abra, salve ou troque o arquivo <code>douno-tasks.json</code> usado para guardar seus dados.</p>
    <div class="file-bar-name" style="margin-bottom:16px; font-size:13px;">
      <span class="status-dot" id="statusDotSettings"></span><span id="statusTextSettings">douno-tasks.json</span>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button class="file-bar-btn" id="openFileBtnSettings">Abrir arquivo</button>
      <button class="file-bar-btn" id="saveAsFileBtnSettings">Salvar como...</button>
      <button class="file-bar-btn primary" id="saveFileBtnSettings">Salvar</button>
    </div>
  `;
  document.getElementById('openFileBtnSettings').onclick = openFile;
  document.getElementById('saveAsFileBtnSettings').onclick = saveFileAs;
  document.getElementById('saveFileBtnSettings').onclick = saveFile;
  updateFileStatus();
}

const ICS_FEED_BASE_URL = SUPABASE_URL + '/functions/v1/ics-feed';
function generateIcsToken(){
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
async function fetchIcsToken(){
  if(!sbClient || !cloudSession) return null;
  const { data, error } = await sbClient.from('taskin_state').select('ics_token').eq('user_id', cloudSession.user.id).maybeSingle();
  if(error){ console.error(error); return null; }
  return data ? data.ics_token : null;
}
async function regenerateIcsToken(){
  if(!sbClient || !cloudSession) return null;
  const token = generateIcsToken();
  const { error } = await sbClient.from('taskin_state').update({ ics_token: token }).eq('user_id', cloudSession.user.id);
  if(error) throw error;
  return token;
}
function renderIntegrationsPanel(panel){
  panel.innerHTML = `
    <h3 class="settings-section-title">Integrações</h3>
    <p class="settings-section-desc">Leve suas agendas do DOUNO Tasks para outros calendários.</p>

    <h3 class="settings-section-title" style="margin-top:24px;">Outlook (Microsoft)</h3>
    <p class="settings-section-desc">Conecte sua conta Microsoft pessoal para que as agendas do DOUNO Tasks virem eventos de verdade no seu Outlook — editáveis, com categoria, e que você pode encaminhar. Só nessa direção (DOUNO Tasks → Outlook).</p>
    <div id="outlookStatusRow" style="display:flex; align-items:center; gap:10px; margin-top:10px; flex-wrap:wrap;"></div>
    <p id="outlookHint" style="font-size:12px; margin-top:8px;"></p>

    <h3 class="settings-section-title" style="margin-top:28px;">Link de assinatura (.ics)</h3>
    <p class="settings-section-desc">Alternativa sem login: um link que o Google Agenda (ou qualquer calendário) pode assinar. É somente leitura — no Outlook, itens vindos daqui não podem ser encaminhados nem categorizados.</p>
    ${!cloudSession ? `
      <p class="settings-section-desc" style="margin-top:14px;"><strong>Disponível apenas com a conta na nuvem conectada.</strong> Entre com sua conta em Perfil para gerar o link de assinatura.</p>
    ` : `
      <div class="tp-field" style="max-width:520px;">
        <label class="tp-label">Link de assinatura (somente leitura)</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="tp-input" id="icsFeedUrlInput" readonly value="Gerando..." style="flex:1; font-size:12px;">
          <button class="btn ghost small" id="copyIcsLinkBtn" style="white-space:nowrap;">Copiar</button>
        </div>
      </div>
      <p class="settings-section-desc" style="margin-top:10px;">
        No Google Agenda: <strong>Outras agendas → Por URL</strong>, cole o link acima. A sincronização não é instantânea.
      </p>
      <button class="btn ghost small" id="regenIcsLinkBtn" style="margin-top:6px;">Gerar novo link</button>
      <p class="settings-section-desc" style="margin-top:6px;">Gerar um novo link invalida o anterior — use se achar que alguém mais teve acesso a ele.</p>
    `}
  `;
  renderOutlookStatus();
  if(!cloudSession) return;
  const urlInput = panel.querySelector('#icsFeedUrlInput');
  const applyToken = (token) => {
    urlInput.value = token ? `${ICS_FEED_BASE_URL}?token=${token}` : '';
  };
  (async () => {
    let token = await fetchIcsToken();
    if(!token){
      try{ token = await regenerateIcsToken(); }catch(e){ console.error(e); }
    }
    applyToken(token);
  })();
  panel.querySelector('#copyIcsLinkBtn').onclick = (e) => {
    urlInput.select();
    navigator.clipboard.writeText(urlInput.value).then(() => {
      const btn = e.currentTarget;
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }).catch(() => {});
  };
  panel.querySelector('#regenIcsLinkBtn').onclick = async () => {
    urlInput.value = 'Gerando...';
    try{
      const token = await regenerateIcsToken();
      applyToken(token);
    }catch(e){
      console.error(e);
      urlInput.value = '';
      urlInput.placeholder = 'Falha ao gerar o link. Tente novamente.';
    }
  };
}

function renderProfilePanel(panel){
  tempAvatarData = state.profile.avatar || null;
  panel.innerHTML = `
    <h3 class="settings-section-title">Perfil</h3>
    <p class="settings-section-desc">Sua foto e nome exibidos na barra lateral.</p>
    <div class="profile-form">
      <label>Foto de perfil</label>
      <div class="avatar-picker">
        <span class="avatar-preview" id="avatarPreview"></span>
        <div>
          <button class="btn ghost small" id="pickPhotoBtn">Carregar foto</button>
          <input type="file" id="photoInput" accept="image/*" style="display:none;">
        </div>
      </div>
      <label>Nome</label>
      <input type="text" id="profileNameInput" placeholder="Seu nome">
      <div style="margin-top:16px; display:flex; align-items:center; gap:10px;">
        <button class="btn small" id="saveProfileBtn">Salvar perfil</button>
        <span id="profileSaveHint" style="font-size:12px; color:var(--primary-dark);"></span>
      </div>
    </div>

    <h3 class="settings-section-title" style="margin-top:28px;">Conta</h3>
    ${!cloudSession ? `
      <p class="settings-section-desc">Conecte-se com uma conta na nuvem para gerenciar o e-mail e a senha de login.</p>
    ` : `
      <p class="settings-section-desc">E-mail e senha usados para entrar no DOUNO Tasks.</p>
      <div class="tp-field" style="max-width:360px;">
        <label class="tp-label">E-mail de login</label>
        <div style="display:flex; gap:8px;">
          <input type="email" class="tp-input" id="accountEmailDisplay" readonly value="${escapeHtml(cloudSession.user.email||'')}" style="flex:1;">
          <button class="btn ghost small" id="changeEmailToggleBtn" style="white-space:nowrap;">Alterar</button>
        </div>
        <div id="changeEmailForm" style="display:none; margin-top:10px;">
          <label class="tp-label">Novo e-mail</label>
          <input type="email" class="tp-input" id="newEmailInput" placeholder="novo@email.com">
          <div style="margin-top:8px; display:flex; align-items:center; gap:10px;">
            <button class="btn small" id="confirmChangeEmailBtn">Confirmar</button>
            <span id="changeEmailHint" style="font-size:12px;"></span>
          </div>
        </div>
      </div>
      <div class="tp-field" style="max-width:360px; margin-top:18px;">
        <label class="tp-label">Senha</label>
        <div><button class="btn ghost small" id="changePasswordToggleBtn">Alterar senha</button></div>
        <div id="changePasswordForm" style="display:none; margin-top:10px;">
          <label class="tp-label">Nova senha</label>
          <input type="password" class="tp-input" id="newPasswordInput" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
          <label class="tp-label" style="margin-top:8px;">Confirmar nova senha</label>
          <input type="password" class="tp-input" id="confirmPasswordInput" placeholder="Repita a nova senha" autocomplete="new-password">
          <div style="margin-top:8px; display:flex; align-items:center; gap:10px;">
            <button class="btn small" id="confirmChangePasswordBtn">Salvar nova senha</button>
            <span id="changePasswordHint" style="font-size:12px;"></span>
          </div>
        </div>
      </div>
    `}
  `;
  document.getElementById('profileNameInput').value = state.profile.name || '';
  document.getElementById('avatarPreview').innerHTML = avatarInnerHtml({ name: state.profile.name, avatar: tempAvatarData });

  document.getElementById('pickPhotoBtn').onclick = () => document.getElementById('photoInput').click();
  document.getElementById('photoInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => openCropModal(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  document.getElementById('saveProfileBtn').onclick = () => {
    state.profile.name = document.getElementById('profileNameInput').value.trim();
    state.profile.avatar = tempAvatarData;
    markDirty();
    const hint = document.getElementById('profileSaveHint');
    if(hint){ hint.textContent = 'Salvo!'; setTimeout(() => { if(hint) hint.textContent = ''; }, 1500); }
  };

  if(!cloudSession) return;

  const changeEmailForm = document.getElementById('changeEmailForm');
  document.getElementById('changeEmailToggleBtn').onclick = () => {
    changeEmailForm.style.display = changeEmailForm.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('confirmChangeEmailBtn').onclick = async () => {
    const newEmail = document.getElementById('newEmailInput').value.trim();
    const hint = document.getElementById('changeEmailHint');
    if(!newEmail){ hint.style.color = 'var(--danger)'; hint.textContent = 'Digite o novo e-mail.'; return; }
    hint.style.color = 'var(--ink-soft)'; hint.textContent = 'Enviando...';
    try{
      const { error } = await sbClient.auth.updateUser({ email: newEmail });
      if(error) throw error;
      hint.style.color = 'var(--primary-dark)';
      hint.textContent = 'Verifique seu e-mail para confirmar a troca.';
    }catch(e){
      console.error(e);
      hint.style.color = 'var(--danger)';
      hint.textContent = 'Não foi possível trocar o e-mail agora.';
    }
  };

  const changePasswordForm = document.getElementById('changePasswordForm');
  document.getElementById('changePasswordToggleBtn').onclick = () => {
    changePasswordForm.style.display = changePasswordForm.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('confirmChangePasswordBtn').onclick = async () => {
    const pw1 = document.getElementById('newPasswordInput').value;
    const pw2 = document.getElementById('confirmPasswordInput').value;
    const hint = document.getElementById('changePasswordHint');
    if(pw1.length < 6){ hint.style.color = 'var(--danger)'; hint.textContent = 'A senha precisa ter ao menos 6 caracteres.'; return; }
    if(pw1 !== pw2){ hint.style.color = 'var(--danger)'; hint.textContent = 'As senhas não coincidem.'; return; }
    hint.style.color = 'var(--ink-soft)'; hint.textContent = 'Salvando...';
    try{
      const { error } = await sbClient.auth.updateUser({ password: pw1 });
      if(error) throw error;
      hint.style.color = 'var(--primary-dark)';
      hint.textContent = 'Senha alterada!';
      document.getElementById('newPasswordInput').value = '';
      document.getElementById('confirmPasswordInput').value = '';
    }catch(e){
      console.error(e);
      hint.style.color = 'var(--danger)';
      hint.textContent = 'Não foi possível alterar a senha agora.';
    }
  };
}

