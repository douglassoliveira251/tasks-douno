import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { closeAllTaskMenus, ensureTaskMenuPortal, openConfirmPortal } from './13-portais-de-tarefa.js';
import { closeTaskPanel, getOrCreateActiveTask, openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { clampToStage, defaultProjectTab, projectById } from './31-projetos.js';
import { createTaskFromTemplate, openTemplateEditor, templateFromTask, templatesForSpace } from './35-templates-de-tarefa.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';

/* Menu ⋮ do painel (templates, projeto/etapa, duplicar, mover, excluir) e chip do projeto. */
export function bindTpMenu(panel, task){
  function duplicateThisTask(){
    const copy = JSON.parse(JSON.stringify(task));
    copy.id = uid('task');
    G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
    copy.shortId = String(G.state.taskIdCounter).padStart(4, '0');
    copy.title = task.title + ' (cópia)';
    copy.done = false;
    copy.status = 'nao_iniciado';
    copy.createdAt = Date.now();
    (copy.subtasks||[]).forEach(s => s.id = uid('sub'));
    (copy.comments||[]).forEach(c => c.id = uid('cmt'));
    G.state.tasks.push(copy);
    markDirty();
    openTaskPanel(copy.id);
  }

  function deleteThisTask(anchor){
    openConfirmPortal(anchor, 'Excluir esta tarefa? Essa ação não pode ser desfeita.', () => {
      G.state.tasks = G.state.tasks.filter(x => x.id !== task.id);
      G.activeTaskId = null;
      markDirty();
    });
  }
  const tpDupBtn = document.getElementById('tpDupBtn');
  if(tpDupBtn) tpDupBtn.onclick = (e) => { e.stopPropagation(); duplicateThisTask(); };
  const tpDelBtn = document.getElementById('tpDelBtn');
  if(tpDelBtn) tpDelBtn.onclick = (e) => { e.stopPropagation(); deleteThisTask(tpDelBtn); };

  /* Menu "⋮" do painel: Template (usar, salvar, gerenciar) + ações da tarefa. */
  const ICO_PROJ = icon('kanban');
  const ICO_TPL = icon('layout');
  const tpMenuBtn = document.getElementById('tpMenuBtn');
  const tpMobileCloseBtn = document.getElementById('tpMobileClose');
  if(tpMobileCloseBtn) tpMobileCloseBtn.onclick = () => closeTaskPanel();
  const tpMobileBack = document.getElementById('tpMobileBack');
  if(tpMobileBack) tpMobileBack.onclick = () => closeTaskPanel();
  const tpMobileComment = document.getElementById('tpMobileComment');
  if(tpMobileComment) tpMobileComment.onclick = () => { const ta = document.getElementById('tpNewComment'); if(ta){ ta.scrollIntoView({ block: 'center' }); ta.focus(); } };
  const tpMobileDone = document.getElementById('tpMobileDone');
  if(tpMobileDone) tpMobileDone.onclick = () => { const c = document.getElementById('tpDoneCheck'); if(c) c.click(); };
  let menuAnchor = tpMenuBtn; // o menu abre no botão ⋮ ou, ao trocar projeto/etapa, no chip do projeto
  function placeMenu(portal, btn){
    const r = btn.getBoundingClientRect();
    portal.style.top = Math.round(r.bottom + 6) + 'px';
    portal.style.right = Math.round(window.innerWidth - r.right) + 'px';
    portal.style.left = 'auto';
  }
  function showMainMenu(){
    const portal = ensureTaskMenuPortal();
    const editing = !G.creatingNewTask;
    portal.innerHTML = `
      <div class="tpl-menu-head">Template</div>
      <button type="button" class="task-menu-item" data-m="use">${ICO_TPL}Usar template…</button>
      ${editing ? '<button type="button" class="task-menu-item" data-m="save">' + icon('floppy-disk') + 'Salvar como template</button>' : ''}
      <button type="button" class="task-menu-item" data-m="manage">${icon('gear')}Gerenciar templates…</button>
      <div class="tpl-menu-sep"></div>
      <div class="tpl-menu-head">Projeto</div>
      <button type="button" class="task-menu-item" data-m="proj">${ICO_PROJ}${task.projectId ? 'Mudar de projeto/etapa…' : 'Vincular a um projeto…'}</button>
      ${task.projectId ? '<button type="button" class="task-menu-item" data-m="unproj">Desvincular do projeto</button>' : ''}

      ${editing ? `
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item" data-m="dup">${icon('copy')}Duplicar</button>
      <button type="button" class="task-menu-item" data-m="move">${icon('folder-plus')}Mover de espaço</button>
      <div class="tpl-menu-sep"></div>
      <button type="button" class="task-menu-item danger" data-m="del">${icon('trash')}Excluir tarefa</button>` : ''}`;
    placeMenu(portal, tpMenuBtn);
    portal.classList.add('show');
    const on = (k, fn) => { const el = portal.querySelector('[data-m="' + k + '"]'); if(el) el.onclick = (ev) => { ev.stopPropagation(); fn(ev); }; };
    on('use', showTemplateList);
    on('proj', showProjectList);
    on('unproj', () => { closeAllTaskMenus(); const t = getOrCreateActiveTask(); if(t){ t.projectId = null; t.stageId = null; markDirty(); } });
    on('save', () => { closeAllTaskMenus(); openTemplateEditor(null, templateFromTask(task)); });
    on('manage', () => { closeAllTaskMenus(); G.settingsTab = 'templates'; G.settingsMobileList = false; G.currentView = 'settings'; render(); });
    on('dup', () => { closeAllTaskMenus(); duplicateThisTask(); });
    on('move', () => {
      closeAllTaskMenus();
      document.getElementById('tpGroupChip').click();
    });
    on('del', () => {
      closeAllTaskMenus();
      deleteThisTask(tpMenuBtn);
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
    const list = (G.state.projects || []).slice().sort((x, y) => (x.categoryId === task.categoryId ? 0 : 1) - (y.categoryId === task.categoryId ? 0 : 1));
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
    const spaceId = G.creatingNewTask ? G.activeCategoryFilter : (task.categoryId || G.activeCategoryFilter);
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
        const tpl = G.state.taskTemplates.find(x => x.id === b.dataset.tpl);
        if(!tpl) return;
        // numa tarefa nova, cria a tarefa do template; numa existente, abre uma nova a partir dele
        createTaskFromTemplate(tpl);
      };
    });
  }
  const tpProjChipEl = document.getElementById('tpProjChip');
  if(tpProjChipEl){
    tpProjChipEl.onclick = (e) => {
      e.stopPropagation();
      const portal = ensureTaskMenuPortal();
      if(portal.classList.contains('show') && portal.querySelector('[data-m="goproj"]')){ closeAllTaskMenus(); return; }
      closeAllTaskMenus();
      menuAnchor = tpProjChipEl;
      portal.innerHTML = `<button type="button" class="task-menu-item" data-m="goproj">${ICO_PROJ}Ir até o projeto</button>`;
      placeMenu(portal, tpProjChipEl);
      portal.classList.add('show');
      portal.querySelector('[data-m="goproj"]').onclick = (ev) => {
        ev.stopPropagation();
        const projectId = task.projectId;
        closeAllTaskMenus();
        closeTaskPanel(true);
        G.activeProjectId = projectId; G.projectTab = defaultProjectTab(); G.selectedStageId = null;
        G.currentView = 'projects';
        render();
      };
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
