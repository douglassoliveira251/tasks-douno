import { G } from './globais.js';
import { DEFAULT_COLORS } from './01-estado.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { openConfirmPortal } from './13-portais-de-tarefa.js';
import { icon } from './icones.js';
import { gripHtml, makeSortable } from './56-arrastar-ordem.js';

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
        <p class="settings-section-desc">Organize tarefas, agendas, notas e projetos por espaço. A estrela define o espaço aberto ao entrar no sistema.</p>
      </div>
    </div>
    <div class="tag-add-row">
      <button type="button" class="tag-swatch" id="catNewColor" title="Escolher cor" aria-label="Escolher cor do novo espaço"></button>
      <input type="text" class="tp-input" id="catNewName" placeholder="Novo espaço…" maxlength="40">
      <button type="button" class="btn primary" id="addCatBtn">+ Adicionar</button>
    </div>
    <div id="catRows"></div>
    <div class="tag-order-row">
      <span class="settings-order-label">Ordenar por:</span>
      <select class="tp-select settings-order-select" id="catOrderSelect">
        <option value="creation" ${G.state.categoryOrder==='creation'?'selected':''}>Criação</option>
        <option value="alphabetical" ${G.state.categoryOrder==='alphabetical'?'selected':''}>Alfabética</option>
        <option value="custom" ${G.state.categoryOrder==='custom'?'selected':''}>Personalizada</option>
      </select>
    </div>
  `;
  document.getElementById('catOrderSelect').addEventListener('change', e => {
    G.state.categoryOrder = e.target.value;
    markDirty();
    renderCatRows();
  });
  let newColor = DEFAULT_COLORS[G.state.categories.length % DEFAULT_COLORS.length];
  const swNew = document.getElementById('catNewColor');
  swNew.style.background = newColor;
  swNew.onclick = () => openTagColorPalette(swNew, newColor, c => { newColor = c; swNew.style.background = c; }, 'Cor do espaço');
  const nameNew = document.getElementById('catNewName');
  const addCat = () => {
    const name = nameNew.value.trim();
    if(!name){ nameNew.focus(); return; }
    const nc = { id: uid('cat'), name, color: newColor };
    G.state.categories.push(nc);
    if(Array.isArray(G.state.calSpaces)) G.state.calSpaces.push(nc.id); // espaço novo já aparece no calendário
    markDirty();
    renderCategoriesPanel(panel);
    document.getElementById('catNewName').focus();
  };
  document.getElementById('addCatBtn').onclick = addCat;
  nameNew.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); addCat(); } });
  renderCatRows();
}

/* Quantidade de itens de cada tipo em um espaço, para a linha e para o aviso ao remover. */
function spaceUsage(catId){
  const st = G.state;
  const n = {
    tarefas: st.tasks.filter(t => t.categoryId === catId).length,
    agendas: (st.events || []).filter(e => e.categoryId === catId).length,
    notas: st.notes.filter(x => x.categoryId === catId).length,
    projetos: (st.projects || []).filter(p => p.categoryId === catId).length,
  };
  const parts = [];
  const add = (q, um, mais) => { if(q) parts.push(q + ' ' + (q === 1 ? um : mais)); };
  add(n.tarefas, 'tarefa', 'tarefas');
  add(n.agendas, 'agenda', 'agendas');
  add(n.notas, 'nota', 'notas');
  add(n.projetos, 'projeto', 'projetos');
  return { n, total: n.tarefas + n.agendas + n.notas + n.projetos, text: parts.join(' · ') };
}

export function renderCatRows(focusId){
  const rows = document.getElementById('catRows');
  if(!rows) return;
  rows.innerHTML = '';
  const ordered = getOrderedCategories();
  ordered.forEach((cat, idx) => {
    const use = spaceUsage(cat.id);
    const isDef = G.state.defaultCategoryFilter === cat.id;
    const row = document.createElement('div');
    row.className = 'tag-row-settings cat-row-settings';
    row.dataset.id = cat.id;
    row.innerHTML = `
      ${gripHtml('Arrastar para reordenar o espaço')}
      <button type="button" class="tag-swatch round" title="Mudar a cor" aria-label="Mudar a cor de ${escapeHtml(cat.name)}" style="background:${escapeHtml(cat.color)}"></button>
      <input type="text" class="tag-name-input" value="${escapeHtml(cat.name)}" maxlength="40" aria-label="Nome do espaço">
      <span class="tag-row-use cat-row-use">${use.total === 0 ? 'Sem uso' : use.text}</span>
      <button type="button" class="tag-del cat-star${isDef ? ' active' : ''}" title="${isDef ? 'Espaço padrão' : 'Definir como espaço padrão'}" aria-label="Definir como espaço padrão" aria-pressed="${isDef}">${icon('star', isDef ? 'fill' : 'regular')}</button>
      <button type="button" class="tag-del cat-del" title="Remover" aria-label="Remover espaço">${icon('trash')}</button>
    `;
    row.querySelector('.cat-star').onclick = () => {
      G.state.defaultCategoryFilter = G.state.defaultCategoryFilter === cat.id ? null : cat.id;
      markDirty();
      renderCatRows();
    };
    const sw = row.querySelector('.tag-swatch');
    sw.onclick = () => openTagColorPalette(sw, cat.color, c => { cat.color = c; markDirty(); renderCatRows(); }, 'Cor do espaço');
    const nameInput = row.querySelector('.tag-name-input');
    nameInput.addEventListener('blur', e => { cat.name = e.target.value.trim() || cat.name; markDirty(); renderCatRows(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('.cat-del').onclick = (e) => {
      e.stopPropagation();
      if(G.state.categories.length === 1){ alert('Mantenha ao menos um espaço.'); return; }
      const msg = use.total > 0
        ? `Remover "${cat.name}"? ${use.text} deste espaço serão movidos para o primeiro espaço disponível.`
        : `Remover "${cat.name}"?`;
      openConfirmPortal(e.currentTarget, msg, () => {
        const fallback = G.state.categories.find(c => c.id !== cat.id);
        G.state.tasks.forEach(t => { if(t.categoryId === cat.id) t.categoryId = fallback.id; });
        G.state.notes.forEach(n => { if(n.categoryId === cat.id) n.categoryId = fallback.id; });
        (G.state.events || []).forEach(ev => { if(ev.categoryId === cat.id) ev.categoryId = fallback.id; });
        (G.state.projects || []).forEach(p => { if(p.categoryId === cat.id) p.categoryId = fallback.id; });
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
  makeSortable(rows, { rowSel: '.cat-row-settings', onReorder: ids => {
    const map = new Map(G.state.categories.map(c => [c.id, c]));
    G.state.categories = ids.map(id => map.get(id)).filter(Boolean);
    G.state.categoryOrder = 'custom';
    const sel = document.getElementById('catOrderSelect'); if(sel) sel.value = 'custom';
    markDirty();
    renderCatRows();
  } });
}

/* Seletor de espaço (lista suspensa própria): bolinha de cor + nome, sem números.
   options: [{ id, label, color }]. Chama onChange(id) ao escolher. */
export function mountSpaceCombo(host, { value, options, onChange, label = 'Espaço' }){
  const cur = options.find(o => o.id === value) || options[0];
  const dot = c => `<i class="sp-dot" style="background:${escapeHtml(c || 'var(--ink-faint)')}"></i>`;
  host.innerHTML = `
    <div class="sp-combo">
      <button type="button" class="sp-combo-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(label)}">
        ${dot(cur && cur.color)}<span class="sp-combo-text">${escapeHtml(cur ? cur.label : '')}</span>${icon('caret-down')}
      </button>
    </div>`;
  const btn = host.querySelector('.sp-combo-btn');
  let list = null, idx = 0;
  const close = () => {
    if(!list) return;
    list.remove(); list = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onDoc, true);
    window.removeEventListener('resize', close);
  };
  const onDoc = e => { if(list && !list.contains(e.target) && !btn.contains(e.target)) close(); };
  const pick = id => { close(); if(id !== (cur && cur.id)) onChange(id); };
  const paintActive = () => list.querySelectorAll('.sp-opt').forEach((el, i) => el.classList.toggle('kb', i === idx));
  const open = () => {
    if(list) return;
    list = document.createElement('div');
    list.className = 'sp-list';
    list.setAttribute('role', 'listbox');
    list.innerHTML = options.map(o => `<button type="button" role="option" class="sp-opt${cur && o.id === cur.id ? ' sel' : ''}" aria-selected="${!!cur && o.id === cur.id}" data-id="${escapeHtml(o.id)}">${dot(o.color)}<span>${escapeHtml(o.label)}</span>${cur && o.id === cur.id ? icon('check') : ''}</button>`).join('');
    document.body.appendChild(list);
    const r = btn.getBoundingClientRect();
    list.style.minWidth = r.width + 'px';
    const h = list.offsetHeight;
    const below = window.innerHeight - r.bottom;
    list.style.left = Math.max(8, Math.min(window.innerWidth - list.offsetWidth - 8, r.left)) + 'px';
    list.style.top = (below < h + 12 && r.top > below ? r.top - h - 6 : r.bottom + 6) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    idx = Math.max(0, options.findIndex(o => cur && o.id === cur.id));
    paintActive();
    list.querySelectorAll('.sp-opt').forEach(el => { el.onclick = () => pick(el.dataset.id); });
    document.addEventListener('mousedown', onDoc, true);
    window.addEventListener('resize', close);
  };
  btn.onclick = () => (list ? close() : open());
  btn.addEventListener('keydown', e => {
    if(e.key === 'Escape'){ if(list){ e.stopPropagation(); close(); } return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if(!list){ open(); return; }
      idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      paintActive();
    } else if((e.key === 'Enter' || e.key === ' ') && list){
      e.preventDefault(); pick(options[idx].id);
    }
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
export function openTagColorPalette(anchor, current, onPick, title = 'Cor da tag'){
  document.querySelectorAll('.tag-pal-pop').forEach(p => p.remove());
  const pop = document.createElement('div');
  pop.className = 'tag-pal-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', title);
  const cur = String(current || '').toLowerCase();
  pop.innerHTML = `<div class="tag-pal-title">${title}</div><div class="tag-pal-grid">${TAG_PALETTE.map(c => {
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
        <p class="settings-section-desc">Tags coloridas para organizar tarefas, agendas e notas. Escolha o espaço para ver e editar as tags dele.</p>
      </div>
      <div class="tag-space-pick">
        <div class="tag-space-lbl">Espaço</div>
        <div id="tagSpaceHost"></div>
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
  mountSpaceCombo(document.getElementById('tagSpaceHost'), {
    value: G.tagSpaceFilter,
    label: 'Espaço das tags',
    options: G.state.categories.map(c => ({ id: c.id, label: c.name, color: c.color || 'var(--primary)' })).concat([{ id: '__geral', label: 'Gerais', color: '' }]),
    onChange: id => { G.tagSpaceFilter = id; renderTagsPanel(panel); },
  });

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
  if(ordered.length === 0){
    rows.innerHTML = `<p class="tag-empty">Nenhuma tag neste espaço ainda. Crie a primeira acima — ou direto no painel de uma tarefa.</p>`;
    return;
  }
  ordered.forEach((tag, idx) => {
    const usedIn = G.state.tasks.filter(t => (t.tagIds||[]).includes(tag.id)).length;
    const row = document.createElement('div');
    row.className = 'tag-row-settings';
    row.dataset.id = tag.id;
    row.innerHTML = `
      ${gripHtml('Arrastar para reordenar a tag')}
      <button type="button" class="tag-swatch round" title="Mudar a cor" aria-label="Mudar a cor de ${escapeHtml(tag.name)}" style="background:${escapeHtml(tag.color)}"></button>
      <input type="text" class="tag-name-input" value="${escapeHtml(tag.name)}" maxlength="40" aria-label="Nome da tag">
      <span class="task-tag-pill tag-row-preview" style="--tg:${escapeHtml(tag.color)}">${escapeHtml(tag.name)}</span>
      <span class="tag-row-use">${usedIn === 0 ? 'Sem uso' : usedIn + (usedIn === 1 ? ' tarefa' : ' tarefas')}</span>
      <button type="button" class="tag-del" title="Remover" aria-label="Remover tag">${icon('trash')}</button>
    `;
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
  makeSortable(rows, { rowSel: '.tag-row-settings', onReorder: ids => {
    /* a lista visível é só do espaço escolhido: as tags dele entram nos mesmos lugares da lista completa */
    const full = getOrderedTags();
    const map = new Map(full.map(t => [t.id, t]));
    const vis = new Set(ids);
    let k = 0;
    G.state.tags = full.map(t => vis.has(t.id) ? map.get(ids[k++]) : t);
    G.state.tagOrder = 'custom';
    const sel = document.getElementById('tagOrderSelect'); if(sel) sel.value = 'custom';
    markDirty();
    renderTagRows();
  } });
}
