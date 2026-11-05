import { G } from './globais.js';
import { LS_KEY, freshState } from './01-estado.js';
import { LS_OWNER_KEY, sbClient } from './02-nuvem.js';
import { outlookApi } from './03-outlook.js';
import { downloadFallback } from './09-atualizacao-do-sistema.js';
import { escapeHtml } from './10-helpers.js';
import { showToast } from './42-nuvem-persistencia.js';
import { renderLoginGate } from './43-tela-de-login.js';
import { icon } from './icones.js';

/* Exclusão definitiva da conta (Perfil › Conta › Zona de perigo).
   O servidor (/api/account/delete) confere a senha e apaga os dados e o login. */

export function dangerZoneHtml(){
  return `<div class="danger-zone">
    <div class="danger-zone-text">
      <div class="danger-zone-title">Excluir minha conta</div>
      <div class="danger-zone-desc">Apaga o seu login e todos os seus dados. Esta ação é definitiva e não pode ser desfeita.</div>
    </div>
    <button class="btn danger small" id="deleteAccountBtn" type="button">Excluir minha conta…</button>
  </div>`;
}

export function bindDangerZone(){
  const btn = document.getElementById('deleteAccountBtn');
  if(btn) btn.onclick = openDeleteAccountModal;
}

function overlayEl(){
  let ov = document.getElementById('deleteAccountOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'deleteAccountOverlay';
    ov.innerHTML = '<div class="modal del-account-modal" id="deleteAccountBody" role="dialog" aria-modal="true" aria-labelledby="delAccTitle"></div>';
    document.body.appendChild(ov);
    let downOnBackdrop = false;
    ov.addEventListener('mousedown', e => { downOnBackdrop = (e.target === ov); });
    ov.addEventListener('click', e => { if(e.target === ov && downOnBackdrop) closeDeleteAccountModal(); });
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && ov.classList.contains('show') && !ov.dataset.busy) closeDeleteAccountModal();
    });
  }
  return ov;
}

export function closeDeleteAccountModal(){
  const ov = document.getElementById('deleteAccountOverlay');
  if(ov){ ov.classList.remove('show'); delete ov.dataset.busy; }
}

export function openDeleteAccountModal(){
  if(!G.cloudSession) return;
  const email = G.cloudSession.user.email || '';
  const ov = overlayEl();
  const body = document.getElementById('deleteAccountBody');
  body.innerHTML = `
    <div class="del-account-icon">${icon('warning', 'regular')}</div>
    <h3 id="delAccTitle">Excluir a sua conta?</h3>
    <p class="del-account-lead">Isto apaga <b>para sempre</b>:</p>
    <ul class="del-account-list">
      <li>Tarefas, notas, projetos, eventos e modelos</li>
      <li>Configurações, anexos e histórico de concluídas</li>
      <li>A conexão com o Outlook e o seu login (${escapeHtml(email)})</li>
    </ul>
    <button class="btn ghost small del-account-backup" id="delAccBackupBtn" type="button">Baixar um backup antes</button>
    <div class="tp-field" style="margin-top:14px;">
      <label class="tp-label" for="delAccEmail">Para confirmar, digite o seu e-mail</label>
      <input type="email" class="tp-input" id="delAccEmail" autocomplete="off" placeholder="${escapeHtml(email)}">
    </div>
    <div class="tp-field" style="margin-top:10px;">
      <label class="tp-label" for="delAccPassword">Sua senha</label>
      <input type="password" class="tp-input" id="delAccPassword" autocomplete="current-password">
    </div>
    <div class="del-account-error" id="delAccError" role="alert"></div>
    <div class="del-account-actions">
      <button class="btn ghost" id="delAccCancelBtn" type="button">Cancelar</button>
      <button class="btn danger" id="delAccConfirmBtn" type="button" disabled>Excluir definitivamente</button>
    </div>`;
  ov.classList.add('show');

  const emailInput = document.getElementById('delAccEmail');
  const pwInput = document.getElementById('delAccPassword');
  const confirmBtn = document.getElementById('delAccConfirmBtn');
  const errEl = document.getElementById('delAccError');
  const ready = () => emailInput.value.trim().toLowerCase() === email.toLowerCase() && pwInput.value.length > 0;
  const refresh = () => { confirmBtn.disabled = !ready(); };
  emailInput.addEventListener('input', refresh);
  pwInput.addEventListener('input', refresh);
  pwInput.addEventListener('keydown', e => { if(e.key === 'Enter' && ready()) confirmBtn.click(); });

  document.getElementById('delAccCancelBtn').onclick = closeDeleteAccountModal;
  document.getElementById('delAccBackupBtn').onclick = () => { try{ downloadFallback(); }catch(e){ console.error(e); } };

  confirmBtn.onclick = async () => {
    if(!ready()) return;
    errEl.textContent = '';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Excluindo…';
    ov.dataset.busy = '1';
    try{
      await outlookApi('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim(), password: pwInput.value }),
      });
    }catch(e){
      console.error(e);
      delete ov.dataset.busy;
      errEl.textContent = e && e.message ? e.message : 'Não foi possível excluir a conta agora.';
      confirmBtn.textContent = 'Excluir definitivamente';
      refresh();
      return;
    }
    await finishAfterDeletion();
  };
  setTimeout(() => emailInput.focus(), 30);
}

async function finishAfterDeletion(){
  closeDeleteAccountModal();
  G.cloudSession = null;
  G.dirty = false;
  try{ await sbClient.auth.signOut({ scope: 'local' }); }catch(e){ console.error(e); }
  try{ localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_OWNER_KEY); }catch(e){}
  G.state = freshState();
  G.loginMode = 'login';
  renderLoginGate();
  document.getElementById('loginOverlay').classList.add('show');
  showToast('Conta excluída. Seus dados foram apagados.');
}
