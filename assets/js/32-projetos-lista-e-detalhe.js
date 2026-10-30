function renderProjects(){
  const view = document.getElementById('projectsView');
  const project = activeProjectId ? projectById(activeProjectId) : null;
  if(activeProjectId && !project) activeProjectId = null;
  if(!project) return renderProjectList(view);
  return renderProjectDetail(view, project);
}

function projectChipsHtml(status){
  return (status.late ? `<span class="proj-chip late">${status.lateCount} etapa${status.lateCount > 1 ? 's' : ''} atrasada${status.lateCount > 1 ? 's' : ''}</span>` : '')
    + (status.total && status.done === status.total ? '<span class="proj-chip ok">Concluído</span>' : '');
}

/* mini linha do tempo da lista: uma barrinha por etapa, na escala do projeto, com a marca de hoje */
function miniTimelineHtml(p){
  const stages = (p.stages || []).filter(sg => sg.start || sg.end);
  if(!stages.length) return '<span class="mini-tl-empty">—</span>';
  const today = todayStr();
  const ds = [];
  stages.forEach(sg => { ds.push(sg.start || sg.end, sg.end || sg.start); });
  ds.push(today);
  ds.sort();
  const t0 = new Date(ds[0] + 'T00:00:00').getTime(), t1 = new Date(ds[ds.length - 1] + 'T00:00:00').getTime();
  const span = Math.max(t1 - t0, 86400000);
  const pos = d => (new Date(d + 'T00:00:00').getTime() - t0) / span * 100;
  return '<div class="mini-tl">' + stages.map(sg => {
    const a = pos(sg.start || sg.end), b = pos(sg.end || sg.start);
    const cls = { concluida:'d', andamento:'c', atrasada:'l', nao_iniciada:'' }[stageState(p, sg)];
    return `<i class="${cls}" title="${escapeHtml(sg.name)}" style="left:${a}%; width:${Math.max(b - a, 2.5)}%"></i>`;
  }).join('') + `<u style="left:${Math.min(Math.max(pos(today), 0), 100)}%"></u></div>`;
}

let projectCollapsedStages = new Set();
let projectListFilter = 'all';
function projectListKind(st){
  if(st.total && st.done === st.total) return 'concluido';
  if(st.late) return 'atrasado';
  return 'andamento';
}
function renderProjectList(view){
  const all = projectsInScope();
  const rows = all.map(p => ({ p, st: projectStatus(p) }));
  rows.forEach(r => { r.kind = projectListKind(r.st); });
  const counts = { all: rows.length, andamento: rows.filter(r => r.kind === 'andamento').length, atrasado: rows.filter(r => r.kind === 'atrasado').length, concluido: rows.filter(r => r.kind === 'concluido').length };
  const filtered = rows.filter(r => projectListFilter === 'all' || r.kind === projectListFilter);
  const chip = (key, label) => `<button type="button" class="plist-chip ${projectListFilter === key ? 'on' : ''}" data-f="${key}">${label} ${counts[key]}</button>`;
  function stageLabel(p, st){
    if(!st.total) return '—';
    return st.next ? st.next.name : '—';
  }
  function statusChip(r){
    const { st, kind } = r;
    if(kind === 'concluido') return '<span class="proj-chip ok">Concluído</span>';
    if(kind === 'atrasado') return `<span class="proj-chip late">${st.lateCount} etapa${st.lateCount > 1 ? 's' : ''} atrasada${st.lateCount > 1 ? 's' : ''}</span>`;
    if(!st.total) return '<span class="proj-chip">Sem etapas</span>';
    return st.pct > 0 ? '<span class="proj-chip" style="background:var(--primary-light); color:var(--primary-dark);">Em andamento</span>' : '<span class="proj-chip">Não iniciado</span>';
  }
  view.innerHTML = `
    <div class="plist-card">
      <div class="plist-tools">
        ${chip('all', 'Todos')}${chip('andamento', 'Em andamento')}${chip('atrasado', 'Atrasados')}${chip('concluido', 'Concluídos')}
        <button type="button" class="btn small" id="prjNewBtn" style="margin-left:auto;">+ Novo projeto</button>
      </div>
      ${all.length ? `
      <div class="plist-head"><span>Projeto</span><span>Progresso</span><span>Entrega</span><span>Status</span></div>
      ${filtered.length ? filtered.map(r => {
        const cat = catById(r.p.categoryId);
        const pc = projectColor(r.p);
        const nextTxt = r.kind === 'concluido' ? 'Concluído' : (r.st.next ? 'Próxima: ' + r.st.next.name : (r.st.total ? '' : 'Sem etapas'));
        return `<div class="plist-row" data-id="${r.p.id}" style="--pc:${pc}">
          <div class="plist-name"><span class="prj-tile">${projectIconSvg(r.p.icon || 'briefcase')}</span><div class="plist-nm"><b>${escapeHtml(r.p.name || 'Projeto')}</b><small>${cat ? escapeHtml(cat.name) + ' · ' : ''}${r.st.total} etapa${r.st.total === 1 ? '' : 's'}</small></div></div>
          <div class="plist-prog"><div class="plist-ptop"><span>${escapeHtml(nextTxt)}</span><b>${r.st.pct}%</b></div><div class="proj-bar"><i style="width:${r.st.pct}%; background:var(--pc);"></i></div></div>
          <span class="plist-end"><small>Entrega</small>${r.st.end ? fmtDate(r.st.end) : '—'}</span>
          <span>${statusChip(r)}</span>
        </div>`;
      }).join('') : '<div class="plist-empty">Nenhum projeto neste filtro.</div>'}` : `
      <div class="plist-empty">Nenhum projeto ainda. Crie um para organizar etapas, prazos e tarefas num só lugar.</div>`}
    </div>`;
  view.querySelector('#prjNewBtn').onclick = () => openProjectEditor(null);
  view.querySelectorAll('.plist-chip').forEach(b => { b.onclick = () => { projectListFilter = b.dataset.f; render(); }; });
  view.querySelectorAll('.plist-row').forEach(r => { r.onclick = () => { activeProjectId = r.dataset.id; projectTab = defaultProjectTab(); selectedStageId = null; render(); }; });
}

