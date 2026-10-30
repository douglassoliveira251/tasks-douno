function compareVersions(a, b){
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for(let i = 0; i < 3; i++){
    const d = (pa[i] || 0) - (pb[i] || 0);
    if(d) return d;
  }
  return 0;
}
function getSeenVersion(){ try{ return localStorage.getItem(WHATS_NEW_SEEN_KEY); }catch(e){ return null; } }
function setSeenVersion(v){ try{ localStorage.setItem(WHATS_NEW_SEEN_KEY, v); }catch(e){} }
function hasUnseenWhatsNew(){
  const seen = getSeenVersion();
  return !seen || compareVersions(WHATS_NEW[0].version, seen) > 0;
}
function updateWhatsNewDot(){
  const dot = document.getElementById('whatsNewDot');
  if(dot) dot.style.display = hasUnseenWhatsNew() ? 'inline-block' : 'none';
}
const WHATS_NEW_CLOSE_BTN = `
    <button type="button" id="whatsNewCloseBtn" class="about-close-btn" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>`;
// novidades acumuladas desde a última visita (sem a mais recente, que fica em destaque)
let whatsNewPending = [];
function computePendingWhatsNew(){
  const seen = getSeenVersion();
  if(!seen) return [];
  return WHATS_NEW.slice(1).filter(w => compareVersions(w.version, seen) > 0);
}
function openWhatsNew(keepPending){
  const n = WHATS_NEW[0];
  if(keepPending !== true) whatsNewPending = computePendingWhatsNew();
  const body = document.getElementById('whatsNewModalBody');
  body.classList.remove('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <div class="whatsnew-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/></svg>
    </div>
    <div class="whatsnew-eyebrow">Novidade</div>
    <h3 class="whatsnew-title">${escapeHtml(n.title)}</h3>
    <p class="whatsnew-text">${escapeHtml(n.text)}</p>
    ${whatsNewPending.length ? `
      <div class="whatsnew-prev">
        <div class="whatsnew-prev-label">Também desde sua última visita</div>
        <ul class="whatsnew-prev-list">
          ${whatsNewPending.map(w => `<li>
            <div class="whatsnew-prev-item-meta">v${w.version} · ${w.date}</div>
            <div class="whatsnew-prev-item-title">${escapeHtml(w.title)}</div>
            <p class="whatsnew-prev-item-text">${escapeHtml(w.text)}</p>
          </li>`).join('')}
        </ul>
      </div>` : ''}
    ${WHATS_NEW.length > 1 ? `<button type="button" class="whatsnew-history-link" id="whatsNewHistoryBtn">Ver histórico completo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg></button>` : ''}
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
function openWhatsNewHistory(){
  const body = document.getElementById('whatsNewModalBody');
  body.classList.add('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <button type="button" class="whatsnew-back" id="whatsNewBackBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg> Voltar
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
function closeWhatsNew(){
  document.getElementById('whatsNewOverlay').classList.remove('show');
}
let whatsNewOverlayMouseDownOnBackdrop = false;
document.getElementById('whatsNewOverlay').addEventListener('mousedown', e => {
  whatsNewOverlayMouseDownOnBackdrop = (e.target.id === 'whatsNewOverlay');
});
document.getElementById('whatsNewOverlay').addEventListener('click', e => {
  if(e.target.id === 'whatsNewOverlay' && whatsNewOverlayMouseDownOnBackdrop) closeWhatsNew();
});
document.getElementById('avatarMenuWhatsNewBtn').onclick = () => {
  document.getElementById('avatarDropdownMenu').style.display = 'none';
  openWhatsNew();
};
/* Abre sozinho uma vez por versão, só quando o app já está utilizável (fora
   das telas de login e de vínculo de arquivo). */
let whatsNewChecked = false;
let appUnlocked = false; // vira true quando sai a tela de login (ou de vínculo de arquivo)
function maybeShowWhatsNew(){
  if(whatsNewChecked || !appUnlocked) return;
  if(document.getElementById('loginOverlay').classList.contains('show')) return;
  if(document.getElementById('linkOverlay').classList.contains('show')) return;
  whatsNewChecked = true;
  if(hasUnseenWhatsNew()) openWhatsNew();
}

document.getElementById('toggleThemeBtn').onclick = toggleTheme;

const PAGE_HEADER_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M3 12h14M3 19h8"/><circle cx="17" cy="5" r="2"/><circle cx="15" cy="19" r="2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
};
