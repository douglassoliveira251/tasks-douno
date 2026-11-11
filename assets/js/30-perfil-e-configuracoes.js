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
  templates: icon('layout'),
  dados: icon('file'),
};
export const SETTINGS_NAV_LABELS = { perfil:'Perfil', personalizacao:'Personalização', categorias:'Espaços', tags:'Tags', templates:'Templates', dados:'Dados e integrações' };
export const SETTINGS_NAV_GROUPS = [
  { title: 'Conta', keys: ['perfil', 'personalizacao'] },
  { title: 'Organização', keys: ['categorias', 'tags', 'templates'] },
  { title: 'Sistema', keys: ['dados'] },
];
function settingsNavCount(key){
  if(key === 'categorias') return G.state.categories.length;
  if(key === 'tags') return G.state.tags.length;
  if(key === 'templates') return (G.state.taskTemplates || []).length;
  return null;
}
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
/* Celular: Configurações abre numa lista de opções; tocar numa opção abre a tela dela (com "‹ Configurações" para voltar). */
function renderSettingsMobileList(view){
  view.innerHTML = `<div class="settings-m-list">${SETTINGS_NAV_GROUPS.map(g => `
    <div class="settings-m-group">${g.title}</div>
    <div class="settings-m-card">${g.keys.map(key => {
      const n = settingsNavCount(key);
      return `<button type="button" class="settings-m-item" data-tab="${key}">${SETTINGS_NAV_ICONS[key]}<span>${SETTINGS_NAV_LABELS[key]}</span>${n === null ? '' : `<span class="settings-m-count">${n}</span>`}${icon('caret-right')}</button>`;
    }).join('')}</div>`).join('')}</div>`;
  view.querySelectorAll('.settings-m-item').forEach(btn => {
    btn.onclick = () => { G.settingsTab = btn.dataset.tab; G.settingsMobileList = false; renderSettingsView(); window.scrollTo(0, 0); };
  });
}
export function renderSettingsView(){
  if(G.settingsTab === 'arquivo' || G.settingsTab === 'integracoes') G.settingsTab = 'dados';
  const view = document.getElementById('settingsView');
  if(G.settingsMobileList && window.matchMedia('(max-width:768px)').matches){ renderSettingsMobileList(view); return; }
  view.innerHTML = `
    <div class="settings-m-back"><button type="button" id="settingsMBack">${icon('caret-left')}<span>Configurações</span></button></div>
    <div class="settings-layout">
      <div class="settings-nav">
        ${SETTINGS_NAV_GROUPS.map(g => `
          <div class="settings-gt">${g.title}</div>
          ${g.keys.map(key => {
            const n = settingsNavCount(key);
            return `<button class="settings-nav-item" data-tab="${key}">${SETTINGS_NAV_ICONS[key]}${SETTINGS_NAV_LABELS[key]}${n === null ? '' : `<span class="settings-nav-count">${n}</span>`}</button>`;
          }).join('')}
        `).join('')}
      </div>
      <div class="settings-panel" id="settingsPanel"></div>
    </div>
  `;
  view.querySelector('#settingsMBack').onclick = () => { G.settingsMobileList = true; renderSettingsView(); window.scrollTo(0, 0); };
  view.querySelectorAll('.settings-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === G.settingsTab);
    btn.onclick = () => { G.settingsTab = btn.dataset.tab; renderSettingsView(); };
  });
  const panel = document.getElementById('settingsPanel');
  if(G.settingsTab === 'categorias') renderCategoriesPanel(panel);
  else if(G.settingsTab === 'tags') renderTagsPanel(panel);
  else if(G.settingsTab === 'templates') renderTemplatesPanel(panel);
  else if(G.settingsTab === 'dados'){
    // backup/arquivo e integrações no mesmo lugar: cada um desenha no seu bloco e depois os cartões sobem para o painel
    panel.innerHTML = '<div id="dadosBackup"></div><div id="dadosInteg"></div>';
    const a = panel.querySelector('#dadosBackup'), b = panel.querySelector('#dadosInteg');
    renderFilePanel(a); renderIntegrationsPanel(b);
    [a, b].forEach(w => { while(w.firstChild) panel.insertBefore(w.firstChild, w); w.remove(); });
  }
  else if(G.settingsTab === 'personalizacao') renderPersonalizationPanel(panel);
  else renderProfilePanel(panel);
  // sempre que o painel for redesenhado (ex.: ao adicionar um espaço), reagrupa em cartões
  cardifySettingsPanel(panel);
  const settingsObs = new MutationObserver(() => { settingsObs.disconnect(); cardifySettingsPanel(panel); settingsObs.observe(panel, { childList: true }); });
  settingsObs.observe(panel, { childList: true });
}

