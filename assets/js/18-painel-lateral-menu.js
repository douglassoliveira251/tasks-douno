/* Menu ⋮ do painel (templates, projeto/etapa, duplicar, mover, excluir) e chip do projeto. */
function bindTpMenu(panel, task){
  function duplicateThisTask(){
    const copy = JSON.parse(JSON.stringify(task));
    copy.id = uid('task');
    state.taskIdCounter = (state.taskIdCounter || 0) + 1;
    copy.shortId = String(state.taskIdCounter).padStart(4, '0');
    copy.title = task.title + ' (cópia)';
    copy.done = false;
    copy.status = 'nao_iniciado';
    copy.createdAt = Date.now();
    (copy.subtasks||[]).forEach(s => s.id = uid('sub'));
    (copy.comments||[]).forEach(c => c.id = uid('cmt'));
    state.tasks.push(copy);
    markDirty();
    openTaskPanel(copy.id);
  }

  /* Menu "⋮" do painel: Template (usar, salvar, gerenciar) + ações da tarefa. */
  const ICO_PROJ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M3 12h14M3 19h8"/><circle cx="17" cy="5" r="2"/><circle cx="15" cy="19" r="2"/></svg>';
  const ICO_TPL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
  const tpMenuBtn = document.getElementById('tpMenuBtn');
  const tpMobileCloseBtn = document.getElementById('tpMobileClose');
  if(tpMobileCloseBtn) tpMobileCloseBtn.onclick = () => closeTaskPanel();
  let menuAnchor = tpMenuBtn; // o menu abre no botão ⋮ ou, ao trocar projeto/etapa, no chip do projeto
  function placeMenu(portal, btn){
    const r = btn.getBoundingClientRect();
    portal.style.top = Math.round(r.bottom + 6) + 'px';
    portal.style.right = Math.round(window.innerWidth - r.right) + 'px';
    portal.style.left = 'auto';
  }
  function showMainMenu(){
    const portal = ensureTaskMenuPortal();
    const editing = !creatingNewTask;
    portal.innerHTML = `
      <div class="tpl-menu-head">Template</div>
      <button type="button" class="task-menu-item" data-m="use">${ICO_TPL}Usar template…</button>
      ${editing ? '<button type="button" class="task-menu-item" data-m="save"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>Salvar como template</button>' : ''}
      <button type="button" class="task-menu-item" data-m="manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>Gerenciar templates…</button>
      <div class="tpl-menu-sep"></div>
      <div class="tpl-menu-head">Projeto</div>
      <button type="button" class="task-menu-item" data-m="proj">${ICO_PROJ}${task.projectId ? 'Mudar de projeto/etapa…' : 'Vincular a um projeto…'}</button>
      ${task.projectId ? '<button type="button" class="task-menu-item" data-m="unproj">Desvincular do projeto</button>' : ''}

      ${editing ? `
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item" data-m="dup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>
      <button type="button" class="task-menu-item" data-m="move"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg>Mover de espaço</button>
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item danger" data-m="del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir tarefa</button>` : ''}`;
    placeMenu(portal, tpMenuBtn);
    portal.classList.add('show');
    const on = (k, fn) => { const el = portal.querySelector('[data-m="' + k + '"]'); if(el) el.onclick = (ev) => { ev.stopPropagation(); fn(ev); }; };
    on('use', showTemplateList);
    on('proj', showProjectList);
    on('unproj', () => { closeAllTaskMenus(); const t = getOrCreateActiveTask(); if(t){ t.projectId = null; t.stageId = null; markDirty(); } });
    on('save', () => { closeAllTaskMenus(); openTemplateEditor(null, templateFromTask(task)); });
    on('manage', () => { closeAllTaskMenus(); settingsTab = 'templates'; currentView = 'settings'; render(); });
    on('dup', () => { closeAllTaskMenus(); duplicateThisTask(); });
    on('move', () => {
      closeAllTaskMenus();
      document.getElementById('tpGroupChip').click();
    });
    on('del', () => {
      closeAllTaskMenus();
      openConfirmPortal(tpMenuBtn, 'Excluir esta tarefa?', () => {
        state.tasks = state.tasks.filter(x => x.id !== task.id);
        activeTaskId = null;
        markDirty();
      });
    });
  }
  function linkTaskTo(projectId, stageId){
    closeAllTaskMenus();
    const t = getOrCreateActiveTask(); if(!t) return;
    t.projectId = projectId; t.stageId = stageId || null;
    const pr = projectById(projectId);
    if(pr && pr.categoryId && catById(pr.categoryId)) t.categoryId = pr.categoryId;
    clampToStage(t);
    markDirty();
  }
  function showProjectList(){
    const portal = ensureTaskMenuPortal();
    const list = (state.projects || []).slice().sort((x, y) => (x.categoryId === task.categoryId ? 0 : 1) - (y.categoryId === task.categoryId ? 0 : 1));
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Voltar</button>
      <div class="tpl-menu-head">Escolha o projeto</div>
      ${list.length ? list.map(p => `<button type="button" class="task-menu-item" data-p="${p.id}">${escapeHtml(p.name || 'Projeto')}<span class="tpl-menu-meta">${(catById(p.categoryId) || {}).name || ''}</span></button>`).join('')
        : '<div class="tpl-menu-empty">Nenhum projeto ainda. Crie na página Projetos.</div>'}`;
    placeMenu(portal, menuAnchor);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); if(menuAnchor !== tpMenuBtn && task.projectId) showStageList(task.projectId); else { menuAnchor = tpMenuBtn; showMainMenu(); } };
    portal.querySelectorAll('[data-p]').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); showStageList(b.dataset.p); }; });
  }
  function showStageList(projectId){
    const portal = ensureTaskMenuPortal();
    const pr = projectById(projectId); if(!pr) return;
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Projetos</button>
      <div class="tpl-menu-head">${escapeHtml(pr.name)} · etapa</div>
      <button type="button" class="task-menu-item" data-s="">Só o projeto (sem etapa)</button>
      ${pr.stages.map(st => { const cur = task.projectId === pr.id && task.stageId === st.id; return `<button type="button" class="task-menu-item${cur ? ' current' : ''}" data-s="${st.id}">${escapeHtml(st.name || 'Etapa')}${cur ? '<span class="tpl-menu-meta">atual</span>' : ''}</button>`; }).join('')}`;
    placeMenu(portal, menuAnchor);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); showProjectList(); };
    portal.querySelectorAll('[data-s]').forEach(b => { b.onclick = (ev) => { ev.stopPropagation(); linkTaskTo(projectId, b.dataset.s); }; });
  }
  function showTemplateList(){
    const portal = ensureTaskMenuPortal();
    const spaceId = creatingNewTask ? activeCategoryFilter : (task.categoryId || activeCategoryFilter);
    const list = templatesForSpace(spaceId);
    const sp = catById(spaceId);
    portal.innerHTML = `
      <button type="button" class="task-menu-item" data-m="back">‹ Voltar</button>
      <div class="tpl-menu-head">Templates${sp ? ' · ' + escapeHtml(sp.name) : ''}</div>
      ${list.length ? list.map(tp => `<button type="button" class="task-menu-item" data-tpl="${tp.id}">${escapeHtml(tp.name || 'Sem nome')}<span class="tpl-menu-meta">${(tp.subtasks||[]).length ? (tp.subtasks.length + ' subtarefa' + (tp.subtasks.length > 1 ? 's' : '')) : ((tp.events||[]).length ? tp.events.length + ' agenda' + (tp.events.length > 1 ? 's' : '') : '')}</span></button>`).join('')
        : '<div class="tpl-menu-empty">Nenhum template neste espaço. Crie em Gerenciar templates.</div>'}`;
    placeMenu(portal, tpMenuBtn);
    portal.querySelector('[data-m="back"]').onclick = (ev) => { ev.stopPropagation(); showMainMenu(); };
    portal.querySelectorAll('[data-tpl]').forEach(b => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        closeAllTaskMenus();
        const tpl = state.taskTemplates.find(x => x.id === b.dataset.tpl);
        if(!tpl) return;
        // numa tarefa nova, cria a tarefa do template; numa existente, abre uma nova a partir dele
        createTaskFromTemplate(tpl);
      };
    });
  }
  const tpProjChipEl = document.getElementById('tpProjChip');
  if(tpProjChipEl){
    tpProjChipEl.onclick = (e) => {
      if(e.target.closest('#tpProjChipX')) return;
      e.stopPropagation();
      closeAllTaskMenus();
      menuAnchor = tpProjChipEl;
      showStageList(task.projectId);
      ensureTaskMenuPortal().classList.add('show');
    };
  }
  tpMenuBtn.onclick = (e) => {
    e.stopPropagation();
    menuAnchor = tpMenuBtn;
    const portal = ensureTaskMenuPortal();
    if(portal.classList.contains('show') && portal.querySelector('[data-m="use"]')){ closeAllTaskMenus(); return; }
    showMainMenu();
  };
}
