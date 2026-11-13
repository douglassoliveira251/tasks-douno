import { G } from './globais.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { catById, escapeHtml, fmtDate, todayStr, uid } from './10-helpers.js';
import { renderTaskPanel } from './17-painel-lateral-render.js';
import { closeAllTaskMenus, ensureTaskMenuPortal } from './13-portais-de-tarefa.js';
import { MONTH_LABELS, addDaysStr } from './25-calendario.js';
import { gripHtml, makeSortable, startAutoScroll } from './56-arrastar-ordem.js';
import { STAGE_STATE_LABELS, clampToStage, defaultProjectTab, openProjectEditor, openStageEditor, orderedStages, projectById, projectColor, projectIconSvg, projectStatus, projectsInScope, sortByStart, stagePercent, stageState, stageTasks, taskProgress } from './31-projetos.js';
import { ganttTaskRow, openProjectMenu } from './34-pdf-gerado-direto-pelo-app.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';
import { GANTT } from './estado-ui.js';

export function renderProjects(){
  const view = document.getElementById('projectsView');
  const project = G.activeProjectId ? projectById(G.activeProjectId) : null;
  if(G.activeProjectId && !project) G.activeProjectId = null;
  if(!project) return renderProjectList(view);
  return renderProjectDetail(view, project);
}

export function projectChipsHtml(status){
  return (status.late ? `<span class="proj-chip late">${status.lateCount} etapa${status.lateCount > 1 ? 's' : ''} atrasada${status.lateCount > 1 ? 's' : ''}</span>` : '')
    + (status.total && status.done === status.total ? '<span class="proj-chip ok">Concluído</span>' : '');
}


