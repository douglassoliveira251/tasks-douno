import { G } from './globais.js';
import { renderTemplatesPanel } from './35-templates-de-tarefa.js';
import { renderFilePanel, renderIntegrationsPanel, renderPersonalizationPanel, renderProfilePanel } from './37-configuracoes-paineis.js';
import { renderCategoriesPanel, renderTagsPanel } from './38-configuracoes-espacos-e-etiquetas.js';

export function initials(name){
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length === 0) return '?';
  return parts.slice(0,2).map(p=>p[0].toUpperCase()).join('');
}

export function genericAvatarSvg(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
export function avatarInnerHtml(profile){
  if(profile.avatar) return `<img src="${profile.avatar}" alt="">`;
  return genericAvatarSvg();
}

export function renderProfileCard(){
  const html = avatarInnerHtml(G.state.profile);
  const avatarTop = document.getElementById('profileAvatarTopbar');
  const avatarDrop = document.getElementById('profileAvatarDropdown');
  if(avatarTop) avatarTop.innerHTML = html;
  if(avatarDrop) avatarDrop.innerHTML = html;
  const nameEl = document.getElementById('profileNameDropdown');
  const emailEl = document.getElementById('profileEmailDropdown');
  if(nameEl) nameEl.textContent = G.state.profile.name || 'Seu nome';
  if(emailEl) emailEl.textContent = G.state.profile.email || 'seu@email.com';
  const chipNameEl = document.getElementById('topbarProfileName');
  if(chipNameEl) chipNameEl.textContent = G.state.profile.name || 'Conta';
}

G.tempAvatarData = null;
G.settingsTab = 'perfil';

export const SETTINGS_NAV_ICONS = {
  perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  personalizacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  categorias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
  tags: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l5.6-5.59a2 2 0 000-2.82z"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>',
  arquivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
  integracoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/></svg>',
  templates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
};
export const SETTINGS_NAV_LABELS = { perfil:'Perfil', personalizacao:'Personalização', categorias:'Espaços', tags:'Tags', templates:'Templates', arquivo:'Arquivo', integracoes:'Integrações' };
/* Agrupa o conteúdo do painel em cartões, um por assunto (cada título/cabeçalho abre um cartão novo).
   Os elementos são movidos, não recriados, então os eventos continuam valendo. */
export function cardifySettingsPanel(panel){
  const kids = Array.from(panel.children);
  if(!kids.length || kids.some(k => k.classList.contains('settings-card'))) return;
  const isStart = el => el.matches('h3.settings-section-title, .settings-section-header-row');
  const groups = [];
  let cur = null;
  kids.forEach(k => {
    if(!cur || (isStart(k) && cur.hasStart)){ cur = { nodes: [], hasStart: false }; groups.push(cur); }
    if(isStart(k)) cur.hasStart = true;
    cur.nodes.push(k);
  });
  groups.forEach(g => {
    const card = document.createElement('div');
    card.className = 'settings-card';
    panel.insertBefore(card, g.nodes[0]);
    g.nodes.forEach(n => card.appendChild(n));
  });
}
export function renderSettingsView(){
  const view = document.getElementById('settingsView');
  view.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${Object.keys(SETTINGS_NAV_LABELS).map(key => `
          <button class="settings-nav-item" data-tab="${key}">${SETTINGS_NAV_ICONS[key]}${SETTINGS_NAV_LABELS[key]}</button>
        `).join('')}
      </div>
      <div class="settings-panel" id="settingsPanel"></div>
    </div>
  `;
  view.querySelectorAll('.settings-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === G.settingsTab);
    btn.onclick = () => { G.settingsTab = btn.dataset.tab; renderSettingsView(); };
  });
  const panel = document.getElementById('settingsPanel');
  if(G.settingsTab === 'categorias') renderCategoriesPanel(panel);
  else if(G.settingsTab === 'tags') renderTagsPanel(panel);
  else if(G.settingsTab === 'templates') renderTemplatesPanel(panel);
  else if(G.settingsTab === 'arquivo') renderFilePanel(panel);
  else if(G.settingsTab === 'personalizacao') renderPersonalizationPanel(panel);
  else if(G.settingsTab === 'integracoes') renderIntegrationsPanel(panel);
  else renderProfilePanel(panel);
  // sempre que o painel for redesenhado (ex.: ao adicionar um espaço), reagrupa em cartões
  cardifySettingsPanel(panel);
  const settingsObs = new MutationObserver(() => { settingsObs.disconnect(); cardifySettingsPanel(panel); settingsObs.observe(panel, { childList: true }); });
  settingsObs.observe(panel, { childList: true });
}

