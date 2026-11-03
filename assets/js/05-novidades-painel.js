import { G } from './globais.js';
import { toggleTheme } from './03-outlook.js';
import { WHATS_NEW, WHATS_NEW_SEEN_KEY } from './04-novidades.js';
import { escapeHtml } from './10-helpers.js';
import { icon } from './icones.js';

export function compareVersions(a, b){
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for(let i = 0; i < 3; i++){
    const d = (pa[i] || 0) - (pb[i] || 0);
    if(d) return d;
  }
  return 0;
}
export function getSeenVersion(){ try{ return localStorage.getItem(WHATS_NEW_SEEN_KEY); }catch(e){ return null; } }
export function setSeenVersion(v){ try{ localStorage.setItem(WHATS_NEW_SEEN_KEY, v); }catch(e){} }
export function hasUnseenWhatsNew(){
  const seen = getSeenVersion();
  return !seen || compareVersions(WHATS_NEW[0].version, seen) > 0;
}
export function updateWhatsNewDot(){
  const dot = document.getElementById('whatsNewDot');
  if(dot) dot.style.display = hasUnseenWhatsNew() ? 'inline-block' : 'none';
}
export const WHATS_NEW_CLOSE_BTN = `
    <button type="button" id="whatsNewCloseBtn" class="about-close-btn" aria-label="Fechar">
      ${icon('x', 'regular', ' style="width:16px; height:16px;"')}
    </button>`;
// novidades acumuladas desde a última visita (sem a mais recente, que fica em destaque)
G.whatsNewPending = [];
export function computePendingWhatsNew(){
  const seen = getSeenVersion();
  if(!seen) return [];
  return WHATS_NEW.slice(1).filter(w => compareVersions(w.version, seen) > 0);
}
export function openWhatsNew(keepPending){
  const n = WHATS_NEW[0];
  if(keepPending !== true) G.whatsNewPending = computePendingWhatsNew();
  const body = document.getElementById('whatsNewModalBody');
  body.classList.remove('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <div class="whatsnew-icon">
      ${icon('sparkle')}
    </div>
    <div class="whatsnew-eyebrow">Novidade</div>
    <h3 class="whatsnew-title">${escapeHtml(n.title)}</h3>
    <p class="whatsnew-text">${escapeHtml(n.text)}</p>
    ${G.whatsNewPending.length ? `
      <div class="whatsnew-prev">
        <div class="whatsnew-prev-label">Também desde sua última visita</div>
        <ul class="whatsnew-prev-list">
          ${G.whatsNewPending.map(w => `<li>
            <div class="whatsnew-prev-item-meta">v${w.version} · ${w.date}</div>
            <div class="whatsnew-prev-item-title">${escapeHtml(w.title)}</div>
            <p class="whatsnew-prev-item-text">${escapeHtml(w.text)}</p>
          </li>`).join('')}
        </ul>
      </div>` : ''}
    ${WHATS_NEW.length > 1 ? `<button type="button" class="whatsnew-history-link" id="whatsNewHistoryBtn">Ver histórico completo ${icon('caret-right')}</button>` : ''}
    <div class="whatsnew-foot">
      <span class="whatsnew-version">v${n.version} · ${n.date}</span>
      <button type="button" class="btn whatsnew-ok" id="whatsNewOkBtn">Entendi</button>
    </div>
  `;
  document.getElementById('whatsNewOverlay').classList.add('show');
  body.querySelector('#whatsNewCloseBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewOkBtn').onclick = closeWhatsNew;
  const histBtn = body.querySelector('#whatsNewHistoryBtn');
  if(histBtn) histBtn.onclick = openWhatsNewHistory;
  setSeenVersion(n.version);
  updateWhatsNewDot();
}
export function openWhatsNewHistory(){
  const body = document.getElementById('whatsNewModalBody');
  body.classList.add('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <button type="button" class="whatsnew-back" id="whatsNewBackBtn">
      ${icon('caret-left')} Voltar
    </button>
    <div class="whatsnew-eyebrow">Histórico</div>
    <h3 class="whatsnew-title">Todas as novidades</h3>
    <ul class="whatsnew-list">
      ${WHATS_NEW.map((w, i) => `
        <li class="whatsnew-item${i === 0 ? ' is-latest' : ''}">
          <div class="whatsnew-item-meta">v${w.version} · ${w.date}</div>
          <div class="whatsnew-item-title">${escapeHtml(w.title)}</div>
          <p class="whatsnew-item-text">${escapeHtml(w.text)}</p>
        </li>`).join('')}
    </ul>
    <div class="whatsnew-foot" style="justify-content:flex-end;">
      <button type="button" class="btn whatsnew-ok" id="whatsNewOkBtn">Fechar</button>
    </div>
  `;
  body.querySelector('#whatsNewCloseBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewOkBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewBackBtn').onclick = () => openWhatsNew(true);
}
export function closeWhatsNew(){
  document.getElementById('whatsNewOverlay').classList.remove('show');
}
G.whatsNewOverlayMouseDownOnBackdrop = false;
document.getElementById('whatsNewOverlay').addEventListener('mousedown', e => {
  G.whatsNewOverlayMouseDownOnBackdrop = (e.target.id === 'whatsNewOverlay');
});
document.getElementById('whatsNewOverlay').addEventListener('click', e => {
  if(e.target.id === 'whatsNewOverlay' && G.whatsNewOverlayMouseDownOnBackdrop) closeWhatsNew();
});
document.getElementById('avatarMenuWhatsNewBtn').onclick = () => {
  document.getElementById('avatarDropdownMenu').style.display = 'none';
  openWhatsNew();
};
/* Abre sozinho uma vez por versão, só quando o app já está utilizável (fora
   das telas de login e de vínculo de arquivo). */
G.whatsNewChecked = false;
G.appUnlocked = false; // vira true quando sai a tela de login (ou de vínculo de arquivo)
export function maybeShowWhatsNew(){
  if(G.whatsNewChecked || !G.appUnlocked) return;
  if(document.getElementById('loginOverlay').classList.contains('show')) return;
  if(document.getElementById('linkOverlay').classList.contains('show')) return;
  G.whatsNewChecked = true;
  if(hasUnseenWhatsNew()) openWhatsNew();
}

document.getElementById('toggleThemeBtn').onclick = toggleTheme;

export const PAGE_HEADER_ICONS = {
  dashboard: icon('squares-four'),
  tasks: icon('check-square'),
  notes: icon('file-text'),
  calendar: icon('calendar-blank'),
  projects: icon('kanban'),
  settings: icon('gear'),
};