function renderProjectDetail(view, p){
  const st = projectStatus(p);
  const today = todayStr();
  const stages = p.stages.slice().sort((a, b) => (a.start || a.end || '9999').localeCompare(b.start || b.end || '9999')); // etapas sem datas ficam por último
  const nextLabel = st.next ? `${escapeHtml(st.next.name)} · ${fmtDate(st.next.end)}` : '—';
  let slip = '';
  if(p.endDate && st.end && st.end > p.endDate){
    const d = Math.round((new Date(st.end + 'T00:00:00') - new Date(p.endDate + 'T00:00:00')) / 86400000);
    slip = `+${d} dia${d > 1 ? 's' : ''}`;
  }
  const selStage = stages.find(x => x.id === selectedStageId) || null;
  if(!selStage) selectedStageId = null;
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
      ${stks.length ? stks.map(t => {
        const subs = t.subtasks || [];
        const pr_ = Math.round(taskProgress(t) * 100);
        return `<div class="proj-side-task" data-task-id="${t.id}"><i class="${t.done ? 'done' : (t.dueDate && t.dueDate < today ? 'late' : '')}"></i><div><b style="${t.done ? 'text-decoration:line-through; opacity:.6;' : ''}">${escapeHtml(t.title || 'Sem título')}</b><small>${t.dueDate ? 'prazo ' + fmtDate(t.dueDate) : 'sem prazo'}${subs.length ? ' · ' + subs.filter(x => x.done).length + '/' + subs.length + ' subtarefas' : ''}${!t.done && pr_ ? ' · ' + pr_ + '%' : ''}</small></div></div>`;
      }).join('') : '<div class="proj-side-sub" style="padding:8px 0;">Nenhuma tarefa nesta etapa ainda.</div>'}
      <button type="button" class="proj-side-btn pri" id="stgSideNewTask">+ Nova tarefa nesta etapa</button>
      <button type="button" class="proj-side-btn" id="stgSideEdit">Editar etapa</button>`;
  }
  const phTasks = state.tasks.filter(t => t.projectId === p.id);
  const soonLim = addDaysStr(today, 3);
  const nLateT = phTasks.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
  const nSoonT = phTasks.filter(t => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= soonLim).length;
  const chips = projectChipsHtml(st) || `<span class="proj-chip">${st.pct > 0 ? 'Em andamento' : 'Não iniciado'}</span>`;
  const endTxt = p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—');
  const stat = (v, of, l, color) => `<div><b${color ? ` style="color:${color}"` : ''}>${v}${of != null ? `<span>/${of}</span>` : ''}</b><small>${l}</small></div>`;
  view.innerHTML = `
    <div class="proj-split">
    <div class="proj-col">
    <div class="prj-head" style="--pc:${projectColor(p)}">
      <div class="ph">
        <div class="ig2" style="--pp:${st.pct}"><i><b>${projectIconSvg(p.icon || 'briefcase')}</b></i><em>${st.pct}%</em></div>
        <div class="ph-name">
          <button type="button" class="prj-circle-btn" id="prjBack" title="Voltar para os projetos" aria-label="Voltar para os projetos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
          <b class="prj-title">${escapeHtml(p.name)}</b>
          ${chips}
        </div>
        <span class="prj-actions">
        <button type="button" class="prj-act" id="prjAddStage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/></svg>Nova etapa</button>
        <button type="button" class="prj-act pri" id="prjAddTask"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Nova tarefa</button>
        <button type="button" class="prj-circle-btn" id="prjMore" title="Mais ações" aria-label="Mais ações" aria-haspopup="menu"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
      </span>
        <div class="ph-st">
          ${stat(st.done, st.total, 'etapas')}
          ${stat(phTasks.filter(t => t.done).length, phTasks.length, 'tarefas')}
          ${stat(nLateT, null, nLateT === 1 ? 'atrasada' : 'atrasadas', nLateT ? 'var(--danger)' : '')}
          ${stat(nSoonT, null, 'em 3 dias', nSoonT ? '#C77700' : '')}
          <div><b class="ph-end">${endTxt}</b><small>entrega${slip ? ` <i style="color:var(--danger); font-style:normal; font-weight:700;">${slip}</i>` : ''}</small></div>
        </div>
        <div class="proj-desc-row" id="prjDescRow"></div>
      </div>
      <div class="proj-tabs">
        <button type="button" class="proj-tab ${projectTab === 'timeline' ? 'on' : ''}" data-tab="timeline">Linha do tempo</button>
        <button type="button" class="proj-tab ${projectTab === 'lista' ? 'on' : ''}" data-tab="lista">Lista</button>
      </div>
    </div>
    <div id="prjBody" style="min-width:0;"></div>
    </div>
      <aside class="proj-side ${selStage ? '' : 'is-resumo'}">
        ${selStage ? stageSideHtml : `
        <div class="proj-side-label">Resumo</div>
        <div class="proj-side-top">
          <div class="proj-ring" style="--p:${st.pct}"><b>${st.pct}%</b></div>
          <div><b>${st.done} de ${st.total} etapa${st.total === 1 ? '' : 's'}</b>
            <div class="proj-side-sub">Entrega prevista ${p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—')}${slip ? ` <span style="color:var(--danger); font-weight:700;">${slip}</span>` : ''}</div></div>
        </div>
        <div class="proj-side-sub" style="margin:2px 0 0;">Próxima entrega: <b style="color:var(--ink);">${nextLabel}</b></div>
        <div class="proj-side-more">
        <div class="proj-side-label" style="margin-top:14px;">Próximas tarefas</div>
        ${(() => {
          const open = state.tasks.filter(t => t.projectId === p.id && !t.done).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 5);
          if(!open.length) return '<div class="proj-side-sub" style="padding:8px 0;">Nenhuma tarefa pendente.</div>';
          return open.map(t => {
            const sg = (p.stages || []).find(x => x.id === t.stageId);
            return `<div class="proj-side-task" data-task-id="${t.id}"><i class="${t.dueDate && t.dueDate < today ? 'late' : ''}"></i><div><b>${escapeHtml(t.title || 'Sem título')}</b><small>${sg ? escapeHtml(sg.name) + ' · ' : ''}${t.dueDate ? 'prazo ' + fmtDate(t.dueDate) : 'sem prazo'}</small></div></div>`;
          }).join('');
        })()}
        <button type="button" class="proj-side-btn" id="prjSideEdit">Editar projeto</button>
        </div>`}
      </aside>
    </div>`;
  if(activeTaskId || creatingNewTask){
    const tpanel = document.createElement('div');
    tpanel.className = 'task-panel';
    view.appendChild(tpanel);
    renderTaskPanel(tpanel);
  }
  /* Descrição: texto corrido (sem caixa), até 2 linhas com "Ver mais"; clicar nela edita no lugar. */
  const descRow = view.querySelector('#prjDescRow');
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
  if(sideBack) sideBack.onclick = () => { selectedStageId = null; render(); };
  const sideEdit = view.querySelector('#stgSideEdit');
  if(sideEdit) sideEdit.onclick = () => openStageEditor(p, selStage);
  const sideNew = view.querySelector('#stgSideNewTask');
  if(sideNew) sideNew.onclick = () => {
    state.taskIdCounter = (state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(state.taskIdCounter).padStart(4, '0'), title: '', categoryId: p.categoryId,
      done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
      description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
      projectId: p.id, stageId: selStage.id,
    };
    state.tasks.push(t);
    activeTaskId = t.id; creatingNewTask = false;
    markDirty();
  };
  const prjSideEdit = view.querySelector('#prjSideEdit');
  if(prjSideEdit) prjSideEdit.onclick = () => openProjectEditor(p);
  view.querySelectorAll('.proj-side-task').forEach(el => {
    el.onclick = () => { activeTaskId = el.dataset.taskId; creatingNewTask = false; render(); };
  });
  view.querySelector('#prjBack').onclick = () => { activeProjectId = null; selectedStageId = null; render(); };
  view.querySelector('#prjMore').onclick = (e) => { e.stopPropagation(); openProjectMenu(e.currentTarget, p); };
  view.querySelector('#prjAddStage').onclick = () => openStageEditor(p, null);
  view.querySelector('#prjAddTask').onclick = () => {
    state.taskIdCounter = (state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(state.taskIdCounter).padStart(4, '0'), title: '', categoryId: p.categoryId,
      done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
      description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
      projectId: p.id, stageId: null,
    };
    state.tasks.push(t);
    activeTaskId = t.id; creatingNewTask = false;
    markDirty();
  };
  view.querySelectorAll('.proj-tab').forEach(b => { b.onclick = () => { projectTab = b.dataset.tab; render(); }; });
  const body = view.querySelector('#prjBody');

  if(!stages.length){
    body.innerHTML = '<div class="empty-state"><p>Este projeto ainda não tem etapas. Use "+ Etapa" para começar.</p></div>';
    return;
  }

  if(projectTab === 'lista'){
    body.innerHTML = '<div class="tpl-list">' + stages.map(sg => {
      const pct = stagePercent(p, sg), state_ = stageState(p, sg), n = stageTasks(p, sg);
      return `<div class="tpl-card" data-id="${sg.id}" style="cursor:pointer;">
        <div class="tpl-card-main">
          <div class="tpl-card-name">${escapeHtml(sg.name)}</div>
          <div class="tpl-card-meta">${sg.start ? fmtDate(sg.start) : '—'} → ${sg.end ? fmtDate(sg.end) : '—'} · ${n.filter(t => t.done).length}/${n.length} tarefas</div>
          <div class="proj-bar" style="margin-top:8px;"><i style="width:${pct}%"></i></div>
        </div>
        <span class="proj-chip ${state_ === 'atrasada' ? 'late' : state_ === 'concluida' ? 'ok' : ''}">${STAGE_STATE_LABELS[state_]} · ${pct}%</span>
      </div>`;
    }).join('') + '</div>';
    body.querySelectorAll('.tpl-card').forEach(c => { c.onclick = () => { selectedStageId = selectedStageId === c.dataset.id ? null : c.dataset.id; render(); }; });
    return;
  }

  // linha do tempo
  const ZOOMS = { fit: { dpx: 0, label: 'Ajustar' }, month: { dpx: 5, label: 'Mês' }, week: { dpx: 14, label: 'Semana' }, day: { dpx: 34, label: 'Dia' } };
  if(!ZOOMS[ganttZoom]) ganttZoom = 'fit';
  const fit = ganttZoom === 'fit';
  ganttFit = fit;
  const DAYMS = 86400000;
  const dates = [];
  stages.forEach(sg => { if(sg.start) dates.push(sg.start); if(sg.end) dates.push(sg.end); });
  if(p.startDate) dates.push(p.startDate);
  if(p.endDate) dates.push(p.endDate);
  state.tasks.forEach(t => { if(t.projectId === p.id){ if(t.startDate) dates.push(t.startDate); if(t.dueDate) dates.push(t.dueDate); } });
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
  const dpx = fit ? Math.max(((body.clientWidth || 900) - 2 - glFit) / total, 1.4) : ZOOMS[ganttZoom].dpx;
  const fine = ganttZoom === 'day' || ganttZoom === 'week';
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
  if(ganttZoom === 'day'){
    for(let i = 0; i < total; i++){ const dt = dayAt(i); subRow.push(`<span class="${i === todayIdx ? 'now' : ''}" style="width:${dpx}px">${dt.getDate()}</span>`); }
  } else if(ganttZoom === 'week'){
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
  const pass = t => ganttFilter === 'all' || (ganttFilter === 'late' ? isLate(t) : isSoon(t));
  const projTasks = state.tasks.filter(t => t.projectId === p.id);
  const nLate = projTasks.filter(isLate).length, nSoon = projTasks.filter(isSoon).length;
  const chev = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  body.innerHTML = `
    <div class="gantt-card">
    <div class="gantt-tools">
      <span class="gantt-seg">${Object.keys(ZOOMS).map(k => `<button type="button" data-zoom="${k}" class="${ganttZoom === k ? 'on' : ''}">${ZOOMS[k].label}</button>`).join('')}</span>
      ${fit ? '' : `<span class="gantt-nav"><button type="button" id="ganttPrev" aria-label="Voltar no tempo">${chev('M15 6l-6 6 6 6')}</button><button type="button" id="ganttToday" class="txt">Hoje</button><button type="button" id="ganttNext" aria-label="Avançar no tempo">${chev('M9 6l6 6-6 6')}</button></span>`}
      <span class="gantt-filters">
        <button type="button" data-gfilter="all" class="${ganttFilter === 'all' ? 'on' : ''}">Todas</button>
        <button type="button" data-gfilter="late" class="${ganttFilter === 'late' ? 'on' : ''}">Atrasadas <b class="late">${nLate}</b></button>
        <button type="button" data-gfilter="soon" class="${ganttFilter === 'soon' ? 'on' : ''}">Vencem em breve <b class="soon">${nSoon}</b></button>
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
          return `<div class="gantt-row${sg.id === selectedStageId ? ' selected' : ''}" data-id="${sg.id}">
            <div class="gl"><b><button type="button" class="gantt-toggle ${collapsed ? 'closed' : ''}" data-toggle="${sg.id}" aria-label="Recolher/expandir tarefas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>${escapeHtml(sg.name)}</b><small>${STAGE_STATE_LABELS[state_]}${sg.end ? ' · prazo ' + fmtDate(sg.end) : ''} · ${stageTasks(p, sg).filter(t => t.done).length}/${stageTasks(p, sg).length} tarefas</small></div>
            <div class="gantt-track">${(sg.start || sg.end) ? `<div class="gantt-bar ${state_}" style="left:${a}px; width:${w}px;"><div class="fill" style="width:${pct}%"></div><span>${pct}%</span></div>` : `<span class="gantt-nodates">Defina o prazo de uma tarefa para a etapa ganhar datas</span>`}</div>
          </div>` + (collapsed ? '' : sortByStart(tks).map(t => ganttTaskRow(t, state_, pos)).join('') + (ganttFilter === 'all' ? ganttAddRow(sg.id) : ''));
        }).join('')}
        ${(() => {
          const loose = state.tasks.filter(t => t.projectId === p.id && !t.stageId).filter(pass);
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
  if(ganttCenterToday || ganttLastProject !== p.id){ goToday(false); ganttCenterToday = false; ganttLastProject = p.id; }
  else wrapEl.scrollLeft = ganttScroll || 0;
  wrapEl.addEventListener('scroll', () => { ganttScroll = wrapEl.scrollLeft; });
  body.querySelectorAll('[data-zoom]').forEach(btn => { btn.onclick = () => { ganttZoom = btn.dataset.zoom; ganttCenterToday = true; render(); }; });
  body.querySelectorAll('[data-gfilter]').forEach(btn => { btn.onclick = () => { ganttFilter = btn.dataset.gfilter; render(); }; });
  if(!fit){
    body.querySelector('#ganttToday').onclick = () => goToday(true);
    body.querySelector('#ganttPrev').onclick = () => wrapEl.scrollBy({ left: -(wrapEl.clientWidth - glW) * 0.7, behavior: 'smooth' });
    body.querySelector('#ganttNext').onclick = () => wrapEl.scrollBy({ left: (wrapEl.clientWidth - glW) * 0.7, behavior: 'smooth' });
  }
  body.querySelectorAll('.gantt-row[data-id]').forEach(r => { r.onclick = () => { selectedStageId = selectedStageId === r.dataset.id ? null : r.dataset.id; render(); }; });
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
    r.onclick = () => { activeTaskId = r.dataset.taskId; creatingNewTask = false; render(); };
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
      const task = state.tasks.find(x => x.id === id);
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
function createProjectTask(project, stageId, title){
  state.taskIdCounter = (state.taskIdCounter || 0) + 1;
  const t = {
    id: uid('task'), shortId: String(state.taskIdCounter).padStart(4, '0'), title: title || '', categoryId: project.categoryId,
    done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
    description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
    projectId: project.id, stageId: stageId || null,
  };
  state.tasks.push(t);
  return t;
}
/* Linha "+ Nova tarefa" no fim de cada etapa: digita o nome e Enter cria a tarefa na etapa, sem prazo. */
function ganttAddRow(stageId){
  return `<div class="gantt-add" data-stage="${stageId}"><div class="gl"><input type="text" class="gantt-add-input" placeholder="+ Nova tarefa (Enter)" maxlength="200" aria-label="Nova tarefa nesta etapa"></div><div class="gantt-track"></div></div>`;
}
