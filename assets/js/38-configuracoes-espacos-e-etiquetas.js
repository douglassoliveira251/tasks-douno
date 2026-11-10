import { G } from './globais.js';
import { DEFAULT_COLORS } from './01-estado.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { openConfirmPortal } from './13-portais-de-tarefa.js';
import { icon } from './icones.js';

export function getOrderedCategories(){
  const list = G.state.categories.slice();
  if(G.state.categoryOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

export function renderCategoriesPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Espaços</h3>
        <p class="settings-section-desc">Organize tarefas e notas por espaço. Clique na estrela para definir o espaço padrão ao abrir o sistema.</p>
      </div>
      <div class="settings-order-control">
        <span class="settings-order-label">Ordenar por:</span>
        <select class="tp-select settings-order-select" id="catOrderSelect">
          <option value="creation" ${G.state.categoryOrder==='creation'?'selected':''}>Criação</option>
          <option value="alphabetical" ${G.state.categoryOrder==='alphabetical'?'selected':''}>Alfabética</option>
          <option value="custom" ${G.state.categoryOrder==='custom'?'selected':''}>Personalizada</option>
        </select>
      </div>
    </div>
    <div id="catRows"></div>
    <button class="btn ghost small" id="addCatBtn" style="margin-top:10px;">+ Adicionar espaço</button>
  `;
  document.getElementById('catOrderSelect').addEventListener('change', e => {
    G.state.categoryOrder = e.target.value;
    markDirty();
    renderCatRows();
  });
  renderCatRows();
  document.getElementById('addCatBtn').onclick = () => {
    const color = DEFAULT_COLORS[G.state.categories.length % DEFAULT_COLORS.length];
    const newCat = { id: uid('cat'), name: 'Novo espaço', color };
    G.state.categories.push(newCat);
    markDirty();
    renderCatRows(newCat.id);
  };
}

export function renderCatRows(focusId){
  const rows = document.getElementById('catRows');
  if(!rows) return;
  rows.innerHTML = '';
  const ordered = getOrderedCategories();
  const isCustom = G.state.categoryOrder === 'custom';
  ordered.forEach((cat, idx) => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <button type="button" class="fav-star-btn ${G.state.defaultCategoryFilter===cat.id?'active':''}" title="Definir como espaço padrão">${icon('star')}</button>
      <input type="color" value="${cat.color}">
      <input type="text" value="${escapeHtml(cat.name)}">
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima">${icon('caret-up')}</button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo">${icon('caret-down')}</button>
      ` : ''}
      <button title="Remover">${icon('trash')}</button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = G.state.categories.findIndex(c => c.id === cat.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= G.state.categories.length) return;
          [G.state.categories[realIdx], G.state.categories[swapIdx]] = [G.state.categories[swapIdx], G.state.categories[realIdx]];
          markDirty();
          renderCatRows();
        };
      });
    }
    row.querySelector('.fav-star-btn').onclick = () => {
      G.state.defaultCategoryFilter = G.state.defaultCategoryFilter === cat.id ? null : cat.id;
      markDirty();
      renderCatRows();
    };
    row.querySelector('input[type=color]').oninput = e => { cat.color = e.target.value; markDirty(); renderCatRows(); };
    const nameInput = row.querySelector('input[type=text]');
    nameInput.addEventListener('blur', e => { cat.name = e.target.value.trim() || cat.name; markDirty(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('button[title="Remover"]').onclick = (e) => {
      e.stopPropagation();
      if(G.state.categories.length === 1){ alert('Mantenha ao menos um espaço.'); return; }
      openConfirmPortal(e.currentTarget, `Remover "${cat.name}"? Tarefas e notas desse espaço serão movidas para o primeiro espaço disponível.`, () => {
        const fallback = G.state.categories.find(c => c.id !== cat.id);
        G.state.tasks.forEach(t => { if(t.categoryId === cat.id) t.categoryId = fallback.id; });
        G.state.notes.forEach(n => { if(n.categoryId === cat.id) n.categoryId = fallback.id; });
        G.state.categories = G.state.categories.filter(c => c.id !== cat.id);
        if(G.activeCategoryFilter === cat.id) G.activeCategoryFilter = null;
        if(G.dashboardSpace === cat.id) G.dashboardSpace = null;
        if(G.state.defaultCategoryFilter === cat.id) G.state.defaultCategoryFilter = null;
        markDirty();
        renderCatRows();
      });
    };
    rows.appendChild(row);
    if(cat.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}

export function getOrderedTags(){
  const list = G.state.tags.slice();
  if(G.state.tagOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

/* Paleta fixa de cores das tags (sem cor personalizada). */
export const TAG_PALETTE = ['#2F5F9E','#4A6FA5','#3D8B8B','#2F6F5E','#6FA34B','#E2A83D','#F2994A','#C0453A','#E11D48','#B5838D','#9B5DE5','#6C5CE7','#475569','#0F172A','#14B8A6','#0EA5E9'];

/* Abre a paleta embaixo do botão de cor; chama onPick(cor) ao escolher. */
export function openTagColorPalette(anchor, current, onPick){
  document.querySelectorAll('.tag-pal-pop').forEach(p => p.remove());
  const pop = document.createElement('div');
  pop.className = 'tag-pal-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Cor da tag');
  const cur = String(current || '').toLowerCase();
  pop.innerHTML = `<div class="tag-pal-title">Cor da tag</div><div class="tag-pal-grid">${TAG_PALETTE.map(c => {
    const on = c.toLowerCase() === cur;
    return `<button type="button" class="tag-pal-dot${on ? ' sel' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}">${on ? icon('check') : ''}</button>`;
  }).join('')}</div>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = (r.bottom + 6) + 'px';
  const close = () => { pop.remove(); document.removeEventListener('mousedown', onDoc, true); document.removeEventListener('keydown', onKey, true); };
  const onDoc = e => { if(!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const onKey = e => { if(e.key === 'Escape'){ e.stopPropagation(); close(); } };
  document.addEventListener('mousedown', onDoc, true);
  document.addEventListener('keydown', onKey, true);
  pop.querySelectorAll('.tag-pal-dot').forEach(b => { b.onclick = () => { close(); onPick(b.dataset.c); }; });
}

export function renderTagsPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Tags</h3>
        <p class="settings-section-desc">Cores e nomes para marcar tarefas.</p>
      </div>
      <div class="tag-space-pick">
        <div class="tag-space-lbl">Espaço</div>
        <div class="tag-space-combo"><i id="tagSpaceDot"></i><select class="tp-select" id="tagSpaceSelect" aria-label="Espaço das tags"></select></div>
      </div>
    </div>
    <div class="tag-add-row">
      <button type="button" class="tag-swatch" id="tagNewColor" title="Escolher cor" aria-label="Escolher cor da nova tag"></button>
      <input type="text" class="tp-input" id="tagNewName" placeholder="Nova tag…" maxlength="40">
      <button type="button" class="btn primary" id="addTagBtn">+ Adicionar</button>
    </div>
    <div id="tagRows"></div>
    <div class="tag-order-row">
      <span class="settings-order-label">Ordenar por:</span>
      <select class="tp-select settings-order-select" id="tagOrderSelect">
        <option value="creation" ${G.state.tagOrder==='creation'?'selected':''}>Criação</option>
        <option value="alphabetical" ${G.state.tagOrder==='alphabetical'?'selected':''}>Alfabética</option>
        <option value="custom" ${G.state.tagOrder==='custom'?'selected':''}>Personalizada</option>
      </select>
    </div>
  `;
  /* espaço atual: o filtro guardado, senão o espaço ativo, senão o primeiro */
  const valid = id => id === '__geral' || !!catById(id);
  if(!G.tagSpaceFilter || !valid(G.tagSpaceFilter)){
    G.tagSpaceFilter = (G.activeCategoryFilter && valid(G.activeCategoryFilter)) ? G.activeCategoryFilter : (G.state.categories[0] ? G.state.categories[0].id : '__geral');
  }
  const sel = document.getElementById('tagSpaceSelect');
  const cnt = id => G.state.tags.filter(t => id === '__geral' ? !t.categoryId : t.categoryId === id).length;
  sel.innerHTML = G.state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)} · ${cnt(c.id)}</option>`).join('')
    + `<option value="__geral">Gerais (todos os espaços) · ${cnt('__geral')}</option>`;
  sel.value = G.tagSpaceFilter;
  const dotCat = G.tagSpaceFilter === '__geral' ? null : catById(G.tagSpaceFilter);
  document.getElementById('tagSpaceDot').style.background = dotCat ? (dotCat.color || 'var(--primary)') : 'var(--ink-faint)';
  sel.addEventListener('change', e => { G.tagSpaceFilter = e.target.value; renderTagsPanel(panel); });

  let newColor = TAG_PALETTE[G.state.tags.length % TAG_PALETTE.length];
  const swNew = document.getElementById('tagNewColor');
  swNew.style.background = newColor;
  swNew.onclick = () => openTagColorPalette(swNew, newColor, c => { newColor = c; swNew.style.background = c; });
  const nameNew = document.getElementById('tagNewName');
  const addTag = () => {
    const name = nameNew.value.trim();
    if(!name){ nameNew.focus(); return; }
    const f = G.tagSpaceFilter;
    G.state.tags.push({ id: uid('tag'), name, color: newColor, categoryId: (f && f !== '__geral' && catById(f)) ? f : null });
    markDirty();
    renderTagsPanel(panel);
    document.getElementById('tagNewName').focus();
  };
  document.getElementById('addTagBtn').onclick = addTag;
  nameNew.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); addTag(); } });

  document.getElementById('tagOrderSelect').addEventListener('change', e => {
    G.state.tagOrder = e.target.value;
    markDirty();
    renderTagRows();
  });
  renderTagRows();
}

export function renderTagRows(focusId){
  const rows = document.getElementById('tagRows');
  if(!rows) return;
  rows.innerHTML = '';
  const f0 = G.tagSpaceFilter;
  const ordered = getOrderedTags().filter(t => f0 === '__geral' ? !t.categoryId : t.categoryId === f0);
  const isCustom = G.state.tagOrder === 'custom';
  if(ordered.length === 0){
    rows.innerHTML = `<p class="tag-empty">Nenhuma tag neste espaço ainda. Crie a primeira acima — ou direto no painel de uma tarefa.</p>`;
    return;
  }
  ordered.forEach((tag, idx) => {
    const usedIn = G.state.tasks.filter(t => (t.tagIds||[]).includes(tag.id)).length;
    const row = document.createElement('div');
    row.className = 'tag-row-settings';
    row.innerHTML = `
      <button type="button" class="tag-swatch round" title="Mudar a cor" aria-label="Mudar a cor de ${escapeHtml(tag.name)}" style="background:${escapeHtml(tag.color)}"></button>
      <input type="text" class="tag-name-input" value="${escapeHtml(tag.name)}" maxlength="40" aria-label="Nome da tag">
      <span class="task-tag-pill tag-row-preview" style="--tg:${escapeHtml(tag.color)}">${escapeHtml(tag.name)}</span>
      <span class="tag-row-use">${usedIn === 0 ? 'Sem uso' : usedIn + (usedIn === 1 ? ' tarefa' : ' tarefas')}</span>
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima">${icon('caret-up')}</button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo">${icon('caret-down')}</button>
      ` : ''}
      <button type="button" class="tag-del" title="Remover" aria-label="Remover tag">${icon('trash')}</button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = G.state.tags.findIndex(t => t.id === tag.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= G.state.tags.length) return;
          [G.state.tags[realIdx], G.state.tags[swapIdx]] = [G.state.tags[swapIdx], G.state.tags[realIdx]];
          markDirty();
          renderTagRows();
        };
      });
    }
    const sw = row.querySelector('.tag-swatch');
    sw.onclick = () => openTagColorPalette(sw, tag.color, c => { tag.color = c; markDirty(); renderTagRows(); });
    const nameInput = row.querySelector('.tag-name-input');
    nameInput.addEventListener('input', e => { row.querySelector('.tag-row-preview').textContent = e.target.value || tag.name; });
    nameInput.addEventListener('blur', e => { tag.name = e.target.value.trim() || tag.name; markDirty(); renderTagRows(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('.tag-del').onclick = (e) => {
      e.stopPropagation();
      const msg = usedIn > 0
        ? `Remover a tag "${tag.name}"? Ela será retirada de ${usedIn} tarefa(s).`
        : `Remover a tag "${tag.name}"?`;
      openConfirmPortal(e.currentTarget, msg, () => {
        G.state.tasks.forEach(t => { if(t.tagIds) t.tagIds = t.tagIds.filter(id => id !== tag.id); });
        G.state.tags = G.state.tags.filter(tg => tg.id !== tag.id);
        markDirty();
        renderTagsPanel(document.getElementById('settingsPanel'));
      });
    };
    rows.appendChild(row);
    if(tag.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}
