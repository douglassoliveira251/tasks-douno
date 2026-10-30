function getOrderedCategories(){
  const list = state.categories.slice();
  if(state.categoryOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderCategoriesPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Espaços</h3>
        <p class="settings-section-desc">Organize tarefas e notas por espaço. Clique na estrela para definir o espaço padrão ao abrir o sistema.</p>
      </div>
      <div class="settings-order-control">
        <span class="settings-order-label">Ordenar por:</span>
        <select class="tp-select settings-order-select" id="catOrderSelect">
          <option value="creation" ${state.categoryOrder==='creation'?'selected':''}>Criação</option>
          <option value="alphabetical" ${state.categoryOrder==='alphabetical'?'selected':''}>Alfabética</option>
          <option value="custom" ${state.categoryOrder==='custom'?'selected':''}>Personalizada</option>
        </select>
      </div>
    </div>
    <div id="catRows"></div>
    <button class="btn ghost small" id="addCatBtn" style="margin-top:10px;">+ Adicionar espaço</button>
  `;
  document.getElementById('catOrderSelect').addEventListener('change', e => {
    state.categoryOrder = e.target.value;
    markDirty();
    renderCatRows();
  });
  renderCatRows();
  document.getElementById('addCatBtn').onclick = () => {
    const color = DEFAULT_COLORS[state.categories.length % DEFAULT_COLORS.length];
    const newCat = { id: uid('cat'), name: 'Novo espaço', color };
    state.categories.push(newCat);
    markDirty();
    renderCatRows(newCat.id);
  };
}

function renderCatRows(focusId){
  const rows = document.getElementById('catRows');
  if(!rows) return;
  rows.innerHTML = '';
  const ordered = getOrderedCategories();
  const isCustom = state.categoryOrder === 'custom';
  ordered.forEach((cat, idx) => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <button type="button" class="fav-star-btn ${state.defaultCategoryFilter===cat.id?'active':''}" title="Definir como espaço padrão"><svg viewBox="0 0 24 24" fill="${state.defaultCategoryFilter===cat.id?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></button>
      <input type="color" value="${cat.color}">
      <input type="text" value="${escapeHtml(cat.name)}">
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      ` : ''}
      <button title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = state.categories.findIndex(c => c.id === cat.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= state.categories.length) return;
          [state.categories[realIdx], state.categories[swapIdx]] = [state.categories[swapIdx], state.categories[realIdx]];
          markDirty();
          renderCatRows();
        };
      });
    }
    row.querySelector('.fav-star-btn').onclick = () => {
      state.defaultCategoryFilter = state.defaultCategoryFilter === cat.id ? null : cat.id;
      markDirty();
      renderCatRows();
    };
    row.querySelector('input[type=color]').oninput = e => { cat.color = e.target.value; markDirty(); renderCatRows(); };
    const nameInput = row.querySelector('input[type=text]');
    nameInput.addEventListener('blur', e => { cat.name = e.target.value.trim() || cat.name; markDirty(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('button[title="Remover"]').onclick = (e) => {
      e.stopPropagation();
      if(state.categories.length === 1){ alert('Mantenha ao menos um espaço.'); return; }
      openConfirmPortal(e.currentTarget, `Remover "${cat.name}"? Tarefas e notas desse espaço serão movidas para o primeiro espaço disponível.`, () => {
        const fallback = state.categories.find(c => c.id !== cat.id);
        state.tasks.forEach(t => { if(t.categoryId === cat.id) t.categoryId = fallback.id; });
        state.notes.forEach(n => { if(n.categoryId === cat.id) n.categoryId = fallback.id; });
        state.categories = state.categories.filter(c => c.id !== cat.id);
        if(activeCategoryFilter === cat.id) activeCategoryFilter = null;
        if(dashboardSpace === cat.id) dashboardSpace = null;
        if(state.defaultCategoryFilter === cat.id) state.defaultCategoryFilter = null;
        markDirty();
        renderCatRows();
      });
    };
    rows.appendChild(row);
    if(cat.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}

function getOrderedTags(){
  const list = state.tags.slice();
  if(state.tagOrder === 'alphabetical') list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderTagsPanel(panel){
  panel.innerHTML = `
    <div class="settings-section-header-row">
      <div class="settings-header-text">
        <h3 class="settings-section-title">Tags</h3>
        <p class="settings-section-desc">Tags coloridas para marcar tarefas (pessoas, contextos, etc.).</p>
      </div>
      <div class="settings-order-control">
        <span class="settings-order-label">Ordenar por:</span>
        <select class="tp-select settings-order-select" id="tagOrderSelect">
          <option value="creation" ${state.tagOrder==='creation'?'selected':''}>Criação</option>
          <option value="alphabetical" ${state.tagOrder==='alphabetical'?'selected':''}>Alfabética</option>
          <option value="custom" ${state.tagOrder==='custom'?'selected':''}>Personalizada</option>
        </select>
      </div>
    </div>
    <div id="tagRows"></div>
    <button class="btn ghost small" id="addTagBtn" style="margin-top:10px;">+ Adicionar tag</button>
  `;
  document.getElementById('tagOrderSelect').addEventListener('change', e => {
    state.tagOrder = e.target.value;
    markDirty();
    renderTagRows();
  });
  renderTagRows();
  document.getElementById('addTagBtn').onclick = () => {
    const color = DEFAULT_COLORS[state.tags.length % DEFAULT_COLORS.length];
    const newTag = { id: uid('tag'), name: 'Nova tag', color, categoryId: null };
    state.tags.push(newTag);
    markDirty();
    renderTagRows(newTag.id);
  };
}

function renderTagRows(focusId){
  const rows = document.getElementById('tagRows');
  if(!rows) return;
  rows.innerHTML = '';
  if(state.tags.length === 0){
    rows.innerHTML = `<p style="font-size:12.5px; color:var(--ink-faint);">Nenhuma tag criada ainda. Você também pode criar tags direto no painel de uma tarefa.</p>`;
  }
  const catOptions = `<option value="">Geral (todas)</option>` + state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const ordered = getOrderedTags();
  const isCustom = state.tagOrder === 'custom';
  ordered.forEach((tag, idx) => {
    const row = document.createElement('div');
    row.className = 'cat-row tag-row-settings';
    row.innerHTML = `
      <input type="color" value="${tag.color}">
      <input type="text" value="${escapeHtml(tag.name)}">
      <select class="tag-cat-select">${catOptions}</select>
      ${isCustom ? `
        <button type="button" class="reorder-btn" data-dir="up" ${idx===0?'disabled':''} title="Mover para cima"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg></button>
        <button type="button" class="reorder-btn" data-dir="down" ${idx===ordered.length-1?'disabled':''} title="Mover para baixo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      ` : ''}
      <button title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
    `;
    if(isCustom){
      row.querySelectorAll('.reorder-btn').forEach(btn => {
        btn.onclick = () => {
          const realIdx = state.tags.findIndex(t => t.id === tag.id);
          const dir = btn.dataset.dir === 'up' ? -1 : 1;
          const swapIdx = realIdx + dir;
          if(swapIdx < 0 || swapIdx >= state.tags.length) return;
          [state.tags[realIdx], state.tags[swapIdx]] = [state.tags[swapIdx], state.tags[realIdx]];
          markDirty();
          renderTagRows();
        };
      });
    }
    row.querySelector('.tag-cat-select').value = tag.categoryId || '';
    row.querySelector('input[type=color]').oninput = e => { tag.color = e.target.value; markDirty(); renderTagRows(); };
    const nameInput = row.querySelector('input[type=text]');
    nameInput.addEventListener('blur', e => { tag.name = e.target.value.trim() || tag.name; markDirty(); });
    nameInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); e.target.blur(); } });
    row.querySelector('.tag-cat-select').addEventListener('change', e => {
      tag.categoryId = e.target.value || null;
      state.tasks.forEach(t => {
        if((t.tagIds||[]).includes(tag.id) && tag.categoryId && t.categoryId !== tag.categoryId){
          t.tagIds = t.tagIds.filter(id => id !== tag.id);
        }
      });
      markDirty();
    });
    row.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      const usedIn = state.tasks.filter(t => (t.tagIds||[]).includes(tag.id)).length;
      const msg = usedIn > 0
        ? `Remover a tag "${tag.name}"? Ela será retirada de ${usedIn} tarefa(s).`
        : `Remover a tag "${tag.name}"?`;
      openConfirmPortal(e.currentTarget, msg, () => {
        state.tasks.forEach(t => { if(t.tagIds) t.tagIds = t.tagIds.filter(id => id !== tag.id); });
        state.tags = state.tags.filter(tg => tg.id !== tag.id);
        markDirty();
        renderTagRows();
      });
    };
    rows.appendChild(row);
    if(tag.id === focusId){ nameInput.focus(); nameInput.select(); }
  });
}

