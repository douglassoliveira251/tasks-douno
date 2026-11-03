import { G } from './globais.js';
import { APP_VERSION } from './00-versao.js';
import { sbClient } from './02-nuvem.js';
import { closeHelpPanel } from './06-cabecalho-e-ajuda.js';
import { showToast } from './42-nuvem-persistencia.js';
import { icon } from './icones.js';

/* ===================== COMENTÁRIOS ===================== */
export function openFeedbackModal(){
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
  const up = icon('thumbs-up');
  const down = icon('thumbs-down');
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="fbClose" aria-label="Fechar">${icon('x')}</button>
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
    if(!sbClient || !G.cloudSession){ err.textContent = 'Entre na sua conta para enviar comentários.'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Enviando...';
    try{
      const { data, error } = await sbClient.functions.invoke('send-feedback', {
        body: { kind, message, version: APP_VERSION, view: G.currentView, userAgent: navigator.userAgent },
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

