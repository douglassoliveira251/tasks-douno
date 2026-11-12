import { libNewLabel, openNewLibraryItem } from './57-biblioteca.js';
import { G } from './globais.js';
import { openNewTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { openNoteComposer } from './24-render-notes.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { openProjectEditor, openStageEditor, projectById } from './31-projetos.js';
import { openTemplatePickMenu } from './35-templates-de-tarefa.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';

/* ===================== MENU "NOVO" (botão + do topo) =====================
   Um só lugar para criar tarefa, evento, nota ou projeto, de qualquer tela. */

const btn = () => document.getElementById('newBtn');
const menu = () => document.getElementById('newMenu');

export function closeNewMenu(){
  const m = menu();
  if(m) m.style.display = 'none';
  const b = btn();
  if(b) b.setAttribute('aria-expanded', 'false');
}
const isOpen = () => !!menu() && menu().style.display !== 'none';

/* Itens do menu. "Etapa" só aparece com um projeto aberto. */
export function newMenuItems(){
  const items = [
    { key: 'task', label: 'Tarefa', hint: 'Título, prazo e espaço', ic: 'check-square', k: 'T', run: () => {
      G.currentView = 'tasks'; openNewTaskPanel();
    } },
    { key: 'event', label: 'Evento', hint: 'No calendário', ic: 'calendar-plus', k: 'E', run: () => {
      openEventComposer(null, G.calendarFocusDate);
    } },
    { key: 'note', label: 'Nota', hint: 'Anotação rápida', ic: 'note-pencil', k: 'N', run: () => {
      G.currentView = 'notes'; openNoteComposer();
    } },
    { key: 'project', label: 'Projeto', hint: 'Com etapas e prazos', ic: 'kanban', k: 'P', run: () => {
      G.currentView = 'projects'; G.activeProjectId = null; render(); openProjectEditor(null);
    } },
  ];
  const openProject = G.currentView === 'projects' && G.activeProjectId ? projectById(G.activeProjectId) : null;
  if(openProject){
    items.splice(3, 0, { key: 'stage', label: 'Etapa do projeto', hint: openProject.name || 'Projeto aberto', ic: 'list', k: 'S', run: () => openStageEditor(openProject, null) });
  }
  return items;
}

function renderMenu(){
  const items = newMenuItems();
  const m = menu();
  m.innerHTML = items.map(it => `
    <button type="button" class="new-menu-item" role="menuitem" data-new="${it.key}">
      <span class="nm-ic">${icon(it.ic)}</span>
      <span class="nm-tx"><b>${it.label}</b><small>${it.hint}</small></span>
      <kbd>${it.k}</kbd>
    </button>`).join('') + `
    <div class="new-menu-sep"></div>
    <button type="button" class="new-menu-item" role="menuitem" data-new="template">
      <span class="nm-ic dashed">${icon('copy-simple')}</span>
      <span class="nm-tx"><b>A partir de um modelo</b><small>Templates de tarefa</small></span>
    </button>`;
  const run = key => {
    closeNewMenu();
    if(key === 'template'){ G.currentView = 'tasks'; render(); openTemplatePickMenu(btn()); return; }
    const it = items.find(x => x.key === key);
    if(it) it.run();
  };
  m.querySelectorAll('[data-new]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); run(b.dataset.new); }; });
  m._run = run;
  m._items = items;
}

export function toggleNewMenu(force){
  const open = typeof force === 'boolean' ? force : !isOpen();
  if(!open){ closeNewMenu(); return; }
  renderMenu();
  menu().style.display = 'block';
  btn().setAttribute('aria-expanded', 'true');
  const first = menu().querySelector('.new-menu-item');
  if(first) first.focus();
}

/* O botão "+" é contextual: em cada tela cria o que é daquela tela (+ Tarefa, + Nota...).
   Na Visão geral (e onde não há item próprio) é "+ Item" e abre o menu com tudo. */
function newBtnMode(){
  const v = G.currentView;
  if(v === 'tasks') return { label: 'Nova tarefa', title: 'Nova tarefa', run: () => { G.currentView = 'tasks'; openNewTaskPanel(); } };
  if(v === 'notes') return { label: 'Nova nota', title: 'Nova nota', run: () => { openNoteComposer(); } };
  if(v === 'calendar') return { label: 'Novo evento', title: 'Novo evento', run: () => { openEventComposer(null, G.calendarFocusDate); } };
  if(v === 'projects'){
    const pr = G.activeProjectId ? projectById(G.activeProjectId) : null;
    if(pr) return { label: 'Nova etapa', title: 'Nova etapa do projeto', run: () => openStageEditor(pr, null) };
    return { label: 'Novo projeto', title: 'Novo projeto', run: () => { G.activeProjectId = null; openProjectEditor(null); } };
  }
  if(v === 'library') return { label: libNewLabel(), title: libNewLabel(), run: () => openNewLibraryItem() };
  return { label: 'Novo item', title: 'Criar novo item', menu: true };
}
export function syncNewButton(){
  const b = btn();
  if(!b) return;
  const m = newBtnMode();
  const lb = document.getElementById('newBtnLabel');
  if(lb) lb.textContent = m.label;
  b.title = m.title;
  b.setAttribute('aria-label', m.title);
  b.classList.toggle('has-menu', !!m.menu);
  if(m.menu) b.setAttribute('aria-haspopup', 'menu'); else { b.removeAttribute('aria-haspopup'); b.removeAttribute('aria-expanded'); closeNewMenu(); }
}
document.addEventListener('douno:rendered', syncNewButton);
document.getElementById('newBtnSplit').onclick = (e) => { e.stopPropagation(); openTemplatePickMenu(document.getElementById('newMenuWrap')); };
document.addEventListener('douno:novo-menu', () => toggleNewMenu(true));
btn().onclick = (e) => {
  e.stopPropagation();
  const m = newBtnMode();
  if(m.menu) toggleNewMenu(); else m.run();
};
syncNewButton();
document.addEventListener('click', (e) => {
  const wrap = document.getElementById('newMenuWrap');
  if(isOpen() && wrap && !wrap.contains(e.target)) closeNewMenu();
});
document.addEventListener('keydown', (e) => {
  if(!isOpen()) return;
  if(e.key === 'Escape'){ e.stopImmediatePropagation(); closeNewMenu(); btn().focus(); return; }
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault();
    const rows = Array.from(menu().querySelectorAll('.new-menu-item'));
    const i = rows.indexOf(document.activeElement);
    rows[(i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length].focus();
    return;
  }
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  const item = (menu()._items || []).find(x => x.k.toLowerCase() === e.key.toLowerCase());
  if(item){ e.preventDefault(); menu()._run(item.key); }
}, true);

/* Ctrl+K (ou Cmd+K): vai direto para a busca */
document.addEventListener('keydown', (e) => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    const input = document.getElementById('searchInput');
    if(input) input.focus();
  }
});
