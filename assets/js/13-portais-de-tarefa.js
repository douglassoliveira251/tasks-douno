import { G } from './globais.js';
import { DEFAULT_COLORS } from './01-estado.js';
import { markDirty } from './08-persistencia.js';
import { escapeHtml, uid } from './10-helpers.js';
import { openColorPortal, openMoveGroupPortal } from './15-portais-de-grupo-e-etiquetas.js';
import { openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { openTemplateEditor, templateFromTask } from './35-templates-de-tarefa.js';

/* ---- menu-portal dos 3 pontinhos (fixo, nunca cortado pelos grupos) ---- */
G.openMenuWrapEl = null;

export function ensureTaskMenuPortal(){
  let portal = document.getElementById('taskMenuPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'taskMenuPortal';
    portal.className = 'task-menu-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

export function closeAllTaskMenus(){
  if(G.openMenuWrapEl){ G.openMenuWrapEl.classList.remove('open'); G.openMenuWrapEl = null; }
  const portal = document.getElementById('taskMenuPortal');
  if(portal) portal.classList.remove('show');
}

export function openTaskRowMenu(task, btnEl, wrapEl){
  const portal = ensureTaskMenuPortal();
  portal.innerHTML = `
    <button type="button" class="task-menu-item" data-action="edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Editar</button>
    <button type="button" class="task-menu-item" data-action="duplicate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>
    <button type="button" class="task-menu-item" data-action="move"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg>Mover de espaço</button>
    <button type="button" class="task-menu-item" data-action="template"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Salvar como template</button>
    <button type="button" class="task-menu-item danger" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir</button>
  `;
  const rect = btnEl.getBoundingClientRect();
  portal.style.top = Math.round(rect.bottom + 6) + 'px';
  portal.style.right = Math.round(window.innerWidth - rect.right) + 'px';
  portal.style.left = 'auto';
  portal.classList.add('show');
  wrapEl.classList.add('open');
  G.openMenuWrapEl = wrapEl;

  portal.querySelector('[data-action="edit"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    openTaskPanel(task.id);
  };
  portal.querySelector('[data-action="duplicate"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    const copy = JSON.parse(JSON.stringify(task));
    copy.id = uid('task');
    copy.title = task.title + ' (cópia)';
    copy.done = false;
    copy.createdAt = Date.now();
    (copy.subtasks||[]).forEach(s => s.id = uid('sub'));
    (copy.comments||[]).forEach(c => c.id = uid('cmt'));
    G.state.tasks.push(copy);
    markDirty();
  };
  portal.querySelector('[data-action="template"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    openTemplateEditor(null, templateFromTask(task));
  };
  portal.querySelector('[data-action="move"]').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, task.categoryId, (newCatId) => {
      task.categoryId = newCatId;
      task.tagIds = (task.tagIds||[]).filter(id => {
        const tg = G.state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === newCatId);
      });
      markDirty();
    });
    closeAllTaskMenus();
  };
  portal.querySelector('[data-action="delete"]').onclick = (e) => {
    e.stopPropagation();
    closeAllTaskMenus();
    G.state.tasks = G.state.tasks.filter(x => x.id !== task.id);
    if(G.activeTaskId === task.id) G.activeTaskId = null;
    markDirty();
  };
}

