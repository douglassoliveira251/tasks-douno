import { G } from './globais.js';
import { renderTemplatesPanel } from './35-templates-de-tarefa.js';
import { renderFilePanel, renderIntegrationsPanel, renderPersonalizationPanel, renderProfilePanel } from './37-configuracoes-paineis.js';
import { renderCategoriesPanel, renderTagsPanel } from './38-configuracoes-espacos-e-etiquetas.js';
import { icon } from './icones.js';

export function initials(name){
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length === 0) return '?';
  return parts.slice(0,2).map(p=>p[0].toUpperCase()).join('');
}

export function genericAvatarSvg(){
  return `${icon('user')}`;
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
  perfil: icon('user'),
  personalizacao: icon('sun'),
  categorias: icon('folder'),
  tags: icon('tag'),
  arquivo: icon('file'),
  integracoes: icon('calendar-blank'),
  templates: icon('layout'),
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

