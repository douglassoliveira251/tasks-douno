import { icon } from './icones.js';

/* ===================== AVISO PARA INSTALAR O APLICATIVO =====================
   Cartão no canto da tela, na primeira abertura no navegador. "Agora não" (ou fechar) some por 30 dias;
   depois de instalado, ou quando o app já está aberto como aplicativo, nunca mais aparece. */

export const INSTALL_DISMISSED_KEY = 'dounoInstallDismissedAt';
export const INSTALL_DONE_KEY = 'dounoAppInstalled';
export const INSTALL_SNOOZE_DAYS = 30;
export const INSTALL_DELAY_MS = 3000;

/* Regra de quando o aviso pode aparecer (pura, para testar). */
export function installPromptAllowed({ standalone, installed, dismissedAt, now }){
  if(standalone || installed) return false;
  if(dismissedAt && now - dismissedAt < INSTALL_SNOOZE_DAYS * 86400000) return false;
  return true;
}

const isStandalone = () => {
  try{ return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  catch(e){ return false; }
};
const readFlag = key => { try{ return localStorage.getItem(key); }catch(e){ return null; } };
const writeFlag = (key, value) => { try{ localStorage.setItem(key, value); }catch(e){} };

/* iPhone/iPad no Safari: não existe botão automático de instalar, só o "Adicionar à Tela de Início" */
export function isIosSafari(){
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

let deferredPrompt = null;
let shown = false;
let timer = null;

function allowedNow(){
  return installPromptAllowed({
    standalone: isStandalone(),
    installed: readFlag(INSTALL_DONE_KEY) === '1',
    dismissedAt: Number(readFlag(INSTALL_DISMISSED_KEY)) || 0,
    now: Date.now(),
  });
}

export function closeInstallCard(){
  const el = document.getElementById('installCard');
  if(el) el.remove();
  shown = false;
}
function dismiss(){
  writeFlag(INSTALL_DISMISSED_KEY, String(Date.now()));
  closeInstallCard();
}

const LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#151B28"/><path d="M112 152H292 C364 152 408 192 408 256 C408 320 364 360 292 360 H112 V300" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

export function showInstallCard(ios){
  if(document.getElementById('installCard')) return;
  const el = document.createElement('div');
  el.id = 'installCard';
  el.className = 'install-card';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', 'Instalar o aplicativo');
  el.innerHTML = `
    <button type="button" class="install-x" id="installClose" aria-label="Fechar">${icon('x')}</button>
    <div class="install-row">
      <span class="install-logo">${LOGO}</span>
      <div class="install-tx">
        <b>${ios ? 'Instale no iPhone' : 'Instale o DOUNO Tasks'}</b>
        <small>${ios
          ? 'Toque em <b>Compartilhar</b> ' + icon('export') + ' e depois em <b>Adicionar à Tela de Início</b>.'
          : 'Abre em janela própria, direto da área de trabalho ou da tela inicial.'}</small>
      </div>
    </div>
    <div class="install-actions">
      <button type="button" class="btn ghost small" id="installLater">${ios ? 'Entendi' : 'Agora não'}</button>
      ${ios ? '' : '<button type="button" class="btn small" id="installNow">Instalar</button>'}
    </div>`;
  document.body.appendChild(el);
  shown = true;
  el.querySelector('#installClose').onclick = dismiss;
  el.querySelector('#installLater').onclick = dismiss;
  const now = el.querySelector('#installNow');
  if(now) now.onclick = async () => {
    const ev = deferredPrompt;
    if(!ev){ dismiss(); return; }
    closeInstallCard();
    deferredPrompt = null;
    try{
      await ev.prompt();
      const choice = await ev.userChoice;
      if(choice && choice.outcome === 'accepted') writeFlag(INSTALL_DONE_KEY, '1');
      else writeFlag(INSTALL_DISMISSED_KEY, String(Date.now()));
    }catch(e){ console.error(e); }
  };
}

/* Espera a tela estar livre (sem login, boas-vindas ou outra janela aberta) para não atrapalhar. */
function scheduleShow(ios){
  clearTimeout(timer);
  const tryShow = () => {
    if(shown || !allowedNow()) return;
    if(document.querySelector('.overlay.show')){ timer = setTimeout(tryShow, 4000); return; }
    showInstallCard(ios);
  };
  timer = setTimeout(tryShow, INSTALL_DELAY_MS);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if(allowedNow()) scheduleShow(false);
});
window.addEventListener('appinstalled', () => {
  writeFlag(INSTALL_DONE_KEY, '1');
  deferredPrompt = null;
  closeInstallCard();
});

if(isStandalone()){
  // já está rodando como aplicativo: lembra disso para o navegador também não oferecer de novo
  writeFlag(INSTALL_DONE_KEY, '1');
} else if(isIosSafari() && allowedNow()){
  scheduleShow(true);
}