export let projectCollapsedStages = new Set();
G.projectListFilter = 'all';
export function projectListKind(st){
  if(st.total && st.done === st.total) return 'concluido';
  if(st.late) return 'atrasado';
  return 'andamento';
}
export const PROJ_SORTS = [['entrega', 'Entrega'], ['nome', 'Nome'], ['progresso', 'Progresso'], ['criacao', 'Criação']];
G.projectSort = G.projectSort || 'entrega';
/* a ordem escolhida fica salva (state.projectSort) e vale depois de atualizar a página */
const projSortKey = () => (PROJ_SORTS.some(x => x[0] === G.state.projectSort) ? G.state.projectSort : 'entrega');
G.projectListSel = G.projectListSel || null;
export function renderProjectList(view){
  const all = projectsInScope();
  const rows = all.map(p => ({ p, st: projectStatus(p) }));
  rows.forEach(r => { r.kind = projectListKind(r.st); });
  const counts = { all: rows.length, andamento: rows.filter(r => r.kind === 'andamento').length, atrasado: rows.filter(r => r.kind === 'atrasado').length, concluido: rows.filter(r => r.kind === 'concluido').length };
  const filtered = rows.filter(r => G.projectListFilter === 'all' || r.kind === G.projectListFilter);
  const cmp = {
    entrega: (a, b) => (a.st.end || '9999').localeCompare(b.st.end || '9999'),
    nome: (a, b) => (a.p.name || '').localeCompare(b.p.name || '', 'pt-BR'),
    progresso: (a, b) => b.st.pct - a.st.pct,
    criacao: (a, b) => (b.p.createdAt || 0) - (a.p.createdAt || 0),
  }[projSortKey()] || (() => 0);
  filtered.sort(cmp);
  renderProjectFilters(counts);
  const sel = filtered.find(r => r.p.id === G.projectListSel) || filtered[0] || null;
  G.projectListSel = sel ? sel.p.id : null;
  const today = todayStr();
  function statusChip(r){
    const { st, kind } = r;
    if(kind === 'concluido') return '<span class="proj-chip ok">Concluído</span>';
    if(kind === 'atrasado') return `<span class="proj-chip late">${st.lateCount} etapa${st.lateCount > 1 ? 's' : ''} atrasada${st.lateCount > 1 ? 's' : ''}</span>`;
    if(!st.total) return '<span class="proj-chip">Sem etapas</span>';
    return st.pct > 0 ? '<span class="proj-chip" style="background:var(--primary-light); color:var(--primary-dark);">Em andamento</span>' : '<span class="proj-chip">Não iniciado</span>';
  }
  const taskCount = p => { const ts = G.state.tasks.filter(t => t.projectId === p.id); return { done: ts.filter(t => t.done).length, total: ts.length, list: ts }; };
  const listHtml = filtered.length ? filtered.map(r => {
    const cat = catById(r.p.categoryId);
    const tc = taskCount(r.p);
    const nextTxt = r.kind === 'concluido' ? 'Todas as etapas concluídas' : (r.st.next ? 'Próxima: ' + r.st.next.name : (r.st.total ? '' : 'Sem etapas'));
    return `<div class="pl-row${sel && sel.p.id === r.p.id ? ' on' : ''}" data-id="${r.p.id}" style="--pc:${projectColor(r.p)}">
      <span class="prj-tile">${projectIconSvg(r.p.icon || 'briefcase')}</span>
      <div class="pl-nm"><div class="pl-top"><b>${escapeHtml(r.p.name || 'Projeto')}</b>${statusChip(r)}</div><small>${cat ? escapeHtml(cat.name) + ' · ' : ''}${escapeHtml(nextTxt)}</small></div>
      <div class="pl-prog"><div class="pl-ptop"><span>${tc.done}/${tc.total} tarefas</span><b>${r.st.pct}%</b></div><div class="proj-bar"><i style="width:${r.st.pct}%; background:var(--pc);"></i></div></div>
      <span class="pl-end"><small>Entrega</small><b>${r.st.end ? fmtDate(r.st.end) : '—'}</b></span>
    </div>`;
  }).join('') : (all.length ? '<div class="plist-empty">Nenhum projeto neste filtro.</div>' : '<div class="plist-empty">Nenhum projeto ainda. Crie um para organizar etapas, prazos e tarefas num só lugar.</div>');

  let panelHtml = '';
  if(sel){
    const { p, st } = sel;
    const cat = catById(p.categoryId);
    const tc = taskCount(p);
    const soonLim = addDaysStr(today, 3);
    const nLate = tc.list.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
    const nSoon = tc.list.filter(t => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= soonLim).length;
    const daysLeft = st.end ? Math.round((new Date(st.end + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000) : null;
    const stages = orderedStages(p);
    const open = tc.list.filter(t => !t.done).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 3);
    const kp = (v, l, color) => `<div class="pl-kp"><b${color ? ` style="color:${color}"` : ''}>${v}</b><small>${l}</small></div>`;
    panelHtml = `
      <div class="pl-ptitle" style="--pc:${projectColor(p)}"><span class="prj-tile">${projectIconSvg(p.icon || 'briefcase')}</span><div><b>${escapeHtml(p.name || 'Projeto')}</b><small>${cat ? escapeHtml(cat.name) + ' · ' : ''}${st.total} etapa${st.total === 1 ? '' : 's'}</small></div></div>
      <div class="proj-side-top" style="margin:14px 0 12px;">
        <div class="proj-ring" style="--p:${st.pct}; --pc:${projectColor(p)}"><b>${st.pct}%</b></div>
        <div><b>${st.done} de ${st.total} etapa${st.total === 1 ? '' : 's'}</b><div class="proj-side-sub">Entrega prevista ${st.end ? fmtDate(st.end) : '—'}</div></div>
      </div>
      <div class="pl-kps">${kp(tc.done + '<span>/' + tc.total + '</span>', 'tarefas')}${kp(nLate, nLate === 1 ? 'atrasada' : 'atrasadas', nLate ? 'var(--danger)' : '')}${kp(nSoon, 'em 3 dias', nSoon ? '#C77700' : '')}${kp(daysLeft == null ? '—' : daysLeft, 'dias p/ entrega', daysLeft != null && daysLeft < 0 ? 'var(--danger)' : '')}</div>
      <div class="proj-side-label" style="margin-top:14px;">Etapas</div>
      ${stages.length ? stages.slice(0, 6).map(sg => { const s = stageState(p, sg); return `<div class="pl-stage"><i class="${s}"></i><b>${escapeHtml(sg.name)}</b><span>${stagePercent(p, sg)}%</span></div>`; }).join('') : '<div class="proj-side-sub" style="padding:6px 0;">Nenhuma etapa ainda.</div>'}
      <div class="proj-side-label" style="margin-top:14px;">Próximas tarefas</div>
      ${open.length ? open.map(t => { const sg = (p.stages || []).find(x => x.id === t.stageId); return `<div class="proj-side-task" data-task-id="${t.id}" data-pid="${p.id}"><i class="${t.dueDate && t.dueDate < today ? 'late' : ''}"></i><div><b>${escapeHtml(t.title || 'Sem título')}</b><small>${sg ? escapeHtml(sg.name) + ' · ' : ''}${t.dueDate ? fmtDate(t.dueDate) : 'sem prazo'}</small></div></div>`; }).join('') : '<div class="proj-side-sub" style="padding:6px 0;">Nenhuma tarefa pendente.</div>'}
      <div class="pl-actions"><button type="button" class="btn small" id="plOpen">Abrir projeto</button><button type="button" class="btn small secondary" id="plEdit">Editar</button></div>`;
  }
  view.innerHTML = `<div class="pl-layout"><div class="pl-list">${listHtml}</div>${sel ? `<aside class="pl-panel">${panelHtml}</aside>` : ''}</div>`;
  const openProject = id => { G.activeProjectId = id; G.projectTab = defaultProjectTab(); G.selectedStageId = null; render(); };
  view.querySelectorAll('.pl-row').forEach(r => {
    r.onclick = () => {
      if(window.matchMedia('(max-width:1099px)').matches) return openProject(r.dataset.id);
      G.projectListSel = r.dataset.id; render();
    };
    r.ondblclick = () => openProject(r.dataset.id);
  });
  const plOpen = view.querySelector('#plOpen');
  if(plOpen) plOpen.onclick = () => openProject(sel.p.id);
  const plEdit = view.querySelector('#plEdit');
  if(plEdit) plEdit.onclick = () => openProjectEditor(sel.p);
  view.querySelectorAll('.pl-panel .proj-side-task').forEach(el => {
    el.onclick = () => { G.activeProjectId = el.dataset.pid; G.projectTab = defaultProjectTab(); G.selectedStageId = null; G.activeTaskId = el.dataset.taskId; G.creatingNewTask = false; render(); };
  });
}

/* Filtros no topo (mesmo padrão de Tarefas e Notas): Status e Ordenar */
function renderProjectFilters(counts){
  const host = document.getElementById('topbarFilters');
  if(!host) return;
  host.querySelectorAll('.proj-filters').forEach(el => el.remove());
  const STATUS = [['all', 'Todos'], ['andamento', 'Em andamento'], ['atrasado', 'Atrasados'], ['concluido', 'Concluídos']];
  const curStatus = (STATUS.find(x => x[0] === G.projectListFilter) || STATUS[0])[1];
  const curSort = (PROJ_SORTS.find(x => x[0] === projSortKey()) || PROJ_SORTS[0])[1];
  const wrap = document.createElement('div');
  wrap.className = 'proj-filters';
  wrap.innerHTML = `
    <div class="tag-filter-control"><button type="button" class="tag-filter-btn${G.projectListFilter !== 'all' ? ' on' : ''}" data-pop="status">${icon('funnel')}<span><i class="nf-k">Status:</i> <b>${curStatus}</b></span>${icon('caret-down')}</button>
      <div class="tag-filter-popover" data-popover="status" style="display:none;">${STATUS.map(([k, l]) => `<label class="tag-filter-row"><input type="radio" name="projStatus" value="${k}" ${G.projectListFilter === k ? 'checked' : ''}>${l}<span class="pf-n">${counts[k]}</span></label>`).join('')}</div></div>
    <div class="tag-filter-control"><button type="button" class="tag-filter-btn" data-pop="sort">${icon('rows')}<span><i class="nf-k">Ordenar:</i> <b>${curSort}</b></span>${icon('caret-down')}</button>
      <div class="tag-filter-popover" data-popover="sort" style="display:none;">${PROJ_SORTS.map(([k, l]) => `<button type="button" class="tag-filter-row sort-opt${projSortKey() === k ? ' on' : ''}" data-sort="${k}" role="menuitemradio" aria-checked="${projSortKey() === k}">${l}${projSortKey() === k ? icon('check') : ''}</button>`).join('')}</div></div>`;
  host.prepend(wrap);
  wrap.querySelectorAll('[data-pop]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const pop = wrap.querySelector(`[data-popover="${b.dataset.pop}"]`);
      const open = pop.style.display === 'block';
      wrap.querySelectorAll('[data-popover]').forEach(p => { p.style.display = 'none'; });
      pop.style.display = open ? 'none' : 'block';
    };
  });
  wrap.querySelectorAll('[data-popover]').forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  wrap.querySelectorAll('input[name="projStatus"]').forEach(r => r.addEventListener('change', () => { G.projectListFilter = r.value; render(); }));
  wrap.querySelectorAll('[data-sort]').forEach(b => { b.onclick = () => { G.state.projectSort = b.dataset.sort; G.projectSort = b.dataset.sort; markDirty(); }; });
}
document.addEventListener('click', () => { document.querySelectorAll('.proj-filters [data-popover]').forEach(p => { p.style.display = 'none'; }); });

