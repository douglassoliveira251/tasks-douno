import { G } from './globais.js';
import { DEFAULT_COLORS, currentSpaceFilter } from './01-estado.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { selectSpace } from './11-render-sidebar.js';
import { getOrderedCategories, renderCatRows } from './38-configuracoes-espacos-e-etiquetas.js';
import { clearSearchTerm } from './46-busca-e-notificacoes.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';
import { NOTAS_UI, PAINEL_INICIO, PERIODOS } from './estado-ui.js';

/* ===================== NAV / VIEW SWITCH ===================== */
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.onclick = () => {
    const panel = document.querySelector('.task-panel');
    if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
      document.activeElement.blur();
    }
    G.currentView = btn.dataset.view;
    G.activeTaskId = null;
    G.creatingNewTask = false;
    NOTAS_UI.creatingNewNote = false;
    NOTAS_UI.pendingNoteNotebookId = null;
    clearSearchTerm();
    render();
  };
});

export function openSettingsView(tab, opts){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  G.currentView = 'settings';
  if(tab) G.settingsTab = tab;
  G.settingsMobileList = !!(opts && opts.list); // celular: lista de opções só quando pedido
  G.activeTaskId = null;
  G.creatingNewTask = false;
  NOTAS_UI.creatingNewNote = false;
  NOTAS_UI.pendingNoteNotebookId = null;
  clearSearchTerm();
  render();
}

export function createNewSpace(){
  const color = DEFAULT_COLORS[G.state.categories.length % DEFAULT_COLORS.length];
  const newCat = { id: uid('cat'), name: 'Novo espaço', color };
  G.state.categories.push(newCat);
  if(Array.isArray(G.state.calSpaces)) G.state.calSpaces.push(newCat.id); // espaço novo já aparece no calendário
  openSettingsView('categorias');
  markDirty();
  setTimeout(() => renderCatRows(newCat.id), 0);
}

export function closeSpaceSelectorDropdown(){
  const dd = document.getElementById('spaceSelectorDropdown');
  if(dd) dd.style.display = 'none';
}

export function renderSpaceSelector(){
  renderPeriodSelector();
  const wrap = document.getElementById('spaceSelectorWrap');
  if(!wrap) return;
  const showOn = (G.currentView === 'dashboard' || G.currentView === 'tasks' || G.currentView === 'notes' || G.currentView === 'calendar' || G.currentView === 'projects');
  wrap.style.display = showOn ? 'flex' : 'none';
  if(!showOn){ closeSpaceSelectorDropdown(); return; }

  const shown = currentSpaceFilter();
  const cat = shown ? catById(shown) : null;
  document.getElementById('spaceSelectorDot').style.background = cat ? cat.color : 'var(--ink-faint)';
  const nameEl = document.getElementById('spaceSelectorName');
  if(cat) nameEl.textContent = cat.name;
  else nameEl.innerHTML = 'Todos<span class="ssn-extra"> os espaços</span>';
}

document.getElementById('spaceSelectorBtn').onclick = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('spaceSelectorDropdown');
  const wasOpen = dd.style.display !== 'none';
  closeSpaceSelectorDropdown();
  closePeriodDropdown();
  if(wasOpen) return;

  const checkSvg = icon('check', 'regular', ' class="space-selector-check"');
  let html = '<div class="space-selector-label">ESPAÇOS</div>';
  html += getOrderedCategories().map(cat => `
    <div class="space-selector-item" data-cat-id="${cat.id}">
      <span class="space-selector-dot" style="background:${cat.color}"></span>
      <span class="space-selector-item-name">${escapeHtml(cat.name)}</span>
      ${currentSpaceFilter()===cat.id ? checkSvg : ''}
    </div>
  `).join('');
  html += `<div class="space-selector-divider"></div>`;
  html += `
    <div class="space-selector-item" data-cat-id="">
      <span class="space-selector-dot" style="background:var(--ink-faint)"></span>
      <span class="space-selector-item-name">Todos os espaços</span>
      ${currentSpaceFilter()===null ? checkSvg : ''}
    </div>
    <div class="space-selector-divider"></div>
    <div class="space-selector-item action" id="spaceSelectorNewBtn">
      ${icon('plus')}
      <span class="space-selector-item-name">Novo espaço</span>
    </div>
    <div class="space-selector-item action" id="spaceSelectorManageBtn">
      ${icon('gear')}
      <span class="space-selector-item-name">Gerenciar espaços</span>
    </div>
  `;
  dd.innerHTML = html;
  dd.style.display = 'block';
  dd.querySelectorAll('.space-selector-item[data-cat-id]').forEach(item => {
    item.onclick = () => {
      if(G.currentView === 'dashboard'){ G.dashboardSpace = item.dataset.catId || null; render(); }
      else selectSpace(item.dataset.catId);
      closeSpaceSelectorDropdown();
    };
  });
  document.getElementById('spaceSelectorNewBtn').onclick = () => { closeSpaceSelectorDropdown(); createNewSpace(); };
  document.getElementById('spaceSelectorManageBtn').onclick = () => { closeSpaceSelectorDropdown(); openSettingsView('categorias'); };
};
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('spaceSelectorWrap');
  const dd = document.getElementById('spaceSelectorDropdown');
  if(dd && dd.style.display !== 'none' && wrap && !wrap.contains(e.target)){
    closeSpaceSelectorDropdown();
  }
});

/* ---------- Período do painel inicial ---------- */
export function closePeriodDropdown(){
  const dd = document.getElementById('periodSelectorDropdown');
  if(dd) dd.style.display = 'none';
}
export function renderPeriodSelector(){
  const wrap = document.getElementById('periodSelectorWrap');
  if(!wrap) return;
  const show = G.currentView === 'dashboard';
  wrap.style.display = show ? 'flex' : 'none';
  if(!show){ closePeriodDropdown(); return; }
  const cur = PERIODOS.find(p => p.key === PAINEL_INICIO.periodo) || PERIODOS[1];
  document.getElementById('periodSelectorName').textContent = cur.label;
}
document.getElementById('periodSelectorBtn').onclick = (e) => {
  e.stopPropagation();
  const dd = document.getElementById('periodSelectorDropdown');
  const wasOpen = dd.style.display !== 'none';
  closeSpaceSelectorDropdown();
  closePeriodDropdown();
  if(wasOpen) return;
  const checkSvg = icon('check', 'regular', ' class="space-selector-check"');
  dd.innerHTML = '<div class="space-selector-label">PERÍODO</div>' + PERIODOS.map(p => `
    <div class="space-selector-item" data-period="${p.key}">
      <span class="space-selector-item-name">${p.label}</span>
      ${PAINEL_INICIO.periodo === p.key ? checkSvg : ''}
    </div>`).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('[data-period]').forEach(item => {
    item.onclick = () => {
      PAINEL_INICIO.periodo = item.dataset.period;
      try{ localStorage.setItem('dounoPeriodoPainel', PAINEL_INICIO.periodo); }catch(err){}
      closePeriodDropdown();
      render();
    };
  });
};
try{
  const salvo = localStorage.getItem('dounoPeriodoPainel');
  if(PERIODOS.some(p => p.key === salvo)) PAINEL_INICIO.periodo = salvo;
}catch(e){}
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('periodSelectorWrap');
  if(wrap && !wrap.contains(e.target)) closePeriodDropdown();
});
