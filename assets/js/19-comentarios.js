/* ===================== COMENTÁRIOS ===================== */
function openFeedbackModal(){
  closeHelpPanel();
  let ov = document.getElementById('feedbackOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'feedbackOverlay';
    ov.innerHTML = '<div class="modal" id="feedbackModal" style="width:440px; max-width:calc(100vw - 24px);"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { ov._downOnBackdrop = (e.target === ov); });
    ov.addEventListener('click', e => { if(e.target === ov && ov._downOnBackdrop) ov.classList.remove('show'); });
  }
  const modal = ov.querySelector('#feedbackModal');
  let kind = 'good';
  const up = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>';
  const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>';
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="fbClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="nm-head">
      <div class="nm-kicker">Enviar comentários</div>
      <div class="nm-title-static">O que você achou?</div>
    </div>
    <div class="nm-body">
    <p class="nm-hint">A mensagem chega direto para quem cuida do sistema, junto com a versão e a tela onde você estava.</p>
    <div class="fb-kinds">
      <button type="button" class="fb-kind good on" data-kind="good">${up}Algo bom</button>
      <button type="button" class="fb-kind bad" data-kind="bad">${down}Algo ruim</button>
    </div>
    <textarea class="tp-textarea" id="fbMessage" rows="5" maxlength="2000" placeholder="Escreva aqui..."></textarea>
    <p id="fbError" style="display:none; color:var(--danger); font-size:12.5px; margin:6px 0 0;"></p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn ghost small" id="fbCancel">Cancelar</button>
      <button type="button" class="btn small" id="fbSend">Enviar</button>
    </div>`;
  modal.querySelectorAll('.fb-kind').forEach(b => {
    b.onclick = () => {
      kind = b.dataset.kind;
      modal.querySelectorAll('.fb-kind').forEach(x => x.classList.toggle('on', x === b));
    };
  });
  modal.className = 'modal nm nm-460';
  modal.querySelector('#fbCancel').onclick = () => ov.classList.remove('show');
  modal.querySelector('#fbClose').onclick = () => ov.classList.remove('show');
  modal.querySelector('#fbSend').onclick = async () => {
    const err = modal.querySelector('#fbError');
    const btn = modal.querySelector('#fbSend');
    const message = modal.querySelector('#fbMessage').value.trim();
    err.style.display = 'none';
    if(!message){ err.textContent = 'Escreva um comentário antes de enviar.'; err.style.display = 'block'; return; }
    if(!sbClient || !cloudSession){ err.textContent = 'Entre na sua conta para enviar comentários.'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Enviando...';
    try{
      const { data, error } = await sbClient.functions.invoke('send-feedback', {
        body: { kind, message, version: APP_VERSION, view: currentView, userAgent: navigator.userAgent },
      });
      if(error || (data && data.error)) throw (error || new Error(data.error));
      ov.classList.remove('show');
      closeHelpPanel();
      showToast('Obrigado! Seu comentário foi enviado.');
    }catch(e){
      console.error(e);
      err.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.';
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Enviar';
    }
  };
  ov.classList.add('show');
  setTimeout(() => modal.querySelector('#fbMessage').focus(), 0);
}
document.getElementById('helpFeedbackBtn').onclick = openFeedbackModal;

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

function getOrderedCategories(){
  const list = state.categories.slice();
  if(state.categoryOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderCategoriesPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Espaços</h3>
        <p class="settings-section-desc">Organize tarefas e notas por espaço. Clique na estrela para definir o espaço padrão ao abrir o sistema.</p>
      </div>
      <div class="settings-order-control">
        <span class="settings-order-label">Ordenar por:</span>
        <select class="tp-select settings-order-select" id="catOrderSelect">
          <option value="creation" ${state.categoryOrder==='creation'?'selected':''}>Criação</option>
          <option value="alphabetical" ${state.categoryOrder==='alphabetical'?'selected':''}>Alfabética</option>
          <option value="custom" ${state.categoryOrder==='custom'?'selected':''}>Personalizada</option>
        </select>
      </div>
    </div>
    <div id="catRows"></div>
    <button class="btn ghost small" id="addCatBtn" style="margin-top:10px;">+ Adicionar espaço</button>
  `;
  document.getElementById('catOrderSelect').addEventListener('change', e => {
    state.categoryOrder = e.target.value;
    markDirty();
    renderCatRows();
  });
  renderCatRows();
  document.getElementById('addCatBtn').onclick = () => {
    const color = DEFAULT_COLORS[state.categories.length % DEFAULT_COLORS.length];
    const newCat = { id: uid('cat'), name: 'Novo espaço', color };
    state.categories.push(newCat);
    markDirty();
    renderCatRows(newCat.id);
  };
}