/* Ordem manual das etapas: guarda os ids na ordem escolhida (todas as etapas do projeto). "voltar à ordem por data" apaga. */
function saveStageOrder(p, ids){ p.stageOrder = ids; markDirty(); }
const stageOrderChip = p => (Array.isArray(p.stageOrder) && p.stageOrder.length) ? '<span class="stage-manual">Ordem manual · <button type="button" id="stageOrderReset">voltar à ordem por data</button></span>' : '';
function bindStageOrderReset(root, p){
  const b = root.querySelector('#stageOrderReset');
  if(b) b.onclick = (e) => { e.stopPropagation(); delete p.stageOrder; markDirty(); };
}
/* Arrastar etapa na linha do tempo: a alça leva a etapa com as tarefas dela; uma linha azul mostra onde vai cair. */
function bindStageDrag(body, p){
  const wrap = body.querySelector('.gantt-body');
  if(!wrap) return;
  const heads = () => Array.from(wrap.querySelectorAll(':scope > .gantt-row[data-id]'));
  const blockOf = head => { const els = [head]; let n = head.nextElementSibling; while(n && !n.matches('.gantt-row[data-id], .gantt-loose, .gantt-today')){ els.push(n); n = n.nextElementSibling; } return els; };
  const apply = (ids, from, to) => { // to = posição de entrada (antes da etapa 'to' da lista original)
    const id = ids.splice(from, 1)[0];
    ids.splice(to > from ? to - 1 : to, 0, id);
    saveStageOrder(p, ids);
  };
  wrap.querySelectorAll('.gantt-row[data-id] .drag-grip').forEach(grip => {
    grip.addEventListener('click', e => e.stopPropagation());
    grip.addEventListener('pointerdown', e => {
      if(e.button !== undefined && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const head = grip.closest('.gantt-row');
      const hs = heads(), from = hs.indexOf(head);
      const blocks = hs.map(blockOf);
      blocks[from].forEach(el => el.classList.add('stage-dragging'));
      wrap.classList.add('sorting');
      const line = document.createElement('div'); line.className = 'stage-dropline'; line.style.display = 'none'; wrap.appendChild(line);
      const auto = startAutoScroll(wrap);
      let to = from;
      const move = ev => {
        auto.update(ev.clientY);
        let slot = hs.length;
        for(let i = 0; i < hs.length; i++){ const r = hs[i].getBoundingClientRect(); if(ev.clientY < r.top + r.height / 2){ slot = i; break; } }
        to = slot;
        const last = blocks[hs.length - 1];
        const y = slot < hs.length ? hs[slot].getBoundingClientRect().top : last[last.length - 1].getBoundingClientRect().bottom;
        line.style.top = (y - wrap.getBoundingClientRect().top) + 'px';
        line.style.display = (slot === from || slot === from + 1) ? 'none' : 'block';
      };
      const end = (ev) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', end);
        document.removeEventListener('pointercancel', end);
        auto.stop(); line.remove(); wrap.classList.remove('sorting');
        blocks[from].forEach(el => el.classList.remove('stage-dragging'));
        if(ev && ev.type === 'pointercancel') return;
        if(to !== from && to !== from + 1) apply(hs.map(h => h.dataset.id), from, to);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', end);
    });
    grip.addEventListener('keydown', e => {
      if(e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const hs = heads(), i = hs.indexOf(grip.closest('.gantt-row')), j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if(i < 0 || j < 0 || j >= hs.length) return;
      const ids = hs.map(h => h.dataset.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      saveStageOrder(p, ids);
      const sid = grip.closest('.gantt-row').dataset.id;
      setTimeout(() => { const g = document.querySelector('.gantt-row[data-id="' + sid + '"] .drag-grip'); if(g) g.focus(); }, 0);
    });
  });
}

export function renderProjectDetail(view, p){
  const st = projectStatus(p);
  const today = todayStr();
  const stages = orderedStages(p); // por data (sem datas por último), ou a ordem manual do projeto
  const nextLabel = st.next ? `${escapeHtml(st.next.name)} · ${fmtDate(st.next.end)}` : '—';
  let slip = '';
  if(p.endDate && st.end && st.end > p.endDate){
    const d = Math.round((new Date(st.end + 'T00:00:00') - new Date(p.endDate + 'T00:00:00')) / 86400000);
    slip = `+${d} dia${d > 1 ? 's' : ''}`;
  }
  const selStage = stages.find(x => x.id === G.selectedStageId) || null;
  if(!selStage) G.selectedStageId = null;
  let stageSideHtml = '';
  if(selStage){
    const spct = stagePercent(p, selStage), sstate = stageState(p, selStage), stks = sortByStart(stageTasks(p, selStage));
    stageSideHtml = `
      <button type="button" class="proj-side-back" id="stgSideBack">‹ Visão geral do projeto</button>
      <div class="proj-side-label" style="margin-top:8px;">Etapa</div>
      <div class="proj-side-top">
        <div class="proj-ring" style="--p:${spct}"><b>${spct}%</b></div>
        <div><b>${escapeHtml(selStage.name)}</b>
          <div class="proj-side-sub">${STAGE_STATE_LABELS[sstate]} · ${selStage.start ? fmtDate(selStage.start) : '—'} a ${selStage.end ? fmtDate(selStage.end) : '—'}</div></div>
      </div>
      <div class="proj-side-label" style="margin-top:10px;">Tarefas da etapa <span style="text-transform:none; letter-spacing:0; font-weight:500;">(${stks.filter(t => t.done).length}/${stks.length})</span></div>
      <div class="proj-side-tasks">
      ${stks.length ? stks.map(t => {
        const subs = t.subtasks || [];
        const pr_ = Math.round(taskProgress(t) * 100);
        return `<div class="proj-side-task" data-task-id="${t.id}"><i class="${t.done ? 'done' : (t.dueDate && t.dueDate < today ? 'late' : '')}"></i><div><b style="${t.done ? 'text-decoration:line-through; opacity:.6;' : ''}">${escapeHtml(t.title || 'Sem título')}</b><small>${t.dueDate ? 'prazo ' + fmtDate(t.dueDate) : 'sem prazo'}${subs.length ? ' · ' + subs.filter(x => x.done).length + '/' + subs.length + ' subtarefas' : ''}${!t.done && pr_ ? ' · ' + pr_ + '%' : ''}</small></div></div>`;
      }).join('') : '<div class="proj-side-sub" style="padding:8px 0;">Nenhuma tarefa nesta etapa ainda.</div>'}
      </div>
      <div class="proj-side-actions">
        <button type="button" class="proj-side-btn pri" id="stgSideNewTask">${icon('plus')}<span>Nova tarefa</span></button>
        <button type="button" class="proj-side-btn" id="stgSideEdit">${icon('pencil-simple')}<span>Editar</span></button>
      </div>
`
  }
  const phTasks = G.state.tasks.filter(t => t.projectId === p.id);
  const soonLim = addDaysStr(today, 3);
  const nLateT = phTasks.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
  const nSoonT = phTasks.filter(t => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= soonLim).length;
  const chips = projectChipsHtml(st) || `<span class="proj-chip">${st.pct > 0 ? 'Em andamento' : 'Não iniciado'}</span>`;
  const endTxt = p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—');
  const stat = (v, of, l, color) => `<div><b${color ? ` style="color:${color}"` : ''}>${v}${of != null ? `<span>/${of}</span>` : ''}</b><small>${l}</small></div>`;
  const isMobileP = window.matchMedia('(max-width:768px)').matches;
  const tabNow = !isMobileP ? 'timeline' : (G.projectTab === 'etapas' ? 'etapas' : 'timeline');
  const kp = (v, of, l, color) => `<div class="pd-kp"><small>${l}</small><b${color ? ` style="color:${color}"` : ''}>${v}${of != null ? `<span>/${of}</span>` : ''}</b></div>`;
  const daysLeft = (p.endDate || st.end) ? Math.round((new Date((p.endDate || st.end) + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000) : null;
  view.innerHTML = `
    <div class="prj-head pd-head" style="--pc:${projectColor(p)}">
      <div class="ph">
        <button type="button" class="prj-circle-btn pd-back" id="prjBack" title="Voltar para a lista de projetos" aria-label="Voltar para a lista de projetos">${icon('caret-left')}<span>Voltar</span></button>
        <span class="pd-tile">${projectIconSvg(p.icon || 'briefcase')}</span>
        <div class="ph-name">
          <div class="pd-ttl"><b class="prj-title">${escapeHtml(p.name)}</b>${chips}</div>
          <div class="ph-st">
            ${stat(st.done, st.total, 'etapas')}
            ${stat(phTasks.filter(t => t.done).length, phTasks.length, 'tarefas')}
            ${stat(nLateT, null, nLateT === 1 ? 'atrasada' : 'atrasadas', nLateT ? 'var(--danger)' : '')}
            ${stat(nSoonT, null, 'em 3 dias', nSoonT ? '#C77700' : '')}
            <div><small>entrega</small><b class="ph-end">${endTxt}</b>${slip ? ` <i style="color:var(--danger); font-style:normal; font-weight:700; font-size:11.5px;">${slip}</i>` : ''}</div>
          </div>
        </div>
        <div class="pd-msub">${chips}<span>${st.pct}% · ${phTasks.filter(t => t.done).length}/${phTasks.length} tarefas${nLateT ? ` · <b style="color:var(--danger)">${nLateT}</b> ${nLateT === 1 ? 'atrasada' : 'atrasadas'}` : ''}</span></div>
        <div class="pd-mbar"><i style="width:${st.pct}%"></i></div>
        <span class="prj-actions">
          <span class="pd-tabs">
            <button type="button" class="proj-tab pd-tab-etapas ${tabNow === 'etapas' ? 'on' : ''}" data-tab="etapas">Etapas</button>
            <button type="button" class="proj-tab ${tabNow === 'timeline' ? 'on' : ''}" data-tab="timeline">Linha do tempo</button>
          </span>
          <button type="button" class="prj-act" id="prjEditTop">${icon('pencil-simple')}Editar</button>
          <button type="button" class="prj-act" id="prjAddStage">${icon('stack')}Nova etapa</button>
          <button type="button" class="prj-act pri" id="prjAddTask">${icon('plus')}Nova tarefa</button>
          <button type="button" class="prj-circle-btn" id="prjMore" title="Mais ações" aria-label="Mais ações" aria-haspopup="menu">${icon('dots-three-vertical')}</button>
        </span>
      </div>
    </div>
    <div class="proj-split">
    <div class="proj-col">
    <div id="prjBody" style="min-width:0;"></div>
    </div>
      <aside class="proj-side ${selStage ? '' : 'is-resumo'}">
        ${selStage ? stageSideHtml : `
        <div class="proj-side-label">Resumo</div>
        <div class="proj-side-desc">
          <div class="proj-side-label" style="margin-top:0;">Descrição</div>
          <div class="proj-desc-row" id="prjDescRow"></div>
        </div>
        <div class="proj-side-top">
          <div class="proj-ring" style="--p:${st.pct}"><b>${st.pct}%</b></div>
          <div><b>${st.done} de ${st.total} etapa${st.total === 1 ? '' : 's'}</b>
            <div class="proj-side-sub">Entrega prevista ${p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—')}${slip ? ` <span style="color:var(--danger); font-weight:700;">${slip}</span>` : ''}</div></div>
        </div>
        <div class="proj-side-sub" style="margin:2px 0 0;">Próxima entrega: <b style="color:var(--ink);">${nextLabel}</b></div>
        <div class="pd-kps">
          ${kp(phTasks.filter(t => t.done).length, phTasks.length, 'Tarefas feitas')}
          ${kp(nLateT, null, 'Atrasadas', nLateT ? 'var(--danger)' : '')}
          ${kp(nSoonT, null, 'Vencem em 3 dias', nSoonT ? '#C77700' : '')}
          ${kp(daysLeft == null ? '—' : daysLeft, null, 'Dias para entrega', daysLeft != null && daysLeft < 0 ? 'var(--danger)' : '')}
        </div>
        <div class="proj-side-more">
        <div class="proj-side-label" style="margin-top:14px;">Próximas tarefas</div>
        ${(() => {
          const open = G.state.tasks.filter(t => t.projectId === p.id && !t.done).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 5);
          if(!open.length) return '<div class="proj-side-sub" style="padding:8px 0;">Nenhuma tarefa pendente.</div>';
          return open.map(t => {
            const sg = (p.stages || []).find(x => x.id === t.stageId);
            return `<div class="proj-side-task" data-task-id="${t.id}"><i class="${t.dueDate && t.dueDate < today ? 'late' : ''}"></i><div><b>${escapeHtml(t.title || 'Sem título')}</b><small>${sg ? escapeHtml(sg.name) + ' · ' : ''}${t.dueDate ? 'prazo ' + fmtDate(t.dueDate) : 'sem prazo'}</small></div></div>`;
          }).join('');
        })()}
        </div>`}
      </aside>
    </div>`;
  if(G.activeTaskId || G.creatingNewTask){
    const tpanel = document.createElement('div');
    tpanel.className = 'task-panel';
    view.appendChild(tpanel);
    renderTaskPanel(tpanel);
  }
  /* Descrição: texto corrido (sem caixa), até 2 linhas com "Ver mais"; clicar nela edita no lugar. */
  const descRow = view.querySelector('#prjDescRow') || document.createElement('div');
  function renderProjectDesc(editing){
    if(editing){
      descRow.innerHTML = '<textarea id="prjDescInline" class="proj-desc-input" rows="2" maxlength="600" placeholder="Breve descrição do projeto"></textarea>';
      const el = descRow.querySelector('#prjDescInline');
      el.value = p.description || '';
      const fit = () => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; };
      fit(); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
      el.addEventListener('input', fit);
      el.addEventListener('blur', () => {
        const v = el.value.trim();
        if(v !== (p.description || '')){ p.description = v; persistOnly(); }
        renderProjectDesc(false);
      });
      el.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); el.blur(); }
        else if(e.key === 'Escape'){ e.stopPropagation(); el.value = p.description || ''; el.blur(); }
      });
      return;
    }
    if(!(p.description || '').trim()){
      descRow.innerHTML = '<button type="button" class="proj-desc-add" id="prjDescAdd">+ Adicionar uma breve descrição</button>';
      descRow.querySelector('#prjDescAdd').onclick = () => renderProjectDesc(true);
      return;
    }
    descRow.innerHTML = '<div class="proj-desc-text" id="prjDescText" title="Clique para editar" tabindex="0"></div><button type="button" class="proj-desc-more" id="prjDescMore" hidden>Ver mais</button>';
    const text = descRow.querySelector('#prjDescText'), more = descRow.querySelector('#prjDescMore');
    text.textContent = p.description;
    requestAnimationFrame(() => { if(text.scrollHeight > text.clientHeight + 2) more.hidden = false; });
    text.onclick = () => renderProjectDesc(true);
    text.onkeydown = (e) => { if(e.key === 'Enter'){ e.preventDefault(); renderProjectDesc(true); } };
    more.onclick = (e) => { e.stopPropagation(); const open = text.classList.toggle('open'); more.textContent = open ? 'Ver menos' : 'Ver mais'; };
  }
  renderProjectDesc(false);
  const sideBack = view.querySelector('#stgSideBack');
  if(sideBack) sideBack.onclick = () => { G.selectedStageId = null; render(); };
  const sideEdit = view.querySelector('#stgSideEdit');
  if(sideEdit) sideEdit.onclick = () => openStageEditor(p, selStage);
  const sideNew = view.querySelector('#stgSideNewTask');
  if(sideNew) sideNew.onclick = () => {
    G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'), title: '', categoryId: p.categoryId,
      done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
      description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
      projectId: p.id, stageId: selStage.id,
    };
    G.state.tasks.push(t);
    G.activeTaskId = t.id; G.creatingNewTask = false;
    markDirty();
  };
  const prjEditTop = view.querySelector('#prjEditTop');
  if(prjEditTop) prjEditTop.onclick = () => openProjectEditor(p);
  view.querySelectorAll('.proj-side-task').forEach(el => {
    el.onclick = () => { G.activeTaskId = el.dataset.taskId; G.creatingNewTask = false; render(); };
  });
  view.querySelector('#prjBack').onclick = () => { G.activeProjectId = null; G.selectedStageId = null; render(); };
  view.querySelector('#prjMore').onclick = (e) => { e.stopPropagation(); openProjectMenu(e.currentTarget, p); };
  view.querySelector('#prjAddStage').onclick = () => openStageEditor(p, null);
  /* a tarefa de projeto nasce já numa etapa: com uma etapa aberta usa ela; senão pergunta (uma só etapa: usa direto) */
  function addTaskToStage(stageId){
    G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'), title: '', categoryId: p.categoryId,
      done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
      description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
      projectId: p.id, stageId: stageId || null,
    };
    G.state.tasks.push(t);
    G.activeTaskId = t.id; G.creatingNewTask = false;
    markDirty();
  }
  view.querySelector('#prjAddTask').onclick = (e) => {
    e.stopPropagation();
    if(selStage){ addTaskToStage(selStage.id); return; }
    if(stages.length <= 1){ addTaskToStage(stages[0] ? stages[0].id : null); return; }
    const portal = ensureTaskMenuPortal();
    if(portal.classList.contains('show') && portal.querySelector('[data-pick-stage]')){ closeAllTaskMenus(); return; }
    closeAllTaskMenus();
    portal.innerHTML = '<div class="tpl-menu-head">Em qual etapa?</div>' + stages.map(sg => '<button type="button" class="task-menu-item" data-pick-stage="' + sg.id + '">' + escapeHtml(sg.name || 'Etapa') + '</button>').join('');
    const r = e.currentTarget.getBoundingClientRect();
    portal.style.top = Math.round(r.bottom + 6) + 'px';
    portal.style.right = Math.round(window.innerWidth - r.right) + 'px';
    portal.style.left = 'auto';
    portal.classList.add('show');
    portal.querySelectorAll('[data-pick-stage]').forEach(bt => { bt.onclick = (ev) => { ev.stopPropagation(); closeAllTaskMenus(); addTaskToStage(bt.dataset.pickStage); }; });
  };
  view.querySelectorAll('.proj-tab').forEach(b => { b.onclick = () => { G.projectTab = b.dataset.tab; render(); }; });
  const body = view.querySelector('#prjBody');

  if(!stages.length){
    body.innerHTML = '<div class="empty-state"><p>Este projeto ainda não tem etapas. Use "+ Etapa" para começar.</p></div>';
    return;
  }

  if(tabNow === 'etapas'){
    const groups = stages.map(sg => ({ sg, tks: sortByStart(stageTasks(p, sg)) }));
    const loose = sortByStart(phTasks.filter(t => !t.stageId || !stages.some(x => x.id === t.stageId)));
    const taskRow = t => {
      const late = !t.done && t.dueDate && t.dueDate < today;
      const isToday = !t.done && t.dueDate === today;
      return `<div class="pe-task" data-task-id="${t.id}"><i class="pe-cb ${t.done ? 'done' : ''}"></i><span class="pe-tt ${t.done ? 'done' : ''}">${escapeHtml(t.title || 'Sem título')}</span><small class="${late ? 'late' : isToday ? 'today' : ''}">${t.dueDate ? (isToday ? 'Hoje' : fmtDate(t.dueDate)) : ''}</small></div>`;
    };
    body.innerHTML = stageOrderChip(p) + '<div class="pe-list">' + groups.map(({ sg, tks }) => {
      const pct = stagePercent(p, sg), state_ = stageState(p, sg);
      return `<div class="pe-card" data-id="${sg.id}"><div class="pe-head"><div class="pe-hl">${stages.length > 1 ? gripHtml('Arrastar para reordenar a etapa') : ''}<b>${escapeHtml(sg.name)}</b><span class="proj-chip ${state_ === 'atrasada' ? 'late' : state_ === 'concluida' ? 'ok' : ''}">${STAGE_STATE_LABELS[state_]}</span><span class="pe-pct">${pct}%</span></div><div class="proj-bar"><i style="width:${pct}%"></i></div></div>${tks.map(taskRow).join('')}</div>`;
    }).join('') + (loose.length ? `<div class="pe-card"><div class="pe-head"><div class="pe-hl"><b>Sem etapa</b></div></div>${loose.map(taskRow).join('')}</div>` : '') + '</div>';
    body.querySelectorAll('.pe-task').forEach(el => { el.onclick = () => { G.activeTaskId = el.dataset.taskId; G.creatingNewTask = false; render(); }; });
    body.querySelectorAll('.pe-head').forEach(h => { h.onclick = () => h.parentElement.classList.toggle('closed'); });
    body.querySelectorAll('.pe-head .drag-grip').forEach(g => g.addEventListener('click', e => e.stopPropagation()));
    if(stages.length > 1) makeSortable(body.querySelector('.pe-list'), { rowSel: '.pe-card', onReorder: ids => saveStageOrder(p, ids) });
    bindStageOrderReset(body, p);
    return;
  }

  // linha do tempo
  const ZOOMS = { fit: { dpx: 0, label: 'Ajustar' }, month: { dpx: 5, label: 'Mês' }, week: { dpx: 14, label: 'Semana' }, day: { dpx: 34, label: 'Dia' } };
  if(!ZOOMS[G.ganttZoom]) G.ganttZoom = 'fit';
  const fit = G.ganttZoom === 'fit';
  GANTT.ganttFit = fit;
  const DAYMS = 86400000;
  const dates = [];
  stages.forEach(sg => { if(sg.start) dates.push(sg.start); if(sg.end) dates.push(sg.end); });
  if(p.startDate) dates.push(p.startDate);
  if(p.endDate) dates.push(p.endDate);
  G.state.tasks.forEach(t => { if(t.projectId === p.id){ if(t.startDate) dates.push(t.startDate); if(t.dueDate) dates.push(t.dueDate); } });
  dates.push(today);
  dates.sort();
  const first = new Date(dates[0] + 'T00:00:00');
  const last = new Date(dates[dates.length - 1] + 'T00:00:00');
  let rangeStart = new Date(first.getFullYear(), first.getMonth(), 1);
  rangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7)); // começa numa segunda
  const rangeEnd = new Date(last.getFullYear(), last.getMonth() + 1, 1);
  const total = Math.round((rangeEnd - rangeStart) / DAYMS);
  /* Ajustar: encolhe o período inteiro para a largura disponível (sem rolagem lateral) */
  const glFit = window.matchMedia('(max-width:768px)').matches ? 104 : 210;
  const dpx = fit ? Math.max(((body.clientWidth || 900) - 2 - glFit) / total, 1.4) : ZOOMS[G.ganttZoom].dpx;
  const fine = G.ganttZoom === 'day' || G.ganttZoom === 'week';
  const W = fit ? total * dpx : Math.round(total * dpx);
  const dayIdx = dateStr => Math.round((new Date(dateStr + 'T00:00:00') - rangeStart) / DAYMS);
  const pos = dateStr => Math.max(0, Math.min(W, dayIdx(dateStr) * dpx));
  const dayAt = i => new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
  // cabeçalho: linha dos meses e, nos zooms Dia/Semana, uma linha de dias/semanas
  const months = [];
  for(let cur = new Date(rangeStart); cur < rangeEnd; ){
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const segEnd = monthEnd < rangeEnd ? monthEnd : rangeEnd;
    const days = Math.round((segEnd - cur) / DAYMS);
    months.push({ label: days * dpx < 44 ? '' : MONTH_LABELS[cur.getMonth()].slice(0, 3) + (cur.getMonth() === 0 || months.length === 0 ? ' ' + String(cur.getFullYear()).slice(2) : ''), w: days * dpx, at: Math.round((cur - rangeStart) / DAYMS) * dpx });
    cur = segEnd;
  }
  const todayIdx = dayIdx(today);
  const subRow = [];
  if(G.ganttZoom === 'day'){
    for(let i = 0; i < total; i++){ const dt = dayAt(i); subRow.push(`<span class="${i === todayIdx ? 'now' : ''}" style="width:${dpx}px">${dt.getDate()}</span>`); }
  } else if(G.ganttZoom === 'week'){
    for(let i = 0; i < total; i += 7){ const dt = dayAt(i); subRow.push(`<span class="${todayIdx >= i && todayIdx < i + 7 ? 'now' : ''}" style="width:${7 * dpx}px">${String(dt.getDate()).padStart(2, '0')}</span>`); }
  }
  // colunas: fins de semana, início das semanas e a coluna de hoje
  let cols = '';
  if(fine){
    for(let i = 0; i < total; i++){
      const dow = dayAt(i).getDay();
      if(dow === 0 || dow === 6) cols += `<i class="wknd" style="left:${i * dpx}px; width:${dpx}px"></i>`;
      else if(dow === 1 && i > 0) cols += `<i class="wk" style="left:${i * dpx}px"></i>`;
    }
    cols += `<i class="todayband" style="left:${todayIdx * dpx}px; width:${dpx}px"></i>`;
  } else {
    months.forEach(m => { if(m.at > 0) cols += `<i class="wk" style="left:${m.at}px"></i>`; });
  }
  const todayX = Math.max(0, todayIdx * dpx) + (fine ? dpx / 2 : 0);
  // filtro rápido (atrasadas / vencem em até 3 dias)
  const soonLimit = addDaysStr(today, 3);
  const isLate = t => !t.done && t.dueDate && t.dueDate < today;
  const isSoon = t => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= soonLimit;
  const pass = t => G.ganttFilter === 'all' || (G.ganttFilter === 'late' ? isLate(t) : isSoon(t));
  const projTasks = G.state.tasks.filter(t => t.projectId === p.id);
  const nLate = projTasks.filter(isLate).length, nSoon = projTasks.filter(isSoon).length;
  const chev = d => icon(d.startsWith('M15') ? 'caret-left' : 'caret-right');
  body.innerHTML = `
    <div class="gantt-card">
    <div class="gantt-tools">
      <span class="gantt-seg">${Object.keys(ZOOMS).map(k => `<button type="button" data-zoom="${k}" class="${G.ganttZoom === k ? 'on' : ''}">${ZOOMS[k].label}</button>`).join('')}</span>
      ${fit ? '' : `<span class="gantt-nav"><button type="button" id="ganttPrev" aria-label="Voltar no tempo">${chev('M15 6l-6 6 6 6')}</button><button type="button" id="ganttToday" class="txt">Hoje</button><button type="button" id="ganttNext" aria-label="Avançar no tempo">${chev('M9 6l6 6-6 6')}</button></span>`}
      ${stageOrderChip(p)}
      <span class="gantt-filters">
        <button type="button" data-gfilter="all" class="${G.ganttFilter === 'all' ? 'on' : ''}">Todas</button>
        <button type="button" data-gfilter="late" class="${G.ganttFilter === 'late' ? 'on' : ''}">Atrasadas <b class="late">${nLate}</b></button>
        <button type="button" data-gfilter="soon" class="${G.ganttFilter === 'soon' ? 'on' : ''}">Vencem em breve <b class="soon">${nSoon}</b></button>
      </span>
    </div>
    <div class="gantt-wrap${fit ? ' fit' : ''}" style="--pc:${projectColor(p)}"><div class="gantt" style="width:calc(var(--gl) + ${W}px); min-width:${fit ? '0' : '100%'};">
      <div class="gantt-head"><div class="gl">Etapa</div><div class="gantt-scale"><div class="gantt-months">${months.map(m => `<span style="width:${m.w}px"><em>${m.label}</em></span>`).join('')}</div>${subRow.length ? `<div class="gantt-weeks">${subRow.join('')}</div>` : ''}</div></div>
      <div class="gantt-body" style="position:relative;">
        <div class="gantt-cols" style="left:var(--gl); width:${W}px">${cols}</div>
        ${stages.map(sg => {
          const state_ = stageState(p, sg), pct = stagePercent(p, sg);
          const a = pos(sg.start || sg.end || today), b = pos(sg.end || sg.start || today);
          const w = Math.max(b - a, 18);
          const tks = stageTasks(p, sg).filter(pass);
          const collapsed = projectCollapsedStages.has(sg.id);
          return `<div class="gantt-row${sg.id === G.selectedStageId ? ' selected' : ''}" data-id="${sg.id}">
            <div class="gl"><b>${stages.length > 1 ? gripHtml('Arrastar para reordenar a etapa') : ''}<button type="button" class="gantt-toggle ${collapsed ? 'closed' : ''}" data-toggle="${sg.id}" aria-label="Recolher/expandir tarefas">${icon('caret-down')}</button>${escapeHtml(sg.name)}</b><small>${STAGE_STATE_LABELS[state_]}${sg.end ? ' · prazo ' + fmtDate(sg.end) : ''} · ${stageTasks(p, sg).filter(t => t.done).length}/${stageTasks(p, sg).length} tarefas</small></div>
            <div class="gantt-track">${(sg.start || sg.end) ? `<div class="gantt-bar ${state_}" style="left:${a}px; width:${w}px;"><div class="fill" style="width:${pct}%"></div><span>${pct}%</span></div>` : `<span class="gantt-nodates">Defina o prazo de uma tarefa para a etapa ganhar datas</span>`}</div>
          </div>` + (collapsed ? '' : sortByStart(tks).map(t => ganttTaskRow(t, state_, pos)).join('') + (G.ganttFilter === 'all' ? ganttAddRow(sg.id) : ''));
        }).join('')}
        ${(() => {
          const loose = G.state.tasks.filter(t => t.projectId === p.id && !t.stageId).filter(pass);
          if(!loose.length) return '';
          return `<div class="gantt-row gantt-loose"><div class="gl"><b>Sem etapa</b><small>${loose.length} tarefa${loose.length === 1 ? '' : 's'} sem etapa definida</small></div><div class="gantt-track"></div></div>` +
            loose.map(t => ganttTaskRow(t, 'nao_iniciada', pos)).join('');
        })()}
        <div class="gantt-today" style="left:calc(var(--gl) + ${todayX}px);"><em>Hoje</em></div>
      </div>
    </div></div></div>`;
  const wrapEl = body.querySelector('.gantt-wrap');
  const glW = parseInt(getComputedStyle(wrapEl).getPropertyValue('--gl'), 10) || 260;
  const goToday = (smooth) => wrapEl.scrollTo({ left: Math.max(0, todayX - (wrapEl.clientWidth - glW) / 2), behavior: smooth ? 'smooth' : 'auto' });
  if(GANTT.ganttCenterToday || GANTT.ganttLastProject !== p.id){ goToday(false); GANTT.ganttCenterToday = false; GANTT.ganttLastProject = p.id; }
  else wrapEl.scrollLeft = GANTT.ganttScroll || 0;
  wrapEl.addEventListener('scroll', () => { GANTT.ganttScroll = wrapEl.scrollLeft; });
  body.querySelectorAll('[data-zoom]').forEach(btn => { btn.onclick = () => { G.ganttZoom = btn.dataset.zoom; GANTT.ganttCenterToday = true; render(); }; });
  body.querySelectorAll('[data-gfilter]').forEach(btn => { btn.onclick = () => { G.ganttFilter = btn.dataset.gfilter; render(); }; });
  if(!fit){
    body.querySelector('#ganttToday').onclick = () => goToday(true);
    body.querySelector('#ganttPrev').onclick = () => wrapEl.scrollBy({ left: -(wrapEl.clientWidth - glW) * 0.7, behavior: 'smooth' });
    body.querySelector('#ganttNext').onclick = () => wrapEl.scrollBy({ left: (wrapEl.clientWidth - glW) * 0.7, behavior: 'smooth' });
  }
  bindStageDrag(body, p);
  bindStageOrderReset(body, p);
  body.querySelectorAll('.gantt-row[data-id]').forEach(r => { r.onclick = () => { G.selectedStageId = G.selectedStageId === r.dataset.id ? null : r.dataset.id; render(); }; });
  body.querySelectorAll('.gantt-add-input').forEach(inp => {
    inp.addEventListener('click', (e) => e.stopPropagation());
    inp.addEventListener('keydown', (e) => {
      if(e.key !== 'Enter') return;
      const title = inp.value.trim();
      if(!title) return;
      e.preventDefault();
      const stageId = inp.closest('.gantt-add').dataset.stage;
      createProjectTask(p, stageId, title);
      markDirty();
      // mantém o foco no campo da mesma etapa para criar a próxima
      setTimeout(() => {
        const next = document.querySelector('.gantt-add[data-stage="' + stageId + '"] .gantt-add-input');
        if(next) next.focus();
      }, 0);
    });
  });
  body.querySelectorAll('.gantt-toggle').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.toggle;
      if(projectCollapsedStages.has(id)) projectCollapsedStages.delete(id); else projectCollapsedStages.add(id);
      render();
    };
  });
  body.querySelectorAll('.gantt-task').forEach(r => {
    r.onclick = () => { G.activeTaskId = r.dataset.taskId; G.creatingNewTask = false; render(); };
    r.ondragstart = (e) => { e.dataTransfer.setData('text/plain', r.dataset.taskId); e.dataTransfer.effectAllowed = 'move'; r.classList.add('dragging'); };
    r.ondragend = () => { r.classList.remove('dragging'); body.querySelectorAll('.drop-over').forEach(x => x.classList.remove('drop-over')); };
  });
  // soltar numa etapa (linha da etapa ou uma tarefa dela) move a tarefa; soltar em "Sem etapa" tira da etapa
  body.querySelectorAll('.gantt-row[data-id], .gantt-row.gantt-loose, .gantt-task').forEach(row => {
    const target = () => row.dataset.id !== undefined ? row.dataset.id : (row.dataset.stage !== undefined ? row.dataset.stage : '');
    row.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; row.classList.add('drop-over'); };
    row.ondragleave = () => row.classList.remove('drop-over');
    row.ondrop = (e) => {
      e.preventDefault();
      row.classList.remove('drop-over');
      const id = e.dataTransfer.getData('text/plain');
      const task = G.state.tasks.find(x => x.id === id);
      if(!task || task.projectId !== p.id) return;
      const to = target() || null;
      if((task.stageId || null) === to) return;
      task.stageId = to;
      clampToStage(task); // a tarefa passa a respeitar as datas da nova etapa
      markDirty();
    };
  });
}

/* Cria uma tarefa do projeto (na etapa, ou sem etapa), sem prazo e sem nada além do título. */
export function createProjectTask(project, stageId, title){
  G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
  const t = {
    id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'), title: title || '', categoryId: project.categoryId,
    done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
    description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
    projectId: project.id, stageId: stageId || null,
  };
  G.state.tasks.push(t);
  return t;
}
/* Linha "+ Nova tarefa" no fim de cada etapa: digita o nome e Enter cria a tarefa na etapa, sem prazo. */
export function ganttAddRow(stageId){
  return `<div class="gantt-add" data-stage="${stageId}"><div class="gl"><input type="text" class="gantt-add-input" placeholder="+ Nova tarefa (Enter)" maxlength="200" aria-label="Nova tarefa nesta etapa"></div><div class="gantt-track"></div></div>`;
}