export function ensureConfirmPortal(){
  let portal = document.getElementById('confirmActionPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'confirmActionPortal';
    portal.className = 'confirm-action-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
export function closeConfirmPortal(e){
  const portal = document.getElementById('confirmActionPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
export function openConfirmPortal(anchorBtn, message, onConfirm, confirmLabel){
  const portal = ensureConfirmPortal();
  portal.innerHTML = `
    <div class="confirm-action-msg">${escapeHtml(message)}</div>
    <div class="confirm-action-buttons">
      <button type="button" class="btn ghost small" id="confirmActionCancel">Cancelar</button>
      <button type="button" class="btn small confirm-action-danger" id="confirmActionOk">${escapeHtml(confirmLabel || 'Excluir')}</button>
    </div>
  `;
  portal.classList.add('show');
  const rect = anchorBtn.getBoundingClientRect();
  const h = portal.offsetHeight || 100;
  let top = rect.bottom + 6;
  if(top + h > window.innerHeight) top = Math.max(8, rect.top - h - 6);
  portal.style.top = Math.round(top) + 'px';
  let left = rect.right - 220;
  if(left < 8) left = 8;
  if(left + 220 > window.innerWidth) left = window.innerWidth - 228;
  portal.style.left = Math.round(left) + 'px';
  portal.onclick = e => e.stopPropagation();
  portal.querySelector('#confirmActionCancel').onclick = () => closeConfirmPortal();
  portal.querySelector('#confirmActionOk').onclick = () => { closeConfirmPortal(); onConfirm(); };
}
document.addEventListener('click', closeConfirmPortal);
window.addEventListener('scroll', closeConfirmPortal, true);

export function ensureColorPortal(){
  let portal = document.getElementById('colorPickerPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'colorPickerPortal';
    portal.className = 'color-popover-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

export function closeColorPortal(e){
  const portal = document.getElementById('colorPickerPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}

export function renderTaskLinkPicker(portal, opts){
  const { currentTaskId, onSelect } = opts;
  portal.innerHTML = `
    <div class="search-input-wrap">
      <input type="text" class="tag-picker-search" id="taskPickerSearch_${portal.id}" placeholder="Buscar tarefa por nome ou ID..." autocomplete="off">
      <button type="button" class="search-clear-btn" style="display:none;" title="Limpar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="tp-tags-popover-list" id="taskPickerList_${portal.id}"></div>
  `;
  const searchInput = portal.querySelector(`#taskPickerSearch_${portal.id}`);
  const list = portal.querySelector(`#taskPickerList_${portal.id}`);
  const clearBtn = portal.querySelector('.search-clear-btn');
  clearBtn.onclick = (e) => { e.stopPropagation(); searchInput.value=''; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); };

  function renderList(){
    const term = searchInput.value.trim().toLowerCase();
    let tasks = G.state.tasks.filter(t => !t.done);
    if(term){
      tasks = tasks.filter(t => (t.title||'').toLowerCase().includes(term) || (t.shortId||'').toLowerCase().includes(term));
    }
    tasks = tasks.slice(0, 30);
    let html = '';
    if(currentTaskId){
      html += `<div class="tp-tags-popover-row tag-create-row" data-clear="1"><span class="tp-tags-popover-name">✕ Remover vínculo</span></div>`;
    }
    if(tasks.length === 0){
      html += '<div style="font-size:12px;color:var(--ink-faint); padding:6px 4px;">Nenhuma tarefa encontrada</div>';
    } else {
      html += tasks.map(t => `
        <div class="tp-tags-popover-row" data-task-id="${t.id}">
          <span class="tp-tags-popover-name">${escapeHtml(t.title||'Sem título')}</span>
          ${currentTaskId===t.id ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('');
    }
    list.innerHTML = html;
    const clearRow = list.querySelector('[data-clear]');
    if(clearRow) clearRow.onclick = () => onSelect(null);
    list.querySelectorAll('.tp-tags-popover-row[data-task-id]').forEach(row => {
      row.onclick = () => onSelect(row.dataset.taskId);
    });
  }
  searchInput.addEventListener('input', renderList);
  searchInput.addEventListener('input', () => { const cb = portal.querySelector('.search-clear-btn'); if(cb) cb.style.display = searchInput.value ? 'flex' : 'none'; });
  searchInput.addEventListener('click', e => e.stopPropagation());
  searchInput.addEventListener('keydown', e => e.stopPropagation());
  renderList();
  setTimeout(() => searchInput.focus(), 0);
}

export function renderUnifiedTagPicker(portal, opts){
  const { categoryId, isSelected, onToggle, onChanged } = opts;
  portal.innerHTML = `
    <div class="search-input-wrap">
      <input type="text" class="tag-picker-search" id="tagPickerSearch_${portal.id}" placeholder="Buscar ou criar tag..." autocomplete="off">
      <button type="button" class="search-clear-btn" style="display:none;" title="Limpar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="tp-tags-popover-list" id="tagPickerList_${portal.id}"></div>
  `;
  const searchInput = portal.querySelector(`#tagPickerSearch_${portal.id}`);
  const list = portal.querySelector(`#tagPickerList_${portal.id}`);
  const clearBtn = portal.querySelector('.search-clear-btn');
  clearBtn.onclick = (e) => { e.stopPropagation(); searchInput.value=''; searchInput.dispatchEvent(new Event('input')); searchInput.focus(); };

  function renderList(){
    const term = searchInput.value.trim().toLowerCase();
    const visibleTags = G.state.tags.filter(tg => !tg.categoryId || tg.categoryId === categoryId);
    const matchFilter = tg => !term || tg.name.toLowerCase().includes(term);
    const ofGroup = visibleTags.filter(tg => tg.categoryId === categoryId && matchFilter(tg));
    const general = visibleTags.filter(tg => !tg.categoryId && matchFilter(tg));
    const renderRow = tg => `
      <div class="tp-tags-popover-row" data-tag="${tg.id}">
        <button type="button" class="tag-row-color-dot" data-tag-color="${tg.id}" style="background:${tg.color}" title="Alterar cor"></button>
        <span class="tp-tags-popover-name">${escapeHtml(tg.name)}</span>
        ${isSelected(tg.id) ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
      </div>`;
    const exactMatch = visibleTags.some(tg => tg.name.toLowerCase() === term);
    let html = '';
    if(ofGroup.length) html += `<div class="tp-tags-popover-section">Deste espaço</div>` + ofGroup.map(renderRow).join('');
    if(general.length) html += `<div class="tp-tags-popover-section">Gerais</div>` + general.map(renderRow).join('');
    if(term && !exactMatch){
      html += `<div class="tp-tags-popover-row tag-create-row" data-create="1"><span class="tp-tags-popover-name">+ Criar tag "${escapeHtml(searchInput.value.trim())}"</span></div>`;
    }
    if(!html){
      html = '<div style="font-size:12px;color:var(--ink-faint); padding:6px 4px;">Nenhuma tag encontrada</div>';
    }
    list.innerHTML = html;

    list.querySelectorAll('.tp-tags-popover-row[data-tag]').forEach(row => {
      row.addEventListener('click', (e) => {
        if(e.target.closest('.tag-row-color-dot')) return;
        onToggle(row.dataset.tag);
        renderList();
        if(onChanged) onChanged();
      });
      const colorDot = row.querySelector('.tag-row-color-dot');
      colorDot.onclick = (e) => {
        e.stopPropagation();
        const tag = G.state.tags.find(t => t.id === row.dataset.tag);
        if(!tag) return;
        openColorPortal(tag.color, colorDot, (color) => {
          tag.color = color;
          colorDot.style.background = color;
          markDirty();
          if(onChanged) onChanged();
        });
      };
    });
    const createRow = list.querySelector('[data-create]');
    if(createRow){
      createRow.onclick = () => {
        const name = searchInput.value.trim();
        if(!name) return;
        const color = DEFAULT_COLORS[G.state.tags.length % DEFAULT_COLORS.length];
        const newTag = { id: uid('tag'), name, color, categoryId };
        G.state.tags.push(newTag);
        onToggle(newTag.id);
        searchInput.value = '';
        renderList();
        if(onChanged) onChanged();
      };
    }
  }
  searchInput.addEventListener('input', renderList);
  searchInput.addEventListener('input', () => { const cb = portal.querySelector('.search-clear-btn'); if(cb) cb.style.display = searchInput.value ? 'flex' : 'none'; });
  searchInput.addEventListener('click', e => e.stopPropagation());
  searchInput.addEventListener('keydown', e => e.stopPropagation());
  renderList();
  setTimeout(() => searchInput.focus(), 0);
}

