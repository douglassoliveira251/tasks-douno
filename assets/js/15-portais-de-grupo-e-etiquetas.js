import { G } from './globais.js';
import { DEFAULT_COLORS } from './01-estado.js';
import { escapeHtml, uid } from './10-helpers.js';
import { closeAllTaskMenus, closeColorPortal, ensureColorPortal } from './13-portais-de-tarefa.js';
import { getOrderedCategories } from './38-configuracoes-espacos-e-etiquetas.js';
import { render } from './48-render-principal.js';

export function ensureMoveGroupPortal(){
  let portal = document.getElementById('moveGroupPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'moveGroupPortal';
    portal.className = 'tp-tags-popover tags-picker-portal';
    document.body.appendChild(portal);
  }
  return portal;
}
export function closeMoveGroupPortal(e){
  const portal = document.getElementById('moveGroupPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}
export function openMoveGroupPortal(anchorBtn, currentCatId, onSelect){
  const portal = ensureMoveGroupPortal();
  const wasOpen = portal.classList.contains('show') && portal.dataset.forBtn === anchorBtn.dataset.moveGroupId;
  closeMoveGroupPortal();
  if(wasOpen) return;
  if(!anchorBtn.dataset.moveGroupId) anchorBtn.dataset.moveGroupId = uid('mvgrp');
  portal.dataset.forBtn = anchorBtn.dataset.moveGroupId;
  portal.innerHTML = `
    <div class="tp-tags-popover-list">
      ${getOrderedCategories().map(c => `
        <div class="tp-tags-popover-row" data-cat="${c.id}">
          <span class="cat-swatch" style="background:${c.color}"></span>
          <span class="tp-tags-popover-name">${escapeHtml(c.name)}</span>
          ${c.id===currentCatId ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('')}
    </div>
  `;
  portal.classList.add('show');
  positionTagsPortalNear(portal, anchorBtn);
  portal.onclick = e => e.stopPropagation();
  portal.querySelectorAll('.tp-tags-popover-row').forEach(row => {
    row.onclick = () => {
      onSelect(row.dataset.cat);
      closeMoveGroupPortal();
    };
  });
}
document.addEventListener('click', closeMoveGroupPortal);
window.addEventListener('scroll', closeMoveGroupPortal, true);

export function openNotebookMovePortal(anchorBtn, categoryId, currentNotebookId, onSelect){
  const portal = ensureMoveGroupPortal();
  const wasOpen = portal.classList.contains('show') && portal.dataset.forBtn === anchorBtn.dataset.moveGroupId;
  closeMoveGroupPortal();
  if(wasOpen) return;
  if(!anchorBtn.dataset.moveGroupId) anchorBtn.dataset.moveGroupId = uid('mvnb');
  portal.dataset.forBtn = anchorBtn.dataset.moveGroupId;
  const spaceNbs = G.state.notebooks
    .filter(nb => nb.categoryId === categoryId)
    .sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  portal.innerHTML = `
    <div class="tp-tags-popover-list">
      ${spaceNbs.length ? spaceNbs.map(nb => `
        <div class="tp-tags-popover-row" data-nb="${nb.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--ink-faint); flex-shrink:0;"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span class="tp-tags-popover-name">${escapeHtml(nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome')}</span>
          ${nb.id===currentNotebookId ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>
      `).join('') : `<div style="font-size:12px;color:var(--ink-faint); padding:4px 2px;">Nenhum outro caderno neste espaço</div>`}
    </div>
  `;
  portal.classList.add('show');
  positionTagsPortalNear(portal, anchorBtn);
  portal.onclick = e => e.stopPropagation();
  portal.querySelectorAll('.tp-tags-popover-row').forEach(row => {
    row.onclick = () => {
      onSelect(row.dataset.nb);
      closeMoveGroupPortal();
    };
  });
}

export function ensureTagsPortal(){
  let portal = document.getElementById('tagsPickerPortal');
  if(!portal){
    portal = document.createElement('div');
    portal.id = 'tagsPickerPortal';
    portal.className = 'tp-tags-popover tags-picker-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

export function closeTagsPortal(e){
  const portal = document.getElementById('tagsPickerPortal');
  if(!portal) return;
  if(e && e.target instanceof Element && portal.contains(e.target)) return;
  portal.classList.remove('show');
}

export function positionTagsPortalNear(portal, anchorBtn){
  const rect = anchorBtn.getBoundingClientRect();
  const estHeight = portal.offsetHeight || 240;
  let top = rect.bottom + 6;
  if(top + estHeight > window.innerHeight) top = Math.max(8, rect.top - estHeight - 6);
  portal.style.top = Math.round(top) + 'px';
  let left = rect.left;
  if(left + 220 > window.innerWidth) left = window.innerWidth - 228;
  portal.style.left = Math.round(Math.max(8,left)) + 'px';
}

export function openColorPortal(currentColor, btnEl, onSelect){
  const portal = ensureColorPortal();
  const wasOpenForThisBtn = portal.classList.contains('show') && portal.dataset.forBtn === btnEl.dataset.portalId;
  closeColorPortal();
  if(wasOpenForThisBtn) return;
  if(!btnEl.dataset.portalId) btnEl.dataset.portalId = uid('cswatch');
  portal.dataset.forBtn = btnEl.dataset.portalId;
  portal.innerHTML = DEFAULT_COLORS.map(c => `<span class="note-color-dot ${c===currentColor?'selected':''}" data-color="${c}" style="background:${c}"></span>`).join('');
  const rect = btnEl.getBoundingClientRect();
  portal.classList.add('show');
  const portalHeight = portal.offsetHeight || 90;
  let top = rect.bottom + 6;
  if(top + portalHeight > window.innerHeight) top = rect.top - portalHeight - 6;
  portal.style.top = Math.round(top) + 'px';
  let left = rect.left;
  if(left + 160 > window.innerWidth) left = window.innerWidth - 168;
  portal.style.left = Math.round(left) + 'px';
  portal.querySelectorAll('.note-color-dot').forEach(dot => {
    dot.onclick = (e) => {
      e.stopPropagation();
      onSelect(dot.dataset.color);
      closeColorPortal();
    };
  });
  portal.onclick = e => e.stopPropagation();
}

document.addEventListener('click', closeColorPortal);
document.addEventListener('click', closeTagsPortal);
window.addEventListener('scroll', closeTagsPortal, true);
document.addEventListener('click', () => {
  const dd = document.getElementById('tpStatusDropdown');
  if(dd) dd.style.display = 'none';
  const gd = document.getElementById('groupModeDropdown');
  if(gd) gd.style.display = 'none';
});
document.addEventListener('click', () => {
  if(G.tagFilterPopoverOpen){ G.tagFilterPopoverOpen = false; render(); }
});
document.addEventListener('click', () => {
  if(G.criticalityFilterPopoverOpen){ G.criticalityFilterPopoverOpen = false; render(); }
});
window.addEventListener('scroll', closeColorPortal, true);
document.addEventListener('click', closeAllTaskMenus);
window.addEventListener('scroll', closeAllTaskMenus, true);
window.addEventListener('resize', closeAllTaskMenus);