function renderCatRows(focusId){
  const rows = document.getElementById('catRows');
  if(!rows) return;
  rows.innerHTML = '';
  const ordered = getOrderedCategories();
  const isCustom = state.categoryOrder === 'custom';
  ordered.forEach((cat, idx) => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <button type="button" class="fav-star-btn ${state.defaultCategoryFilter===cat.id?'active':''}" title="Definir como espaço padrão"><svg viewBox="0 0 24 24" fill="${state.defaultCategoryFilter===cat.id?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></button>
      <input type="color" value="${cat.color}">
      <input type="text" value="${escapeHtml(cat.name)}">
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      ` : ''}
      <button title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = state.categories.findIndex(c => c.id === cat.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= state.categories.length) return;
          [state.categories[realIdx], state.categories[swapIdx]] = [state.categories[swapIdx], state.categories[realIdx]];
          markDirty();
          renderCatRows();
        };
      });
    }
    row.querySelector('.fav-star-btn').onclick = () => {
      state.defaultCategoryFilter = state.defaultCategoryFilter === cat.id ? null : cat.id;
      markDirty();
      renderCatRows();
    };
    row.querySelector('input[type=color]').oninput = e => { cat.color = e.target.value; markDirty(); renderCatRows(); };
    const nameInput = row.querySelector('input[type=text]');
    nameInput.addEventListener('blur', e => { cat.name = e.target.value.trim() || cat.name; markDirty(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('button[title="Remover"]').onclick = (e) => {
      e.stopPropagation();
      if(state.categories.length === 1){ alert('Mantenha ao menos um espaço.'); return; }
      openConfirmPortal(e.currentTarget, `Remover "${cat.name}"? Tarefas e notas desse espaço serão movidas para o primeiro espaço disponível.`, () => {
        const fallback = state.categories.find(c => c.id !== cat.id);
        state.tasks.forEach(t => { if(t.categoryId === cat.id) t.categoryId = fallback.id; });
        state.notes.forEach(n => { if(n.categoryId === cat.id) n.categoryId = fallback.id; });
        state.categories = state.categories.filter(c => c.id !== cat.id);
        if(activeCategoryFilter === cat.id) activeCategoryFilter = null;
        if(dashboardSpace === cat.id) dashboardSpace = null;
        if(state.defaultCategoryFilter === cat.id) state.defaultCategoryFilter = null;
        markDirty();
        renderCatRows();
      });
    };
    rows.appendChild(row);
    if(cat.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}

function getOrderedTags(){
  const list = state.tags.slice();
  if(state.tagOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderTagsPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Tags</h3>
        <p class="settings-section-desc">Tags coloridas para marcar tarefas (pessoas, contextos, etc.).</p>
      </div>
      <div class="settings-order-control">
        <span class="settings-order-label">Ordenar por:</span>
        <select class="tp-select settings-order-select" id="tagOrderSelect">
          <option value="creation" ${state.tagOrder==='creation'?'selected':''}>Criação</option>
          <option value="alphabetical" ${state.tagOrder==='alphabetical'?'selected':''}>Alfabética</option>
          <option value="custom" ${state.tagOrder==='custom'?'selected':''}>Personalizada</option>
        </select>
      </div>
    </div>
    <div id="tagRows"></div>
    <button class="btn ghost small" id="addTagBtn" style="margin-top:10px;">+ Adicionar tag</button>
  `;
  document.getElementById('tagOrderSelect').addEventListener('change', e => {
    state.tagOrder = e.target.value;
    markDirty();
    renderTagRows();
  });
  renderTagRows();
  document.getElementById('addTagBtn').onclick = () => {
    const color = DEFAULT_COLORS[state.tags.length % DEFAULT_COLORS.length];
    const newTag = { id: uid('tag'), name: 'Nova tag', color, categoryId: null };
    state.tags.push(newTag);
    markDirty();
    renderTagRows(newTag.id);
  };
}

function renderTagRows(focusId){
  const rows = document.getElementById('tagRows');
  if(!rows) return;
  rows.innerHTML = '';
  if(state.tags.length === 0){
    rows.innerHTML = `<p style="font-size:12.5px; color:var(--ink-faint);">Nenhuma tag criada ainda. Você também pode criar tags direto no painel de uma tarefa.</p>`;
  }
  const catOptions = `<option value="">Geral (todas)</option>` + state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const ordered = getOrderedTags();
  const isCustom = state.tagOrder === 'custom';
  ordered.forEach((tag, idx) => {
    const row = document.createElement('div');
    row.className = 'cat-row tag-row-settings';
    row.innerHTML = `
      <input type="color" value="${tag.color}">
      <input type="text" value="${escapeHtml(tag.name)}">
      <select class="tag-cat-select">${catOptions}</select>
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      ` : ''}
      <button title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = state.tags.findIndex(t => t.id === tag.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= state.tags.length) return;
          [state.tags[realIdx], state.tags[swapIdx]] = [state.tags[swapIdx], state.tags[realIdx]];
          markDirty();
          renderTagRows();
        };
      });
    }
    row.querySelector('.tag-cat-select').value = tag.categoryId || '';
    row.querySelector('input[type=color]').oninput = e => { tag.color = e.target.value; markDirty(); renderTagRows(); };
    const nameInput = row.querySelector('input[type=text]');
    nameInput.addEventListener('blur', e => { tag.name = e.target.value.trim() || tag.name; markDirty(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('.tag-cat-select').addEventListener('change', e => {
      tag.categoryId = e.target.value || null;
      state.tasks.forEach(t => {
        if((t.tagIds||[]).includes(tag.id) && tag.categoryId && t.categoryId !== tag.categoryId){
          t.tagIds = t.tagIds.filter(id => id !== tag.id);
        }
      });
      markDirty();
    });
    row.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      const usedIn = state.tasks.filter(t => (t.tagIds||[]).includes(tag.id)).length;
      const msg = usedIn > 0
        ? `Remover a tag "${tag.name}"? Ela será retirada de ${usedIn} tarefa(s).`
        : `Remover a tag "${tag.name}"?`;
      openConfirmPortal(e.currentTarget, msg, () => {
        state.tasks.forEach(t => { if(t.tagIds) t.tagIds = t.tagIds.filter(id => id !== tag.id); });
        state.tags = state.tags.filter(tg => tg.id !== tag.id);
        markDirty();
        renderTagRows();
      });
    };
    rows.appendChild(row);
    if(tag.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}

/* ---- recorte circular ---- */
const cropImgEl = () => document.getElementById('cropImg');
let cropState = { natW:0, natH:0, base:1, zoom:1, offX:0, offY:0, dragging:false, startMouse:{x:0,y:0}, startOff:{x:0,y:0} };
const CROP_SIZE = 220;

function openCropModal(dataUrl){
  const img = cropImgEl();
  img.onload = () => {
    cropState.natW = img.naturalWidth;
    cropState.natH = img.naturalHeight;
    cropState.base = Math.max(CROP_SIZE/cropState.natW, CROP_SIZE/cropState.natH);
    cropState.zoom = 1; cropState.offX = 0; cropState.offY = 0;
    document.getElementById('cropZoom').value = 1;
    updateCropTransform();
  };
  img.src = dataUrl;
  document.getElementById('cropOverlay').classList.add('show');
}

function cropBounds(){
  const total = cropState.base * cropState.zoom;
  const w = cropState.natW * total, h = cropState.natH * total;
  return { maxX: Math.max(0,(w-CROP_SIZE)/2), maxY: Math.max(0,(h-CROP_SIZE)/2), w, h, total };
}

function updateCropTransform(){
  const { maxX, maxY, w, h } = cropBounds();
  cropState.offX = Math.min(maxX, Math.max(-maxX, cropState.offX));
  cropState.offY = Math.min(maxY, Math.max(-maxY, cropState.offY));
  const img = cropImgEl();
  img.style.width = w+'px';
  img.style.height = h+'px';
  img.style.left = (CROP_SIZE/2 - w/2 + cropState.offX)+'px';
  img.style.top = (CROP_SIZE/2 - h/2 + cropState.offY)+'px';
}

const cropStageEl = document.getElementById('cropStage');
cropStageEl.addEventListener('mousedown', e => {
  cropState.dragging = true;
  cropState.startMouse = { x:e.clientX, y:e.clientY };
  cropState.startOff = { x:cropState.offX, y:cropState.offY };
});
window.addEventListener('mousemove', e => {
  if(!cropState.dragging) return;
  cropState.offX = cropState.startOff.x + (e.clientX - cropState.startMouse.x);
  cropState.offY = cropState.startOff.y + (e.clientY - cropState.startMouse.y);
  updateCropTransform();
});
window.addEventListener('mouseup', () => cropState.dragging = false);

document.getElementById('cropZoom').addEventListener('input', e => {
  cropState.zoom = parseFloat(e.target.value);
  updateCropTransform();
});

document.getElementById('cancelCropBtn').onclick = () => document.getElementById('cropOverlay').classList.remove('show');
let cropOverlayMouseDownOnBackdrop = false;
document.getElementById('cropOverlay').addEventListener('mousedown', e => {
  cropOverlayMouseDownOnBackdrop = (e.target.id === 'cropOverlay');
});
document.getElementById('cropOverlay').addEventListener('click', e => {
  if(e.target.id==='cropOverlay' && cropOverlayMouseDownOnBackdrop) e.target.classList.remove('show');
});

document.getElementById('applyCropBtn').onclick = () => {
  const { total } = cropBounds();
  const canvas = document.createElement('canvas');
  canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(CROP_SIZE/2 + cropState.offX, CROP_SIZE/2 + cropState.offY);
  ctx.scale(total, total);
  ctx.drawImage(cropImgEl(), -cropState.natW/2, -cropState.natH/2);
  ctx.restore();
  tempAvatarData = canvas.toDataURL('image/png');
  const preview = document.getElementById('avatarPreview');
  if(preview) preview.innerHTML = avatarInnerHtml({ name: state.profile.name, avatar: tempAvatarData });
  document.getElementById('cropOverlay').classList.remove('show');
};

