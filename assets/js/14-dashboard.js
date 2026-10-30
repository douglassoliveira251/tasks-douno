/* ===================== DASHBOARD ===================== */
function svgSparkline(values, width, height, color){
  const max = Math.max(1, ...values);
  const stepX = width / Math.max(1, values.length - 1);
  const points = values.map((v,i) => {
    const x = i*stepX;
    const y = height - (v/max) * (height-4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}
function svgBarChart(values, labels, width, height){
  const max = Math.max(1, ...values);
  const barW = width/values.length;
  let bars = '';
  values.forEach((v,i) => {
    const h = v>0 ? Math.max(2, (v/max)*(height-18)) : 0;
    const x = i*barW + barW*0.22;
    const w = barW*0.56;
    const y = height - h - 14;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="var(--primary)"><title>${labels?labels[i]:''}: ${v}</title></rect>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${bars}</svg>`;
}

function renderDashboard(){
  const view = document.getElementById('dashboardView');
  const todayS = todayStr();
  const inSpace = x => !dashboardSpace || x.categoryId === dashboardSpace;
  const scopeTasks = state.tasks.filter(inSpace);
  const scopeNotes = state.notes.filter(inSpace);
  const scopeEvents = state.events.filter(inSpace);

  const completed = scopeTasks.filter(t => t.done);
  const now = Date.now();
  const DAY = 86400000;
  const completedRecent45 = completed.filter(t => t.completedAt && t.completedAt >= now - 45*DAY);

  const open = scopeTasks.filter(t => !t.done);
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayS);
  const dueToday = open.filter(t => t.dueDate === todayS);
  const endOfWeekS = addDaysStr(todayS, 6);
  const dueThisWeek = open.filter(t => t.dueDate && t.dueDate > todayS && t.dueDate <= endOfWeekS);
  const noDue = open.filter(t => !t.dueDate);
  const overdueOrToday = overdue.concat(dueToday).sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
  const criticalOverdue = overdue.filter(t => t.priority === 'critica');
  const todayEvents = eventsOnDate(scopeEvents, todayS);

  // Card: Tarefas (concluídas consideram só os últimos 45 dias)
  const kpiTasksTotal = scopeTasks.length;
  const kpiTasksDone = completedRecent45.length;
  const kpiTasksPending = open.length;
  const kpiTasksPct = kpiTasksTotal ? Math.round(kpiTasksDone/kpiTasksTotal*100) : 0;

  // Card: Notas (+ sparkline dos ultimos 10 dias)
  const kpiNotesTotal = scopeNotes.length;
  const kpiNotesNew7 = scopeNotes.filter(n => n.createdAt && n.createdAt >= now - 7*DAY).length;
  const sparkDays = 10;
  const sparkCounts = [];
  for(let i=sparkDays-1;i>=0;i--){
    const dStr = addDaysStr(todayS, -i);
    sparkCounts.push(scopeNotes.filter(n => n.createdAt && dateToStr(new Date(n.createdAt)) === dStr).length);
  }

  // Card: Eventos hoje
  const kpiTodayEvents = todayEvents;
  /* agenda: hoje + próximos 7 dias numa lista só (o cartão mostra 5, o resto abre em "Ver mais").
     Agenda de vários dias é uma linha só, com início e fim, e não uma por dia. */
  const agendaRows = [];
  const agendaSeen = new Set();
  const evSpan = ev => (ev.endDate && ev.endDate > ev.date) ? Math.round((Date.parse(ev.endDate) - Date.parse(ev.date)) / 86400000) : 0;
  for(let k = 0; k <= 7; k++){
    const d = addDaysStr(todayS, k);
    eventsOnDate(scopeEvents, d).slice().sort((x, y) => (x.allDay ? '' : (x.startTime || '')).localeCompare(y.allDay ? '' : (y.startTime || ''))).forEach(ev => {
      const span = evSpan(ev);
      let start = d;
      for(let j = 0; j <= span; j++){ const c = addDaysStr(d, -j); if(eventStartsOn(ev, c)){ start = c; break; } }
      const key = ev.id + '|' + start;
      if(agendaSeen.has(key)) return;
      agendaSeen.add(key);
      agendaRows.push({ ev, date: d, until: span ? addDaysStr(start, span) : null });
    });
  }
  const agendaDayLabel = d => d === todayS ? '' : (d === addDaysStr(todayS, 1) ? 'Amanhã' : new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', ''));
  const agendaRowHtml = r => `<div class="rs-row dash-list-row" data-event-id="${r.ev.id}"><span class="rs-tag ok">${r.ev.allDay || !r.ev.startTime ? 'Dia todo' : r.ev.startTime}</span><span class="tt"><b>${escapeHtml(r.ev.title || 'Sem título')}</b>${r.until ? `<small>até ${r.until.slice(8)}/${r.until.slice(5, 7)}</small>` : ''}</span><span class="dt">${r.until ? (agendaDayLabel(r.date) || 'Hoje') : agendaDayLabel(r.date)}</span></div>`;
  const nowTimeStr = new Date().toTimeString().slice(0,5);
  const kpiNextEvent = kpiTodayEvents.find(ev => !ev.startTime || ev.startTime >= nowTimeStr) || kpiTodayEvents[0] || null;

  // Card: Itens importantes (tarefas alta/critica em aberto + notas fixadas)
  const importantTasks = open.filter(t => t.priority==='alta' || t.priority==='critica');
  const importantTasksSorted = importantTasks.slice().sort((a,b) => (a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  const importantNotes = scopeNotes.filter(n => n.pinned && !n.archived);

  // --- Tarefas por status (donut) ---
  const statusDoneCount = completed.length;
  const statusOverdueCount = overdue.length;
  const statusInProgressCount = open.filter(t => t.status === 'em_andamento' && !(t.dueDate && t.dueDate < todayS)).length;
  const statusPendingCount = Math.max(0, open.length - statusOverdueCount - statusInProgressCount);
  const statusTotalCount = scopeTasks.length;
  const statusBuckets = [
    { label:'Concluídas', count: statusDoneCount, color:'var(--priority-media)' },
    { label:'Em andamento', count: statusInProgressCount, color:'var(--priority-alta)' },
    { label:'Pendentes', count: statusPendingCount, color:'var(--priority-baixa)' },
    { label:'Atrasadas', count: statusOverdueCount, color:'var(--danger)' },
  ];

  // --- Atividades recentes ---
  const activityIcons = {
    task_done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    note_created: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    event_updated: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    event_created: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  };
  const activityColors = { task_done:'priority-media', note_created:'purple', event_updated:'info', event_created:'info' };
  const activityItems = [];
  completed.forEach(t => { if(t.completedAt) activityItems.push({ type:'task_done', ts:t.completedAt, msg:`Você concluiu a tarefa "${t.title||'Sem título'}"`, cat: catById(t.categoryId), module:'Tarefas' }); });
  scopeNotes.forEach(n => { if(n.createdAt) activityItems.push({ type:'note_created', ts:n.createdAt, msg:`Nova nota criada "${n.title||'Sem título'}"`, cat: catById(n.categoryId), module:'Notas' }); });
  scopeEvents.forEach(ev => {
    if(ev.wasEdited && ev.updatedAt) activityItems.push({ type:'event_updated', ts:ev.updatedAt, msg:`Evento atualizado "${ev.title||'Sem título'}"`, cat: catById(ev.categoryId), module:'Calendário' });
    else if(ev.createdAt) activityItems.push({ type:'event_created', ts:ev.createdAt, msg:`Nova agenda criada "${ev.title||'Sem título'}"`, cat: catById(ev.categoryId), module:'Calendário' });
  });
  activityItems.sort((a,b) => b.ts - a.ts);
  const recentActivities = activityItems.slice(0, 4);

  const kpiImportantTotal = importantTasks.length + importantNotes.length;

  const completedLast7 = completed.filter(t => t.completedAt && t.completedAt >= now - 7*DAY);
  const completedPrev7 = completed.filter(t => t.completedAt && t.completedAt >= now - 14*DAY && t.completedAt < now - 7*DAY);
  const completedLast30 = completed.filter(t => t.completedAt && t.completedAt >= now - 30*DAY);
  const createdLast30 = scopeTasks.filter(t => t.createdAt && t.createdAt >= now - 30*DAY);
  const conclusionRate = scopeTasks.length ? Math.round((completedRecent45.length/scopeTasks.length)*100) : 0;
  const overduePct = open.length ? Math.round((overdue.length/open.length)*100) : 0;
  const trend = completedLast7.length - completedPrev7.length;

  const catLoad = {};
  open.forEach(t => { catLoad[t.categoryId] = (catLoad[t.categoryId]||0)+1; });
  const catLoadList = getOrderedCategories().map(c => ({ cat:c, count: catLoad[c.id]||0 })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);

  const weekdayCounts = [0,0,0,0,0,0,0];
  completed.forEach(t => { if(t.completedAt) weekdayCounts[new Date(t.completedAt).getDay()]++; });
  const maxWeekdayIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const bestWeekday = Math.max(...weekdayCounts) > 0 ? WEEKDAY_LABELS[maxWeekdayIdx] : '—';

  const dayLabels = [];
  const dayCounts = [];
  for(let i=13;i>=0;i--){
    const dStr = addDaysStr(todayS, -i);
    dayLabels.push(dStr.slice(8,10)+'/'+dStr.slice(5,7));
    dayCounts.push(completed.filter(t => t.completedAt && dateToStr(new Date(t.completedAt)) === dStr).length);
  }

  const avgByPriority = {};
  PRIORITY_CONFIG.forEach(p => {
    const items = completed.filter(t => t.priority===p.key && t.completedAt && t.createdAt);
    if(items.length){
      const avgMs = items.reduce((s,t)=>s+(t.completedAt-t.createdAt),0)/items.length;
      avgByPriority[p.key] = Math.round(avgMs/DAY*10)/10;
    }
  });

  let streak = 0;
  for(let i=0;i<365;i++){
    const dStr = addDaysStr(todayS, -i);
    const hasCompletion = completed.some(t => t.completedAt && dateToStr(new Date(t.completedAt)) === dStr);
    if(hasCompletion) streak++;
    else if(i===0) continue;
    else break;
  }

  const priorityCounts = PRIORITY_CONFIG.slice().reverse().map(p => ({ ...p, count: open.filter(t=>t.priority===p.key).length }));
  const maxPriorityCount = Math.max(1, ...priorityCounts.map(p=>p.count));

  const upcomingEvents = upcomingEventOccurrences(scopeEvents, todayS, 90).slice(0,6);

  const noTagOpen = open.filter(t => !(t.tagIds||[]).length);
  const activeRecurring = scopeTasks.filter(t => t.recurrence && t.recurrence !== 'none');

  const focusD = new Date(todayS+'T00:00:00');
  const fullDateLabel = `${WEEKDAY_FULL_LABELS[focusD.getDay()]}, ${focusD.getDate()} de ${MONTH_LABELS[focusD.getMonth()]} de ${focusD.getFullYear()}`;

  function emptyDashState(icon, msg){
    return `<div class="dash-empty-state">${icon}<p>${msg}</p></div>`;
  }
  function dashTaskRow(t){
    const isOverdue = t.dueDate && t.dueDate < todayS;
    return `<div class="dash-list-row" data-task-id="${t.id}">
      <span class="dash-list-title">${escapeHtml(t.title||'Sem título')}</span>
      <span class="dash-list-date ${isOverdue?'overdue':''}">${fmtDate(t.dueDate)}</span>
    </div>`;
  }

  /* ===== Resumo (bento) ===== */
  const followToday = open.filter(t => t.followUpDate && t.followUpDate <= todayS)
    .sort((x, y) => (x.followUpDate || '').localeCompare(y.followUpDate || ''));
  const upcomingTasks = open.filter(t => t.dueDate && t.dueDate >= todayS && t.dueDate <= addDaysStr(todayS, 7))
    .sort((x, y) => (x.dueDate + (x.dueTime || '99:99')).localeCompare(y.dueDate + (y.dueTime || '99:99'))).slice(0, 5);
  const prStatus = (state.projects || []).filter(p => !dashboardSpace || p.categoryId === dashboardSpace).map(p => ({ p, st: projectStatus(p) }));
  const lateProjects = prStatus.filter(x => x.st.late).length;
  const spark14 = dayCounts;
  const sparkMax = Math.max(1, ...spark14);
  const sparkPts = spark14.map((v, i) => [(i / (spark14.length - 1)) * 420, 100 - (v / sparkMax) * 80 - 8]);
  const sparkLine = sparkPts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const inProgress = open.filter(t => t.status === 'em_andamento').length;
  const openPct = scopeTasks.length ? Math.round(open.length / scopeTasks.length * 100) : 0;
  // tarefas abertas sem data: sem prazo, sem data de retomada e sem nenhuma das duas
  const noFollow = open.filter(t => !t.followUpDate);
  const noDates = open.filter(t => !t.dueDate && !t.followUpDate);
  const miniTitles = list => list.slice(0, 2).map(t => escapeHtml(t.title || 'Sem título')).join(', ') + (list.length > 2 ? '…' : '');
  const spaceList = getOrderedCategories();
  const priColor = k => (PRIORITY_CONFIG.find(x => x.key === k) || {}).color || 'var(--ink-faint)';

  view.innerHTML = `
    <div class="dash-wrap">
      <div class="rs-top">
        <div class="rs-card rs-hero">
          <div class="rs-chips"><span class="rs-label">Hoje</span>
            ${followToday.length ? `<span class="rs-tag warn">↻ ${followToday.length} para retomar</span>` : ''}
            ${overdue.length ? `<span class="rs-tag late">${overdue.length} atrasada${overdue.length > 1 ? 's' : ''}</span>` : ''}
            ${lateProjects ? `<span class="rs-tag late">${lateProjects} projeto${lateProjects > 1 ? 's' : ''} em atraso</span>` : ''}
          </div>
          <div class="rs-big">${dueToday.length}<small>tarefa${dueToday.length === 1 ? '' : 's'} para hoje</small></div>
          <div class="rs-sub">${completedLast7.length} concluída${completedLast7.length === 1 ? '' : 's'} nos últimos 7 dias${trend ? ' (' + (trend > 0 ? '+' : '') + trend + ' vs. semana anterior)' : ''}</div>
          <svg class="rs-spark" viewBox="0 0 420 110" preserveAspectRatio="none"><defs><linearGradient id="rsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".4"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs><path d="${sparkLine} L420 110 L0 110Z" fill="url(#rsg)"/><path d="${sparkLine}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
          <div class="rs-stats">
            <div><span>Concluídas (7 dias)</span><br><b>${completedLast7.length}</b></div>
            <div><span>Em andamento</span><br><b>${inProgress}</b></div>
            <div><span>Abertas</span><br><b>${open.length}</b><div class="rs-bar"><i style="width:${openPct}%"></i></div></div>
            <i class="rs-stat-sep"></i>
            <div class="rs-stat-link" data-nodate="due" title="Ver tarefas sem prazo"><span>Sem prazo</span><br><b class="${noDue.length ? 'amb' : ''}">${noDue.length}</b><div class="rs-bar amb"><i style="width:${open.length ? Math.round(noDue.length / open.length * 100) : 0}%"></i></div></div>
            <div class="rs-stat-link" data-nodate="follow" title="Ver tarefas sem data de retomada"><span>Sem retomada</span><br><b class="${noFollow.length ? 'amb' : ''}">${noFollow.length}</b><div class="rs-bar amb"><i style="width:${open.length ? Math.round(noFollow.length / open.length * 100) : 0}%"></i></div></div>
          </div>
        </div>
        <div class="rs-card">
          <h3>Próximos prazos <span>7 dias</span></h3>
          ${upcomingTasks.length ? upcomingTasks.map(t => { const cat = catById(t.categoryId), pr = t.projectId ? projectById(t.projectId) : null; return `
            <div class="rs-row dash-list-row" data-task-id="${t.id}">
              <span class="bar-pr" style="background:${priColor(t.priority)}"></span>
              <span class="tt"><b>${escapeHtml(t.title || 'Sem título')}</b><small>${pr ? escapeHtml(pr.name) : (cat ? escapeHtml(cat.name) : '')}</small></span>
              <span class="dt">${t.dueDate === todayS ? 'Hoje' : fmtDate(t.dueDate)}${t.dueTime ? ' ' + t.dueTime : ''}</span>
            </div>`; }).join('') : '<div class="rs-empty">Nada com prazo nos próximos 7 dias.</div>'}
          <span class="rs-link" id="dashSeeAllTasksLink">Ver todas as tarefas →</span>
        </div>
      </div>

      <div class="rs-spaces">
        ${spaceList.map(c => {
          const o = open.filter(t => t.categoryId === c.id).length;
          const d = completed.filter(t => t.categoryId === c.id).length;
          const pct = (o + d) ? Math.round(d / (o + d) * 100) : 0;
          return `<div class="rs-card rs-space" data-space="${c.id}" title="Ver as tarefas deste espaço">
            <div class="sq" style="background:${c.color}2E; color:${c.color};">${escapeHtml((c.name || '?').charAt(0).toUpperCase())}</div>
            <div class="tx"><small>${escapeHtml(c.name)}</small><b>${o} aberta${o === 1 ? '' : 's'}</b><div class="rs-bar"><i style="width:${pct}%; background:${c.color}"></i></div></div>
          </div>`; }).join('')}
        <div class="rs-card rs-add" id="rsAddSpace"><span style="font-size:20px; line-height:1">＋</span>Espaço</div>
      </div>

      <div class="rs-three">
        <div class="rs-card">
          <h3>Projetos <span>${prStatus.length ? prStatus.length + ' ativo' + (prStatus.length > 1 ? 's' : '') : ''}</span></h3>
          ${prStatus.length ? prStatus.slice(0, 4).map(x => { const fin = x.st.total && x.st.done === x.st.total; return `<div class="rs-proj" data-project="${x.p.id}" style="--c:${projectColor(x.p)}; --p:${x.st.pct}">
            <div class="pj-ig"><i><b>${projectIconSvg(x.p.icon || 'briefcase')}</b></i><em>${x.st.pct}%</em></div>
            <div class="pj-tx"><b>${escapeHtml(x.p.name || 'Projeto')}</b><small>${fin ? 'Concluído' : (x.st.next ? escapeHtml(x.st.next.name || 'Etapa') + ' · ' + fmtDate(x.st.next.end) : (x.st.end ? 'Entrega ' + fmtDate(x.st.end) : 'Sem etapas'))}</small></div>
            <span class="rs-tag ${x.st.late ? 'late' : (fin ? 'ok' : '')}">${x.st.late ? x.st.lateCount + ' atrasada' + (x.st.lateCount > 1 ? 's' : '') : (fin ? 'Concluído' : 'No prazo')}</span></div>`; }).join('')
            : '<div class="rs-empty">Nenhum projeto ainda.</div>'}
          <span class="rs-link" id="rsSeeProjects">Ver projetos →</span>
        </div>
        <div class="rs-card">
          <h3>Retomar hoje <span>${followToday.length ? followToday.length : ''}</span></h3>
          ${followToday.length ? followToday.slice(0, 4).map(t => `<div class="rs-row dash-list-row" data-task-id="${t.id}"><span class="tt"><b>${escapeHtml(t.title || 'Sem título')}</b><small>${t.dueDate ? 'Prazo ' + fmtDate(t.dueDate) : 'Sem prazo'}</small></span></div>`).join('')
            : '<div class="rs-empty">Nada para retomar hoje.</div>'}
        </div>
        <div class="rs-card rs-agenda">
          <h3>Agenda <span>${todayEvents.length ? todayEvents.length + ' hoje' : ''}</span></h3>
          ${agendaRows.length ? agendaRows.slice(0, 5).map(r => agendaRowHtml(r)).join('') : '<div class="rs-empty">Nenhum evento nos próximos 7 dias.</div>'}
          <span class="rs-link" id="${agendaRows.length > 5 ? 'dashAgendaMore' : 'dashSeeAllEventsLink'}">${agendaRows.length > 5 ? 'Ver mais (' + (agendaRows.length - 5) + ') →' : 'Ver calendário →'}</span>
        </div>
      </div>

      <div class="rs-two rs-bottom">
        <div class="rs-card">
          <h3>Tarefas importantes <span id="dashSeeAllImportantLink" style="cursor:pointer; color:var(--primary); font-weight:600;">Ver todas →</span></h3>
          ${importantTasksSorted.length ? importantTasksSorted.slice(0, 5).map(t => `<div class="rs-row dash-tasklist-row" data-task-id="${t.id}">
            <span class="bar-pr" style="background:${t.priority === 'critica' ? 'var(--priority-critica)' : 'var(--priority-alta)'}"></span>
            <span class="tt"><b>${escapeHtml(t.title || 'Sem título')}</b><small>${t.priority === 'critica' ? 'Crítica' : 'Alta'}</small></span>
            <span class="dt ${t.dueDate && t.dueDate < todayS ? 'late' : ''}">${t.dueDate ? fmtDate(t.dueDate) : ''}</span></div>`).join('')
            : '<div class="rs-empty">Nenhuma tarefa importante.</div>'}
        </div>
        <div class="rs-card rs-datas">
          <h3>Tarefas sem data</h3>
          <div class="rs-drow" data-nodate="due">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg></span>
            <span class="n">${noDue.length}</span>
            <span class="tx"><b>Sem prazo</b><small>${noDue.length ? miniTitles(noDue) : 'Tudo com prazo'}</small></span>
            <span class="go">Ver →</span>
          </div>
          <div class="rs-drow" data-nodate="follow">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a2 2 0 012-2h16"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 01-2 2H3"/></svg></span>
            <span class="n">${noFollow.length}</span>
            <span class="tx"><b>Sem data de retomada</b><small>${noFollow.length ? miniTitles(noFollow) : 'Tudo com retomada'}</small></span>
            <span class="go">Ver →</span>
          </div>
          <div class="rs-drow ${noDates.length ? 'warn' : ''}" data-nodate="none">
            <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8 8l8 8"/></svg></span>
            <span class="n">${noDates.length}</span>
            <span class="tx"><b>Sem nenhuma data</b><small>${noDates.length ? miniTitles(noDates) : 'Nenhuma tarefa solta'}</small></span>
            <span class="go">${noDates.length ? 'Organizar →' : ''}</span>
          </div>
        </div>
        <div class="rs-card">
          <h3>Atividades recentes</h3>
          ${recentActivities.length ? recentActivities.map(a => `<div class="rs-row" style="cursor:default"><span class="tt"><b>${escapeHtml(a.msg)}</b><small>${a.cat ? escapeHtml(a.cat.name) + ' · ' : ''}${a.module}</small></span><span class="dt">${fmtActivityTime(a.ts)}</span></div>`).join('')
            : '<div class="rs-empty">Nenhuma atividade ainda.</div>'}
        </div>
      </div>
    </div>
  `;

  view.querySelectorAll('[data-nodate]').forEach(el => {
    el.onclick = () => {
      const kind = el.dataset.nodate;
      if(kind === 'none' && noDates.length){
        // abre a primeira tarefa sem nenhuma data para já definir a retomada
        currentView = 'tasks'; activeTaskId = noDates[0].id; creatingNewTask = false; render();
        return;
      }
      currentView = 'tasks';
      taskGroupMode = kind === 'due' ? 'periodo' : 'retomada';
      render();
    };
  });
  view.querySelectorAll('.rs-space[data-space]').forEach(el => {
    el.onclick = () => { activeCategoryFilter = el.dataset.space; currentView = 'tasks'; render(); };
  });
  const rsAdd = document.getElementById('rsAddSpace');
  if(rsAdd) rsAdd.onclick = () => { settingsTab = 'categorias'; currentView = 'settings'; render(); };
  view.querySelectorAll('.rs-proj[data-project]').forEach(el => {
    el.onclick = () => { activeProjectId = el.dataset.project; projectTab = defaultProjectTab(); currentView = 'projects'; render(); };
  });
  const rsSeeProjects = document.getElementById('rsSeeProjects');
  if(rsSeeProjects) rsSeeProjects.onclick = () => { activeProjectId = null; currentView = 'projects'; render(); };

  view.querySelectorAll('.dash-list-row[data-task-id]').forEach(row => {
    row.onclick = () => { currentView = 'tasks'; activeTaskId = row.dataset.taskId; creatingNewTask = false; render(); };
  });
  view.querySelectorAll('.dash-list-row[data-note-id], .dash-note-card[data-note-id]').forEach(row => {
    row.onclick = () => {
      currentView = 'notes';
      render();
      const n = state.notes.find(x => x.id === row.dataset.noteId);
      if(n) openNoteComposer(n);
    };
  });
  view.querySelectorAll('.dash-list-row[data-event-id]').forEach(row => {
    row.onclick = () => {
      const ev = state.events.find(x => x.id === row.dataset.eventId);
      if(ev) openEventComposer(ev);
    };
  });
  const agendaMore = document.getElementById('dashAgendaMore');
  if(agendaMore) agendaMore.onclick = () => {
    let ov = document.getElementById('agendaMoreOverlay');
    if(ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'overlay show'; ov.id = 'agendaMoreOverlay';
    let lastDay = null;
    ov.innerHTML = `<div class="modal" style="width:440px; max-width:calc(100vw - 24px); max-height:80vh; overflow-y:auto;">
      <h3 style="margin-bottom:10px;">Agenda dos próximos 7 dias</h3>
      ${agendaRows.map(r => { const head = r.date !== lastDay ? `<div class="search-results-group-label" style="padding-left:0;">${r.date === todayS ? 'Hoje' : (agendaDayLabel(r.date))}</div>` : ''; lastDay = r.date; return head + agendaRowHtml({ ev: r.ev, date: todayS, until: r.until }); }).join('')}
      <div class="modal-footer" style="margin-top:12px;"><button type="button" class="btn" id="agendaMoreClose">Fechar</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('#agendaMoreClose').onclick = close;
    ov.addEventListener('mousedown', e => { if(e.target === ov) close(); });
    ov.querySelectorAll('.dash-list-row[data-event-id]').forEach(row => { row.onclick = () => { close(); const ev = state.events.find(x => x.id === row.dataset.eventId); if(ev) openEventComposer(ev); }; });
  };
  const seeAllImportantLink = document.getElementById('dashSeeAllImportantLink');
  if(seeAllImportantLink) seeAllImportantLink.onclick = (e) => { e.preventDefault(); currentView = 'tasks'; render(); };
  const seeAllImportantBottomLink = document.getElementById('dashSeeAllImportantBottomLink');
  if(seeAllImportantBottomLink) seeAllImportantBottomLink.onclick = () => { currentView = 'tasks'; render(); };
  view.querySelectorAll('.dash-tasklist-row[data-task-id]').forEach(row => {
    row.onclick = () => { currentView = 'tasks'; activeTaskId = row.dataset.taskId; creatingNewTask = false; render(); };
  });

  const kpiEventsCard = document.getElementById('dashKpiEventsCard');
  if(kpiEventsCard) kpiEventsCard.onclick = () => { currentView = 'calendar'; render(); };
  const kpiImportantCard = document.getElementById('dashKpiImportantCard');
  if(kpiImportantCard) kpiImportantCard.onclick = () => { currentView = 'tasks'; render(); };

  const seeAllTasksLink = document.getElementById('dashSeeAllTasksLink');
  if(seeAllTasksLink) seeAllTasksLink.onclick = () => { currentView = 'tasks'; render(); };
  const seeCalendarLink = document.getElementById('dashSeeCalendarLink');
  if(seeCalendarLink) seeCalendarLink.onclick = (e) => { e.preventDefault(); currentView = 'calendar'; render(); };
  const seeAllEventsLink = document.getElementById('dashSeeAllEventsLink');
  if(seeAllEventsLink) seeAllEventsLink.onclick = () => { currentView = 'calendar'; render(); };
}


let calLayersOpen = false;
document.addEventListener('click', e => { if(calLayersOpen && !e.target.closest('.cal-layers')){ calLayersOpen = false; render(); } });
function renderCalendar(){
  const view = document.getElementById('calendarView');
  view.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'cal-header';
  const focusD = new Date(calendarFocusDate + 'T00:00:00');
  let periodLabel = '';
  if(calendarView === 'month') periodLabel = `${MONTH_LABELS[focusD.getMonth()]} ${focusD.getFullYear()}`;
  else if(calendarView === 'week'){
    const start = startOfWeekStr(calendarFocusDate);
    const end = addDaysStr(start, 6);
    const sD = new Date(start+'T00:00:00'), eD = new Date(end+'T00:00:00');
    periodLabel = `${sD.getDate()} de ${MONTH_LABELS[sD.getMonth()]} – ${eD.getDate()} de ${MONTH_LABELS[eD.getMonth()]}`;
  } else {
    periodLabel = `${WEEKDAY_FULL[focusD.getDay()]}, ${focusD.getDate()} de ${MONTH_LABELS[focusD.getMonth()].toLowerCase()}`;
  }

  header.innerHTML = `
    <div class="cal-view-toggle">
      <button type="button" data-cv="day" class="${calendarView==='day'?'active':''}">Dia</button>
      <button type="button" data-cv="week" class="${calendarView==='week'?'active':''}">Semana</button>
      <button type="button" data-cv="month" class="${calendarView==='month'?'active':''}">Mês</button>
    </div>
    <div class="cal-nav">
      <button type="button" id="calPrevBtn" title="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <button type="button" id="calTodayBtn">Hoje</button>
      <button type="button" id="calNextBtn" title="Próximo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
    <div class="cal-period-label">${periodLabel}</div>
    <div class="cal-layers">
      <button type="button" class="cal-layers-btn${calLayersOpen ? ' open' : ''}" id="calLayersBtn" aria-haspopup="true" aria-expanded="${calLayersOpen}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>Camadas</button>
      ${calLayersOpen ? `<div class="cal-layers-pop" id="calLayersPop"><h4>Camadas do calendário</h4>
        <label class="cal-lay-row"><span>Feriados nacionais</span><span class="completed-toggle"><input type="checkbox" id="layHol" ${state.showHolidays !== false ? 'checked' : ''}><span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span></span></label>
        <label class="cal-lay-row sub ${state.showHolidays === false ? 'off' : ''}"><span>Incluir facultativos (Carnaval, Corpus Christi)</span><span class="completed-toggle"><input type="checkbox" id="layOpt" ${state.showOptionalHolidays !== false ? 'checked' : ''}><span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span></span></label>
      </div>` : ''}
    </div>
  `;
  view.appendChild(header);
  header.querySelector('#calLayersBtn').onclick = (e) => { e.stopPropagation(); calLayersOpen = !calLayersOpen; render(); };
  if(calLayersOpen){
    header.querySelector('#layHol').onchange = e => { state.showHolidays = e.target.checked; markDirty(); };
    header.querySelector('#layOpt').onchange = e => { state.showOptionalHolidays = e.target.checked; markDirty(); };
  }

  header.querySelectorAll('[data-cv]').forEach(btn => {
    btn.onclick = () => {
      calendarView = btn.dataset.cv;
      state.calendarViewDefault = calendarView;
      if(activeCategoryFilter){
        state.categoryCalendarViews[activeCategoryFilter] = calendarView;
      }
      markDirty();
    };
  });
  header.querySelector('#calTodayBtn').onclick = () => { calendarFocusDate = todayStr(); render(); };
  header.querySelector('#calPrevBtn').onclick = () => { navigateCalendar(-1); };
  header.querySelector('#calNextBtn').onclick = () => { navigateCalendar(1); };

  const body = document.createElement('div');
  body.className = 'cal-body';
  view.appendChild(body);

  if(calendarView === 'month') renderCalendarMonth(body);
  else if(calendarView === 'week') renderCalendarWeek(body);
  else renderCalendarDay(body);
}

function navigateCalendar(dir){
  if(calendarView === 'month'){
    const d = new Date(calendarFocusDate + 'T00:00:00');
    d.setMonth(d.getMonth() + dir);
    calendarFocusDate = dateToStr(d);
  } else if(calendarView === 'week'){
    calendarFocusDate = addDaysStr(calendarFocusDate, dir*7);
  } else {
    calendarFocusDate = addDaysStr(calendarFocusDate, dir);
  }
  render();
}

let calSelectedDate = null;
const CAL_ICONS = {
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  users:'<circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 010 6M18 14c2 .6 3 2.2 3 4"/>',
  repeat:'<path d="M17 3l4 4-4 4"/><path d="M3 11V9a2 2 0 012-2h16"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 01-2 2H3"/>',
  task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>'
};
function calIcon(n, size){
  return '<svg width="'+(size||13)+'" height="'+(size||13)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+CAL_ICONS[n]+'</svg>';
}
function renderCalendarMonth(body){
  const focusD = new Date(calendarFocusDate + 'T00:00:00');
  const year = focusD.getFullYear(), month = focusD.getMonth();
  const startDay = state.weekStartDay || 0;
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - ((firstOfMonth.getDay() - startDay + 7) % 7));
  const todayS = todayStr();
  const monthPrefix = calendarFocusDate.slice(0, 7);
  if(!calSelectedDate || calSelectedDate.slice(0, 7) !== monthPrefix){
    calSelectedDate = todayS.slice(0, 7) === monthPrefix ? todayS : monthPrefix + '-01';
  }
  const rotatedWeekdayLabels = WEEKDAY_LABELS.slice(startDay).concat(WEEKDAY_LABELS.slice(0, startDay));

  const layout = document.createElement('div');
  layout.className = 'cal-month-layout';
  const card = document.createElement('div');
  card.className = 'cal-month-card';
  const grid = document.createElement('div');
  grid.className = 'cal-month-grid';
  rotatedWeekdayLabels.forEach(l => {
    const h = document.createElement('div');
    h.className = 'cal-month-weekday';
    h.textContent = l;
    grid.appendChild(h);
  });
  for(let i=0;i<42;i++){
    const cellDate = new Date(gridStart); cellDate.setDate(gridStart.getDate()+i);
    const cellStr = dateToStr(cellDate);
    const cell = document.createElement('div');
    const hol = holidayOn(cellStr);
    cell.className = 'cal-month-cell' + (cellDate.getMonth()!==month?' other-month':'') + (cellStr===todayS?' today':'') + (cellStr===calSelectedDate?' selected':'') + (hol?' holiday':'') + ((cellDate.getDay()===0 || cellDate.getDay()===6)?' weekend':'');
    cell.dataset.date = cellStr;
    const dayEvents = getEventsForDate(cellStr);
    let evHtml = '';
    if(dayEvents.length === 1){
      const ev = dayEvents[0];
      evHtml = `<div class="cal-event-pill cal-mpill" style="background:${eventColor(ev)}22; --evc:${eventColor(ev)};">${!ev.allDay && ev.startTime ? `<em>${ev.startTime}</em> ` : ''}${escapeHtml(ev.title||'Sem título')}</div>`;
    } else if(dayEvents.length > 1){
      evHtml = `<div class="cal-month-dots">${dayEvents.slice(0,5).map(ev => `<i style="background:${eventColor(ev)}"></i>`).join('')}${dayEvents.length>5?`<span class="cal-event-more">+${dayEvents.length-5}</span>`:''}</div><div class="cal-month-count">${dayEvents.length} agendas</div>`;
    }
    cell.innerHTML = `<div class="cal-month-daynum"><span>${cellDate.getDate()}</span></div>${hol ? `<div class="cal-hol" title="${escapeHtml(hol.name)}${hol.optional ? ' (ponto facultativo)' : ''}">${HOL_FLAG}<span>${escapeHtml(hol.name)}</span></div>` : ''}${evHtml}`;
    cell.addEventListener('click', () => { calSelectedDate = cellStr; render(); });
    cell.addEventListener('dblclick', () => openEventComposer(null, cellStr));
    grid.appendChild(cell);
  }
  card.appendChild(grid);
  layout.appendChild(card);

  /* painel do dia selecionado */
  const sd = new Date(calSelectedDate + 'T00:00:00');
  const dayEvents = getEventsForDate(calSelectedDate).slice().sort((x, y) => (x.startTime || '') < (y.startTime || '') ? -1 : 1);
  const dayTasks = state.tasks.filter(t => !t.done && t.dueDate === calSelectedDate && (!activeCategoryFilter || t.categoryId === activeCategoryFilter));
  const nEv = dayEvents.length, nTk = dayTasks.length;
  const summary = (nEv + nTk === 0) ? 'Nada marcado para este dia'
    : [nEv ? nEv + (nEv === 1 ? ' agenda' : ' agendas') : '', nTk ? nTk + (nTk === 1 ? ' tarefa' : ' tarefas') : ''].filter(Boolean).join(' · ');
  const panel = document.createElement('div');
  panel.className = 'cal-day-panel';
  panel.innerHTML = `
    <div class="cal-day-panel-kicker">${WEEKDAY_LABELS[sd.getDay()]}${calSelectedDate===todayS?' · hoje':''}</div>
    <div class="cal-day-panel-title">${sd.getDate()} de ${MONTH_LABELS[sd.getMonth()].toLowerCase()}</div>
    <div class="cal-day-panel-sub">${summary}</div>
    ${holidayOn(calSelectedDate) ? `<div class="cal-hol-chip">${HOL_FLAG}${holidayOn(calSelectedDate).name}${holidayOn(calSelectedDate).optional ? ' · facultativo' : ''}</div>` : ''}
    <div class="cal-day-timeline">
      ${dayEvents.map(ev => `
        <div class="cal-day-item" data-event-id="${ev.id}" style="--c:${eventColor(ev)}">
          <b>${escapeHtml(ev.title||'Sem título')}</b>
          <small>
            <span>${calIcon('clock')} ${ev.startTime ? ev.startTime + (ev.endTime ? ' – ' + ev.endTime : '') : 'Dia inteiro'}</span>
            ${(ev.attendees||[]).length ? `<span>${calIcon('users')} ${ev.attendees.length}</span>` : ''}
            ${ev.recurrence && ev.recurrence !== 'none' ? `<span>${calIcon('repeat')} Recorrente</span>` : ''}
          </small>
        </div>`).join('')}
      ${dayTasks.map(t => `
        <div class="cal-day-item task" data-task-id="${t.id}" style="--c:var(--ink-faint)">
          <b>${escapeHtml(t.title||'Sem título')}</b>
          <small><span>${calIcon('task')} Tarefa${t.dueTime ? ' · prazo ' + t.dueTime : ''}</span></small>
        </div>`).join('')}
    </div>
    <button type="button" class="cal-day-add" id="calDayAdd">${calIcon('plus', 15)} Adicionar neste dia</button>`;
  panel.querySelectorAll('[data-event-id]').forEach(el => {
    el.onclick = () => { const ev = state.events.find(x => x.id === el.dataset.eventId); if(ev) openEventComposer(ev); };
  });
  panel.querySelectorAll('[data-task-id]').forEach(el => {
    el.onclick = () => { currentView = 'tasks'; activeTaskId = el.dataset.taskId; creatingNewTask = false; render(); };
  });
  panel.querySelector('#calDayAdd').onclick = () => openEventComposer(null, calSelectedDate);
  layout.appendChild(panel);
  body.appendChild(layout);
}

/* feriados nacionais do Brasil: fixos + os que dependem da Páscoa (calculados, sem serviço externo) */
const HOL_FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
const _holCache = {};
function brHolidays(year){
  if(_holCache[year]) return _holCache[year];
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  const y = year + '-', map = {};
  [['01-01','Confraternização Universal'],['04-21','Tiradentes'],['05-01','Dia do Trabalho'],['09-07','Independência'],['10-12','N. Sra. Aparecida'],['11-02','Finados'],['11-15','Proclamação da República'],['12-25','Natal']].forEach(([md, n]) => { map[y + md] = { name: n }; });
  if(year >= 2024) map[y + '11-20'] = { name: 'Consciência Negra' };
  map[addDaysStr(easter, -2)] = { name: 'Sexta-feira Santa' };
  map[addDaysStr(easter, -48)] = { name: 'Carnaval', optional: true };
  map[addDaysStr(easter, -47)] = { name: 'Carnaval', optional: true };
  map[addDaysStr(easter, 60)] = { name: 'Corpus Christi', optional: true };
  return (_holCache[year] = map);
}
function holidayOn(dateStr){
  if(state.showHolidays === false) return null;
  const h = brHolidays(+dateStr.slice(0, 4))[dateStr] || null;
  if(h && h.optional && state.showOptionalHolidays === false) return null;
  return h;
}

const CAL_HOUR_HEIGHT = 48;
function timeToMinutes(t){
  if(!t) return null;
  const [h,m] = t.split(':').map(Number);
  return h*60 + (m||0);
}

function getCalHourHeight(){
  return state.calendarHourDensity === 'normal' ? 48 : 26;
}
function getCalHourStep(){
  return state.calendarHourDensity === 'normal' ? 1 : 2;
}

const CAL_START_HOUR = 7;
function buildCalSidebar(){
  const side = document.createElement('div');
  side.className = 'cal-side';
  const focusD = new Date(calendarFocusDate + 'T00:00:00');
  const year = focusD.getFullYear(), month = focusD.getMonth();
  const startDay = state.weekStartDay || 0;
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - ((first.getDay() - startDay + 7) % 7));
  const todayS = todayStr();
  const weekStart = startOfWeekStr(calendarFocusDate), weekEnd = addDaysStr(weekStart, 6);
  const initials = WEEKDAY_LABELS.slice(startDay).concat(WEEKDAY_LABELS.slice(0, startDay)).map(l => l.charAt(0));
  let cells = '';
  for(let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const ds = dateToStr(d);
    if(i >= 35 && d.getMonth() !== month) break;
    const has = getEventsForDate(ds).length > 0;
    cells += `<button type="button" class="cal-mini-day${d.getMonth()!==month?' other':''}${ds===todayS?' today':''}${ds>=weekStart&&ds<=weekEnd?' inweek':''}${has?' has':''}" data-date="${ds}">${d.getDate()}</button>`;
  }
  const mini = document.createElement('div');
  mini.className = 'cal-mini';
  mini.innerHTML = `
    <div class="cal-mini-head"><b>${MONTH_LABELS[month]} ${year}</b>
      <span><button type="button" id="calMiniPrev" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><button type="button" id="calMiniNext" aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></span></div>
    <div class="cal-mini-grid">${initials.map(l => `<span class="cal-mini-wd">${l}</span>`).join('')}${cells}</div>`;
  mini.querySelector('#calMiniPrev').onclick = () => { const d = new Date(calendarFocusDate + 'T00:00:00'); d.setDate(1); d.setMonth(d.getMonth()-1); calendarFocusDate = dateToStr(d); render(); };
  mini.querySelector('#calMiniNext').onclick = () => { const d = new Date(calendarFocusDate + 'T00:00:00'); d.setDate(1); d.setMonth(d.getMonth()+1); calendarFocusDate = dateToStr(d); render(); };
  mini.querySelectorAll('.cal-mini-day').forEach(b => { b.onclick = () => { calendarFocusDate = b.dataset.date; render(); }; });
  side.appendChild(mini);

  const agenda = document.createElement('div');
  agenda.className = 'cal-side-agenda';
  const sections = [['Hoje', todayS], ['Amanhã', addDaysStr(todayS, 1)]];
  const sortEv = list => list.slice().sort((x, y) => (x.startTime || '') < (y.startTime || '') ? -1 : 1);
  agenda.innerHTML = sections.map(([label, ds]) => {
    const d = new Date(ds + 'T00:00:00');
    const evs = sortEv(getEventsForDate(ds));
    return `<div class="cal-side-label">${label} · ${d.getDate()} de ${MONTH_LABELS[d.getMonth()].toLowerCase()}</div>` +
      (evs.length ? evs.map(ev => `<div class="cal-side-item" data-event-id="${ev.id}" style="--c:${eventColor(ev)}"><span class="tm">${ev.startTime || 'Dia'}</span><i></i><div><b>${escapeHtml(ev.title||'Sem título')}</b><small>${ev.startTime ? ev.startTime + (ev.endTime ? ' – ' + ev.endTime : '') : 'Dia inteiro'}</small></div></div>`).join('')
        : '<div class="cal-side-empty">Nada marcado</div>');
  }).join('');
  agenda.querySelectorAll('[data-event-id]').forEach(el => {
    el.onclick = () => { const ev = state.events.find(x => x.id === el.dataset.eventId); if(ev) openEventComposer(ev); };
  });
  side.appendChild(agenda);
  return side;
}

function renderCalendarWeek(body){
  const start = startOfWeekStr(calendarFocusDate);
  const todayS = todayStr();
  const days = [];
  for(let i=0;i<7;i++) days.push(addDaysStr(start, i));
  const hourHeight = getCalHourHeight();
  const hourStep = getCalHourStep();

  const wrap = document.createElement('div');
  wrap.className = 'cal-week-wrap';

  const densityRow = document.createElement('div');
  densityRow.className = 'cal-density-row';
  densityRow.innerHTML = `
    <div class="cal-view-toggle">
      <button type="button" data-density="normal" class="${state.calendarHourDensity!=='compact'?'active':''}">Normal</button>
      <button type="button" data-density="compact" class="${state.calendarHourDensity==='compact'?'active':''}">Compacto</button>
    </div>
  `;
  densityRow.querySelectorAll('[data-density]').forEach(btn => {
    btn.onclick = () => {
      state.calendarHourDensity = btn.dataset.density;
      markDirty();
    };
  });
  wrap.appendChild(densityRow);

  const headRow = document.createElement('div');
  headRow.className = 'cal-week-headrow';
  headRow.innerHTML = `<div class="cal-week-gutter-cell"></div>` + days.map(dStr => {
    const d = new Date(dStr+'T00:00:00');
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    const hol = holidayOn(dStr);
    return `<div class="cal-week-colhead${dStr===todayS?' today':''}${isWeekend?' weekend':''}${hol?' holiday':''}"${hol ? ` title="${escapeHtml(hol.name)}${hol.optional ? ' (ponto facultativo)' : ''}"` : ''}>${WEEKDAY_LABELS[d.getDay()]}<span>${d.getDate()}</span></div>`;
  }).join('');
  wrap.appendChild(headRow);

  const alldayRow = document.createElement('div');
  alldayRow.className = 'cal-week-alldayrow';
  /* dia inteiro: agenda de vários dias vira uma barra só atravessando os dias (como no Outlook) */
  const segs = [];
  days.forEach((dStr, i) => {
    const hol = holidayOn(dStr);
    if(hol) segs.push({ ev: { id: 'hol-' + dStr }, hol, start: i, end: i });
    getEventsForDate(dStr).filter(ev => ev.allDay || !ev.startTime).forEach(ev => {
      const open = segs.find(sg => sg.ev.id === ev.id && sg.end === i - 1);
      if(open) open.end = i; else segs.push({ ev, start: i, end: i });
    });
  });
  segs.sort((x, y) => x.start - y.start || (y.end - y.start) - (x.end - x.start));
  const laneEnds = [];
  segs.forEach(sg => {
    let l = laneEnds.findIndex(e => e < sg.start);
    if(l < 0){ l = laneEnds.length; laneEnds.push(-1); }
    laneEnds[l] = sg.end; sg.lane = l;
  });
  const lanes = Math.max(1, laneEnds.length);
  alldayRow.style.gridTemplateRows = `repeat(${lanes}, auto)`;
  alldayRow.innerHTML = `<div class="cal-week-gutter-cell" style="grid-row:1 / span ${lanes}"></div>` + days.map((dStr, i) => {
    const d = new Date(dStr+'T00:00:00');
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    return `<div class="cal-week-allday-cell${isWeekend?' weekend':''}${holidayOn(dStr)?' holiday':''}" style="grid-row:1 / span ${lanes}; grid-column:${i + 2}"></div>`;
  }).join('') + segs.map(sg => {
    if(sg.hol) return `<div class="cal-hol cal-allday-hol" title="${escapeHtml(sg.hol.name)}${sg.hol.optional ? ' (ponto facultativo)' : ''}" style="grid-row:${sg.lane + 1}; grid-column:${sg.start + 2} / ${sg.end + 3};">${HOL_FLAG}<span>${escapeHtml(sg.hol.name)}</span></div>`;
    const ev = sg.ev, c = eventColor(ev), evCat = eventPrimaryTagName(ev);
    return `<div class="cal-event-pill cal-allday-seg" data-event-id="${ev.id}" title="${escapeHtml(ev.title||'Sem título')}" style="grid-row:${sg.lane + 1}; grid-column:${sg.start + 2} / ${sg.end + 3}; background:${c}22; --evc:${c};"><span class="cal-event-title">${escapeHtml(ev.title||'Sem título')}</span><small class="cal-evb-meta"><span class="cal-evb-time">${calIcon('clock')} Dia todo</span>${evCat ? `<span class="cal-evb-cat">${escapeHtml(evCat)}</span>` : ''}</small></div>`;
  }).join('');
  wrap.appendChild(alldayRow);

  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'cal-week-scroll';
  const grid = document.createElement('div');
  grid.className = 'cal-week-hourgrid';

  const gutter = document.createElement('div');
  gutter.className = 'cal-week-gutter';
  for(let h=0; h<24; h+=hourStep){
    const cell = document.createElement('div');
    cell.className = 'cal-week-hour-label';
    cell.style.height = (hourHeight*hourStep) + 'px';
    cell.textContent = String(h).padStart(2,'0')+':00';
    gutter.appendChild(cell);
  }
  grid.appendChild(gutter);

  days.forEach(dStr => {
    const col = document.createElement('div');
    const dObj = new Date(dStr+'T00:00:00');
    const isWeekend = dObj.getDay()===0 || dObj.getDay()===6;
    col.className = 'cal-week-daycol' + (dStr===todayS?' today':'') + (isWeekend?' weekend':'') + (holidayOn(dStr)?' holiday':'');
    col.style.height = (hourHeight*24) + 'px';
    for(let h=0; h<24; h+=hourStep){
      const line = document.createElement('div');
      line.className = 'cal-week-hour-line';
      line.style.top = (h*hourHeight) + 'px';
      col.appendChild(line);
    }
    const timedEvents = getEventsForDate(dStr).filter(ev => !ev.allDay && ev.startTime);
    // agendas que se cruzam no horário dividem o dia em colunas lado a lado
    const slots = timedEvents.map(ev => {
      const s0 = timeToMinutes(ev.startTime);
      return { ev, s: s0, e: Math.max(ev.endTime ? timeToMinutes(ev.endTime) : s0 + 60, s0 + 20), c: 0, n: 1 };
    }).sort((a, b) => a.s - b.s || b.e - a.e);
    let cluster = [], clusterEnd = -1;
    const closeCluster = () => { const n = cluster.reduce((m, x) => Math.max(m, x.c + 1), 1); cluster.forEach(x => { x.n = n; }); cluster = []; clusterEnd = -1; };
    slots.forEach(x => {
      if(cluster.length && x.s >= clusterEnd) closeCluster();
      const used = cluster.filter(y => y.e > x.s).map(y => y.c);
      while(used.includes(x.c)) x.c++;
      cluster.push(x); clusterEnd = Math.max(clusterEnd, x.e);
    });
    closeCluster();
    slots.forEach(({ ev, c: slotCol, n: slotN }) => {
      const startMin = timeToMinutes(ev.startTime);
      const endMin = ev.endTime ? timeToMinutes(ev.endTime) : startMin + 60;
      const top = (startMin/60) * hourHeight;
      const height = Math.max(20, ((endMin-startMin)/60) * hourHeight);
      const block = document.createElement('div');
      block.className = 'cal-event-block-timed';
      block.dataset.eventId = ev.id;
      block.style.top = top+'px';
      block.style.height = height+'px';
      block.style.background = eventColor(ev)+'22';
      block.style.borderColor = eventColor(ev);
      block.style.setProperty('--evc', eventColor(ev));
      if(slotN > 1){
        block.style.left = `calc(${100 / slotN * slotCol}% + 3px)`;
        block.style.right = 'auto';
        block.style.width = `calc(${100 / slotN}% - 5px)`;
        block.classList.add('cols-' + Math.min(slotN, 3));
      }
      const evCat = eventPrimaryTagName(ev);
      const bh = Math.max(20, ((endMin-startMin)/60) * hourHeight);
      block.classList.add(bh < 38 ? 'sz-s' : (bh < 62 ? 'sz-m' : 'sz-l'));
      if(bh >= 90){ block.classList.add('tall'); block.style.setProperty('--tl', Math.max(1, Math.floor((bh - 56) / 17))); }
      block.innerHTML = `<b class="cal-event-title">${escapeHtml(ev.title||'Sem título')}</b><small class="cal-evb-meta"><span class="cal-evb-time">${calIcon('clock')} ${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''}</span>${evCat ? `<span class="cal-evb-cat">${escapeHtml(evCat)}</span>` : ''}</small>`;
      block.onclick = (e) => { e.stopPropagation(); openEventComposer(ev); };
      col.appendChild(block);
    });
    col.addEventListener('click', (e) => {
      if(e.target.closest('.cal-event-block-timed')) return;
      const rect = col.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const hour = Math.max(0, Math.min(23, Math.floor(offsetY / hourHeight)));
      openEventComposer(null, dStr);
    });
    grid.appendChild(col);
  });

  // linha do horário atual
  if(days.includes(todayS)){
    const now = new Date();
    const nowLine = document.createElement('div');
    nowLine.className = 'cal-now-line';
    nowLine.style.top = ((now.getHours()*60 + now.getMinutes())/60 * hourHeight) + 'px';
    grid.appendChild(nowLine);
  }
  scrollWrap.appendChild(grid);
  wrap.appendChild(scrollWrap);
  const layout = document.createElement('div');
  layout.className = 'cal-week-layout';
  layout.appendChild(buildCalSidebar());
  layout.appendChild(wrap);
  body.appendChild(layout);

  alldayRow.querySelectorAll('.cal-event-pill').forEach(pill => {
    pill.onclick = (e) => { e.stopPropagation(); const ev = state.events.find(x=>x.id===pill.dataset.eventId); if(ev) openEventComposer(ev); };
  });

  // a visão semanal sempre abre a partir das 7h (antes disso quase não há agendas).
  // Em telas altas o dia inteiro cabe e não haveria o que rolar: um espaço no fim
  // garante que dê para posicionar o início nas 7h.
  const startOffset = CAL_START_HOUR * hourHeight;
  const needed = startOffset + scrollWrap.clientHeight;
  if(scrollWrap.clientHeight > 0 && scrollWrap.scrollHeight < needed){
    const spacer = document.createElement('div');
    spacer.style.height = (needed - scrollWrap.scrollHeight) + 'px';
    spacer.setAttribute('aria-hidden', 'true');
    scrollWrap.appendChild(spacer);
  }
  scrollWrap.scrollTop = startOffset;
  syncWeekScrollbar();
}
/* a grade de horas tem barra de rolagem e o cabeçalho/dia todo não: compensa a largura para as colunas ficarem alinhadas */
function syncWeekScrollbar(){
  const sc = document.querySelector('.cal-week-scroll'), wr = document.querySelector('.cal-week-wrap');
  if(sc && wr) wr.style.setProperty('--sbw', (sc.offsetWidth - sc.clientWidth) + 'px');
}
window.addEventListener('resize', syncWeekScrollbar);

const WEEKDAY_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function renderCalendarDay(body){
  const dateStr = calendarFocusDate;
  const todayS = todayStr();
  const isToday = dateStr === todayS;
  const d = new Date(dateStr + 'T00:00:00');
  const hourHeight = 56;
  const all = getEventsForDate(dateStr);
  const allDayEvents = all.filter(ev => ev.allDay || !ev.startTime);
  const timed = all.filter(ev => !ev.allDay && ev.startTime).map(ev => {
    const st = timeToMinutes(ev.startTime);
    let en = ev.endTime ? timeToMinutes(ev.endTime) : st + 60;
    if(en <= st) en = st + 30;
    return { ev, st, en };
  }).sort((x, y) => x.st - y.st || x.en - y.en);
  // colunas para agendas que se sobrepõem
  let cluster = [], clusterEnd = -1;
  const flush = () => { const n = cluster.reduce((m, c) => Math.max(m, c.col + 1), 1); cluster.forEach(c => { c.cols = n; }); cluster = []; };
  timed.forEach(it => {
    if(cluster.length && it.st >= clusterEnd) flush();
    const used = cluster.filter(c => c.en > it.st).map(c => c.col);
    let col = 0; while(used.includes(col)) col++;
    it.col = col; cluster.push(it); clusterEnd = Math.max(clusterEnd, it.en);
  });
  if(cluster.length) flush();

  const layout = document.createElement('div');
  layout.className = 'cal-dayA';
  const card = document.createElement('div');
  card.className = 'cal-dayA-card';
  const scroll = document.createElement('div');
  scroll.className = 'cal-dayA-scroll';
  const grid = document.createElement('div');
  grid.className = 'cal-dayA-grid';
  grid.style.height = (hourHeight * 24) + 'px';
  let hoursHtml = '';
  for(let h=0; h<24; h++){
    hoursHtml += `<div class="cal-dayA-hour" style="top:${h*hourHeight}px"><span>${String(h).padStart(2,'0')}:00</span></div>`;
  }
  grid.innerHTML = hoursHtml;
  const lane = document.createElement('div');
  lane.className = 'cal-dayA-lane';
  grid.appendChild(lane);
  timed.forEach(it => {
    const ev = it.ev;
    const cat = catById(ev.categoryId);
    const c = eventColor(ev);
    const blk = document.createElement('div');
    blk.className = 'cal-dayblk';
    blk.dataset.eventId = ev.id;
    const widthPct = 100 / it.cols;
    blk.style.cssText = `top:${it.st/60*hourHeight}px; height:${Math.max((it.en-it.st)/60*hourHeight - 3, 24)}px; left:calc(${it.col*widthPct}% + 2px); width:calc(${widthPct}% - 4px); --c:${c};`;
    const att = (ev.attendees || []).length;
    const blkH = Math.max((it.en-it.st)/60*hourHeight - 3, 24);
    if(blkH >= 84){ blk.classList.add('tall'); blk.style.setProperty('--tl', Math.max(1, Math.floor((blkH - 56) / 19))); }
    blk.innerHTML = `
      <b class="cal-dayblk-title">${escapeHtml(ev.title||'Sem título')}</b>
      <small>
        <span class="cal-dayblk-time">${CAL_ICONS.clock ? calIcon('clock') : ''} ${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''}</span>
        ${att ? `<span>${calIcon('users')} ${att}</span>` : ''}
        ${ev.recurrence && ev.recurrence !== 'none' ? `<span>${calIcon('repeat')} Recorrente</span>` : ''}
        ${eventPrimaryTagName(ev) ? `<span class="cal-dayblk-cat">${escapeHtml(eventPrimaryTagName(ev))}</span>` : ''}
      </small>`;
    blk.onclick = (e) => { e.stopPropagation(); openEventComposer(ev); };
    lane.appendChild(blk);
  });
  if(isToday){
    const now = new Date();
    const line = document.createElement('div');
    line.className = 'cal-now-line cal-dayA-now';
    line.style.top = ((now.getHours()*60 + now.getMinutes())/60 * hourHeight) + 'px';
    grid.appendChild(line);
  }
  grid.addEventListener('click', (e) => {
    if(e.target.closest('.cal-dayblk')) return;
    openEventComposer(null, dateStr);
  });
  scroll.appendChild(grid);
  card.appendChild(scroll);
  layout.appendChild(card);

  /* lateral: resumo do dia, dia inteiro, tarefas */
  const dayTasks = state.tasks.filter(t => !t.done && t.dueDate === dateStr && (!activeCategoryFilter || t.categoryId === activeCategoryFilter));
  const lateTasks = isToday ? state.tasks.filter(t => !t.done && t.dueDate && t.dueDate < todayS && (!activeCategoryFilter || t.categoryId === activeCategoryFilter)) : [];
  const nEv = all.length, nTk = dayTasks.length + lateTasks.length;
  const summary = (nEv + nTk === 0) ? 'Nada marcado para este dia'
    : [nEv ? nEv + (nEv === 1 ? ' agenda' : ' agendas') : '', nTk ? nTk + (nTk === 1 ? ' tarefa' : ' tarefas') : ''].filter(Boolean).join(' · ');
  const taskHtml = (t, late) => `<div class="cal-day-task" data-task-id="${t.id}"><span class="box"></span><div><b>${escapeHtml(t.title||'Sem título')}</b><small class="${late?'late':''}">${late ? 'Atrasada · ' + fmtDate(t.dueDate) : (t.dueTime ? 'Prazo ' + t.dueTime : 'Sem horário')}${(() => { const c = catById(t.categoryId); return c && !late ? ' · ' + escapeHtml(c.name) : ''; })()}</small></div></div>`;
  const side = document.createElement('div');
  side.className = 'cal-day-panel';
  side.innerHTML = `
    <div class="cal-day-panel-kicker">${WEEKDAY_FULL[d.getDay()]}${isToday ? ' · hoje' : ''}</div>
    <div class="cal-day-panel-title">${d.getDate()} de ${MONTH_LABELS[d.getMonth()].toLowerCase()}</div>
    <div class="cal-day-panel-sub">${summary}</div>
    ${holidayOn(dateStr) ? `<div class="cal-hol-chip">${HOL_FLAG}${holidayOn(dateStr).name}${holidayOn(dateStr).optional ? ' · facultativo' : ''}</div>` : ''}
    ${allDayEvents.length ? `<div class="cal-dayA-allday" style="margin-top:14px;">${allDayEvents.map(ev => { const cat = catById(ev.categoryId); return `<button type="button" class="cal-dayA-chip" data-event-id="${ev.id}" style="--c:${eventColor(ev)}"><span>${escapeHtml(ev.title||'Sem título')}</span><small><i>${calIcon('clock')} Dia todo</i>${eventPrimaryTagName(ev) ? `<b>${escapeHtml(eventPrimaryTagName(ev))}</b>` : ''}</small></button>`; }).join('')}</div>` : ''}
    ${nTk ? `<div class="cal-day-panel-kicker" style="margin-top:14px;">Tarefas${isToday ? ' para hoje' : ' do dia'}</div>
      <div class="cal-day-tasks">${dayTasks.map(t => taskHtml(t, false)).join('')}${lateTasks.map(t => taskHtml(t, true)).join('')}</div>` : ''}
    <button type="button" class="cal-day-add" id="calDayAdd" style="margin-top:auto;">${calIcon('plus', 15)} Adicionar neste dia</button>`;
  side.querySelectorAll('[data-event-id]').forEach(el => {
    el.onclick = () => { const ev = state.events.find(x => x.id === el.dataset.eventId); if(ev) openEventComposer(ev); };
  });
  side.querySelectorAll('[data-task-id]').forEach(el => {
    el.onclick = () => { currentView = 'tasks'; activeTaskId = el.dataset.taskId; creatingNewTask = false; render(); };
  });
  side.querySelector('#calDayAdd').onclick = () => openEventComposer(null, dateStr);
  layout.appendChild(side);
  body.appendChild(layout);

  // abre perto do horário atual (hoje) ou das 7h
  const startHour = isToday ? Math.max(0, new Date().getHours() - 2) : CAL_START_HOUR;
  const firstEv = timed.length ? Math.max(0, Math.floor(timed[0].st / 60) - 1) : startHour;
  scroll.scrollTop = (isToday ? Math.min(startHour, firstEv) : Math.min(CAL_START_HOUR, firstEv)) * hourHeight;
}

function addOneHourToTime(timeStr){
  if(!timeStr) return '';
  const [h,m] = timeStr.split(':').map(Number);
  const newH = Math.min((h||0)+1, 23);
  return String(newH).padStart(2,'0') + ':' + String(m||0).padStart(2,'0');
}

function applyTaskDataToEvent(ev, task){
  ev.title = task.title || ev.title;
  ev.tagIds = (task.tagIds||[]).slice();
  ev.date = task.dueDate || ev.date;
  ev.endDate = task.dueDate || ev.date;
  ev.startTime = task.dueTime || '';
  ev.endTime = ev.startTime ? addOneHourToTime(ev.startTime) : '';
  ev.allDay = !task.dueTime;
  ev.description = task.description || ev.description;
}

function nextRoundedHourTimes(){
  const now = new Date();
  let hour = now.getHours();
  if(now.getMinutes() > 0) hour = Math.min(hour + 1, 23);
  const start = String(hour).padStart(2,'0') + ':00';
  const end = String(Math.min(hour + 1, 23)).padStart(2,'0') + ':00';
  return { start, end };
}

function icsDateStamp(dateStr, timeStr){
  const datePart = (dateStr || todayStr()).replace(/-/g, '');
  if(!timeStr) return datePart;
  const timePart = timeStr.replace(':', '') + '00';
  return `${datePart}T${timePart}`;
}
function icsEscape(text){
  return String(text||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function downloadEventAsICS(ev){
  const isAllDay = !!ev.allDay || !ev.startTime;
  const dtStart = isAllDay ? icsDateStamp(ev.date) : icsDateStamp(ev.date, ev.startTime);
  const dtEnd = isAllDay ? icsDateStamp(ev.endDate || ev.date) : icsDateStamp(ev.endDate || ev.date, ev.endTime || ev.startTime);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DOUNO Tasks//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + ev.id + '@taskin',
    'DTSTAMP:' + icsDateStamp(todayStr(), '00:00'),
    isAllDay ? ('DTSTART;VALUE=DATE:' + dtStart) : ('DTSTART:' + dtStart),
    isAllDay ? ('DTEND;VALUE=DATE:' + dtEnd) : ('DTEND:' + dtEnd),
    'SUMMARY:' + icsEscape(ev.title || 'Sem título'),
    ev.description ? ('DESCRIPTION:' + icsEscape(ev.description)) : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (ev.title || 'agenda').replace(/[^\w\-]+/g, '_') + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => { try{ URL.revokeObjectURL(url); }catch(e){} }, 1000);
}

function openEventComposer(existingEvent, defaultDate, prefillTaskId){
  const isEditing = !!existingEvent;
  const defaultTimes = nextRoundedHourTimes();
  /* Edita uma cópia (rascunho): mudar tags/campos e fechar sem salvar não altera a
     agenda real. Ao salvar, o rascunho é aplicado de volta na agenda original. */
  const ev = existingEvent ? JSON.parse(JSON.stringify(existingEvent)) : {
    id: uid('event'), title:'', categoryId: activeCategoryFilter || state.categories[0].id,
    tagIds: [], date: defaultDate || todayStr(), endDate: defaultDate || todayStr(),
    startTime: defaultTimes.start, endTime: defaultTimes.end, allDay:false,
    recurrence:'none', recurrenceInterval:1, recurrenceBaseDate: defaultDate || todayStr(),
    linkedTaskId: null, description:'', createdAt: Date.now()
  };
  if(ev.endDate === undefined) ev.endDate = ev.date;
  if(!isEditing && prefillTaskId){
    const t = state.tasks.find(x => x.id === prefillTaskId);
    if(t){
      ev.linkedTaskId = t.id;
      ev.categoryId = t.categoryId;
      applyTaskDataToEvent(ev, t);
    }
  }
  const modal = document.getElementById('eventComposerModal');

  modal.innerHTML = `
    <div class="ev-flag"></div>
    <button type="button" class="ev-x" id="evCloseX" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="ev-head">
      <div class="ev-kicker">${isEditing?'Editar agenda':'Nova agenda'}</div>
      <input type="text" class="ev-title-input" id="evTitle" placeholder="Nome da agenda" value="${escapeHtml(ev.title||'')}">
      <div class="ev-spacefield" style="position:relative;">
        <label class="tp-label">Espaço</label>
        <div class="cat-tags-combined-row">
          <div class="group-move-row">
            <button type="button" class="move-group-btn" id="evMoveGroupBtn" title="Mover de espaço"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v4M10 13h4"/></svg></button>
            <span class="group-current-chip" id="evGroupChip"></span>
          </div>
          <div class="tp-tags-selected" id="evTagsSelected">
            ${(ev.tagIds||[]).map(id => state.tags.find(tg=>tg.id===id)).filter(Boolean).map(tg => `<span class="tp-tag-chip active" data-tag-id="${tg.id}" title="Clique para remover" style="background:${tg.color}">${escapeHtml(tg.name)}</span>`).join('')}
            <button type="button" class="tp-tags-add-btn" id="evTagsToggleBtn">+ Tag</button>
          </div>
          <span class="ev-space-hint">As tags definem a cor da agenda.</span>
        </div>
      </div>
    </div>
    <div class="ev-cols">
      <div class="ev-col">
        <div class="ev-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>Quando</div>
        <div class="tp-field">
          <div class="ev-daterange-row">
            <div class="ev-daterange-col">
              <label class="tp-label">Início</label>
              <div class="tp-row2">
                <input type="date" class="tp-input" id="evDate" value="${ev.date||''}">
                <input type="time" class="tp-input tp-time-input" id="evStartTime" value="${ev.startTime||''}" style="display:${ev.allDay?'none':'block'};">
              </div>
            </div>
            <div class="ev-daterange-col">
              <label class="tp-label">Fim</label>
              <div class="tp-row2">
                <input type="date" class="tp-input" id="evEndDate" value="${ev.endDate||ev.date||''}">
                <input type="time" class="tp-input tp-time-input" id="evEndTime" value="${ev.endTime||''}" style="display:${ev.allDay?'none':'block'};">
              </div>
            </div>
          </div>
          <div class="ev-dur-row">
            <button type="button" class="ev-dur" data-dur="30">30 min</button>
            <button type="button" class="ev-dur" data-dur="60">1 h</button>
            <button type="button" class="ev-dur" data-dur="90">1 h 30</button>
            <button type="button" class="ev-dur" data-dur="120">2 h</button>
            <label class="ev-allday" id="evAllDayToggleLabel"><span>Dia todo</span>
              <span class="completed-toggle" style="margin-left:0;"><input type="checkbox" id="evAllDay" ${ev.allDay?'checked':''}><span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span></span>
            </label>
          </div>
        </div>
        <div class="tp-field">
          <label class="tp-label">Recorrência</label>
          <button type="button" class="tp-status-trigger" id="evRecurrenceTrigger">
            <svg class="tp-recurrence-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2a4 4 0 014-4h14"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2a4 4 0 01-4 4H3"/></svg>
            <span class="tp-status-trigger-label" id="evRecurrenceTriggerLabel">${recurrenceSummaryLabel(ev)}</span>
            <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
        <div class="tp-field" style="position:relative;">
          <label class="tp-label">Tarefa vinculada <span>(opcional: traz título, tags e horário)</span></label>
          <button type="button" class="tp-status-trigger" id="evLinkedTaskTrigger">
            <span class="tp-status-trigger-label" id="evLinkedTaskLabel"></span>
            <svg class="tp-status-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="ev-col">
        <div class="ev-col-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 010 6M18 14c2 .6 3 2.2 3 4"/></svg>Quem</div>
        <div class="tp-field">
          <label class="tp-label">Convidados <span>(separados por vírgula)</span></label>
          <div class="ev-suggest-wrap">
            <input type="text" class="tp-input" id="evAttendees" autocomplete="off" placeholder="nome@empresa.com, outra@empresa.com" value="${escapeHtml((ev.attendees||[]).join(', '))}">
            <div class="ev-suggest" id="evAttendeesSuggest" role="listbox"></div>
          </div>
          <p id="evAttendeesError" style="display:none; font-size:11.5px; color:var(--danger); margin-top:4px;"></p>
          <label class="ev-invite-row" for="evSendInvite">
            <span>
              <span class="ev-invite-title">Enviar convite pelo Outlook</span>
              <span class="ev-invite-desc" id="evInviteDesc"></span>
            </span>
            <span class="completed-toggle" style="margin-left:0;">
              <input type="checkbox" id="evSendInvite" ${(ev.sendInvite || (!isEditing && outlookStatusCache && outlookStatusCache.connected)) ? 'checked' : ''}>
              <span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span>
            </span>
          </label>
        </div>
        <div class="tp-field">
          <label class="tp-label">Descrição</label>
          <textarea class="tp-textarea" id="evDescription" rows="4" placeholder="Detalhes da agenda...">${escapeHtml(ev.description||'')}</textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${isEditing ? `<button type="button" class="btn ghost small" id="evDeleteBtn" style="margin-right:auto; color:var(--danger); border-color:var(--danger-light);">Excluir</button>` : ''}
      ${isEditing ? `<button type="button" class="btn ghost small" id="evDuplicateBtn" title="Duplicar agenda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Duplicar</button>` : ''}
      ${isEditing ? `<button type="button" class="btn ghost small" id="evExportIcsBtn" title="Exportar convite .ics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>Exportar .ics</button>` : ''}
      <button type="button" class="btn small" id="evSaveBtn">${isEditing?'Salvar':'Criar agenda'}</button>
    </div>
  `;

  function renderEvGroupChip(){
    const cat = catById(ev.categoryId);
    const chip = modal.querySelector('#evGroupChip');
    chip.style.background = cat ? cat.color + '22' : 'var(--surface-2)';
    chip.style.color = cat ? cat.color : 'var(--ink-soft)';
    chip.innerHTML = `<span class="cat-swatch" style="background:${cat?cat.color:'var(--ink-faint)'}"></span>${escapeHtml(cat?cat.name:'Sem espaço')}`;
  }
  renderEvGroupChip();
  modal.querySelector('#evMoveGroupBtn').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, ev.categoryId, (newCatId) => {
      ev.categoryId = newCatId;
      ev.tagIds = (ev.tagIds||[]).filter(id => {
        const tg = state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === newCatId);
      });
      renderEvGroupChip();
      renderEvTagsSelected();
    });
  };

  function renderEvTagsSelected(){
    const box = modal.querySelector('#evTagsSelected');
    const addBtn = box.querySelector('#evTagsToggleBtn');
    box.querySelectorAll('.tp-tag-chip').forEach(el => el.remove());
    (ev.tagIds||[]).map(id => state.tags.find(tg=>tg.id===id)).filter(Boolean).forEach(tg => {
      const chip = document.createElement('span');
      chip.className = 'tp-tag-chip active';
      chip.style.background = tg.color;
      chip.textContent = tg.name;
      chip.title = 'Clique para remover';
      chip.onclick = (e) => {
        e.stopPropagation();
        ev.tagIds = (ev.tagIds||[]).filter(id => id !== tg.id);
        renderEvTagsSelected();
      };
      box.insertBefore(chip, addBtn);
    });
  }
  modal.querySelector('#evTagsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderUnifiedTagPicker(portal, {
      categoryId: ev.categoryId,
      isSelected: (tagId) => (ev.tagIds||[]).includes(tagId),
      onToggle: (tagId) => {
        ev.tagIds = ev.tagIds || [];
        if(ev.tagIds.includes(tagId)) ev.tagIds = ev.tagIds.filter(id => id !== tagId);
        else ev.tagIds.push(tagId);
        renderEvTagsSelected();
      },
      onChanged: () => renderEvTagsSelected()
    });
  };

  // histórico de e-mails: sugere enquanto digita; "×" tira o e-mail do histórico
  (function setupAttendeeSuggest(){
    const input = modal.querySelector('#evAttendees');
    const box = modal.querySelector('#evAttendeesSuggest');
    function tokenInfo(){
      const v = input.value;
      const cut = Math.max(v.lastIndexOf(','), v.lastIndexOf(';'));
      return { head: v.slice(0, cut + 1), token: v.slice(cut + 1).trim() };
    }
    function chosenEmails(){
      return input.value.split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    }
    function renderSuggestions(){
      const t = tokenInfo().token.toLowerCase();
      const taken = new Set(chosenEmails());
      const items = (state.emailHistory || []).filter(e => !taken.has(e) && (!t || e.includes(t))).slice(0, 8);
      if(!items.length){ box.classList.remove('show'); box.innerHTML = ''; return; }
      box.innerHTML = '<div class="ev-suggest-label">E-mails usados antes</div>' + items.map(e =>
        `<div class="ev-suggest-item" data-email="${escapeHtml(e)}" role="option"><span>${escapeHtml(e)}</span><button type="button" class="ev-suggest-del" data-del="${escapeHtml(e)}" title="Excluir do histórico" aria-label="Excluir ${escapeHtml(e)} do histórico">×</button></div>`).join('');
      box.classList.add('show');
    }
    // mousedown (e não click) para o campo não perder o foco antes da escolha
    box.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const del = e.target.closest('.ev-suggest-del');
      if(del){
        state.emailHistory = state.emailHistory.filter(x => x !== del.dataset.del);
        persistOnly();
        renderSuggestions();
        return;
      }
      const item = e.target.closest('.ev-suggest-item');
      if(!item) return;
      const { head } = tokenInfo();
      const sep = head && !/\s$/.test(head) ? ' ' : '';
      input.value = head + sep + item.dataset.email + ', ';
      renderSuggestions();
      input.focus();
    });
    input.addEventListener('input', renderSuggestions);
    input.addEventListener('focus', renderSuggestions);
    input.addEventListener('blur', () => { box.classList.remove('show'); });
    input.addEventListener('keydown', (e) => { if(e.key === 'Escape' && box.classList.contains('show')){ e.stopPropagation(); box.classList.remove('show'); } });
  })();

  function refreshInviteDesc(){
    const d = modal.querySelector('#evInviteDesc');
    if(!d) return;
    const connected = !!(outlookStatusCache && outlookStatusCache.connected);
    d.textContent = connected
      ? 'Ao salvar, o Outlook envia o convite aos convidados e avisa quando a agenda mudar ou for excluída.'
      : 'Conecte o Outlook em Configurações → Integrações para o convite ser enviado.';
  }
  refreshInviteDesc();
  renderEvTagsSelected(); // as tags já existentes passam a poder ser removidas com um clique
  // com o Outlook conectado, agenda nova já vem com "enviar convite" ligado (a menos que a pessoa mexa)
  let inviteTouched = false;
  modal.querySelector('#evSendInvite').addEventListener('change', () => { inviteTouched = true; });
  const applyInviteDefault = () => {
    if(!isEditing && !inviteTouched && outlookStatusCache && outlookStatusCache.connected){
      const cb = modal.querySelector('#evSendInvite'); if(cb) cb.checked = true;
    }
  };
  if(!outlookStatusCache && cloudSession) refreshOutlookStatus().then(() => { refreshInviteDesc(); applyInviteDefault(); }).catch(() => {});

  // atalhos de duração: o fim passa a ser início + duração (no mesmo dia)
  function minutesBetweenInputs(){
    const st = modal.querySelector('#evStartTime').value, en = modal.querySelector('#evEndTime').value;
    if(!st || !en || modal.querySelector('#evDate').value !== modal.querySelector('#evEndDate').value) return null;
    return timeToMinutes(en) - timeToMinutes(st);
  }
  function refreshDurChips(){
    const d = minutesBetweenInputs();
    modal.querySelectorAll('.ev-dur').forEach(b => b.classList.toggle('on', d !== null && parseInt(b.dataset.dur, 10) === d));
  }
  modal.querySelectorAll('.ev-dur').forEach(b => {
    b.onclick = () => {
      const st = modal.querySelector('#evStartTime');
      if(!st.value) st.value = nextRoundedHourTimes().start;
      const total = timeToMinutes(st.value) + parseInt(b.dataset.dur, 10);
      const endMin = Math.min(total, 23 * 60 + 59);
      modal.querySelector('#evEndDate').value = modal.querySelector('#evDate').value;
      modal.querySelector('#evEndTime').value = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
      if(ev.allDay){ modal.querySelector('#evAllDay').checked = false; ev.allDay = false; syncTimeFieldsVisibility(); }
      refreshDurChips();
    };
  });
  ['#evDate', '#evEndDate', '#evStartTime', '#evEndTime'].forEach(sel => modal.querySelector(sel).addEventListener('change', refreshDurChips));
  refreshDurChips();
  modal.querySelector('#evCloseX').onclick = () => closeEventComposer();

  function syncTimeFieldsVisibility(){
    const show = !ev.allDay;
    modal.querySelector('#evStartTime').style.display = show ? 'block' : 'none';
    modal.querySelector('#evEndTime').style.display = show ? 'block' : 'none';
  }
  modal.querySelector('#evAllDay').addEventListener('change', e => {
    ev.allDay = e.target.checked;
    syncTimeFieldsVisibility();
  });
  modal.querySelector('#evDate').addEventListener('change', e => {
    modal.querySelector('#evEndDate').value = e.target.value;
  });
  modal.querySelector('#evStartTime').addEventListener('change', e => {
    const endInput = modal.querySelector('#evEndTime');
    if(e.target.value && !endInput.value){
      endInput.value = addOneHourToTime(e.target.value);
    }
  });

  const evRecurrenceTrigger = modal.querySelector('#evRecurrenceTrigger');
  evRecurrenceTrigger.onclick = (e) => {
    e.stopPropagation();
    openRecurrencePortal(evRecurrenceTrigger, ev, () => {
      const freshLabel = document.getElementById('evRecurrenceTriggerLabel');
      if(freshLabel) freshLabel.textContent = recurrenceSummaryLabel(ev);
    });
  };

  function renderEvLinkedTaskLabel(){
    const label = modal.querySelector('#evLinkedTaskLabel');
    if(!label) return;
    const t = ev.linkedTaskId ? state.tasks.find(x => x.id === ev.linkedTaskId) : null;
    label.textContent = t ? (t.title||'Sem título') : 'Nenhuma tarefa vinculada';
  }
  renderEvLinkedTaskLabel();

  function reloadFieldsFromEv(){
    modal.querySelector('#evTitle').value = ev.title || '';
    modal.querySelector('#evDate').value = ev.date || '';
    modal.querySelector('#evEndDate').value = ev.endDate || ev.date || '';
    modal.querySelector('#evStartTime').value = ev.startTime || '';
    modal.querySelector('#evEndTime').value = ev.endTime || '';
    modal.querySelector('#evAllDay').checked = !!ev.allDay;
    syncTimeFieldsVisibility();
    renderEvTagsSelected();
  }

  modal.querySelector('#evLinkedTaskTrigger').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderTaskLinkPicker(portal, {
      currentTaskId: ev.linkedTaskId,
      onSelect: (taskId) => {
        // Só sincroniza data/hora da tarefa quando a agenda nasce a partir da tarefa
        // (fluxo prefillTaskId, acima). Vincular uma tarefa a uma agenda já existente
        // aqui no calendário nunca deve sobrescrever a data que o usuário já definiu.
        ev.linkedTaskId = taskId;
        renderEvLinkedTaskLabel();
        reloadFieldsFromEv();
        closeTagsPortal();
      }
    });
  };

  if(isEditing){
    modal.querySelector('#evDeleteBtn').onclick = (e) => {
      e.stopPropagation();
      openConfirmPortal(e.currentTarget, 'Excluir esta agenda?', () => {
        deleteEventFromOutlook(ev);
        state.events = state.events.filter(x => x.id !== ev.id);
        closeEventComposer();
        markDirty();
      });
    };
    modal.querySelector('#evDuplicateBtn').onclick = (e) => {
      e.stopPropagation();
      const dup = {
        ...ev,
        id: uid('event'),
        title: ev.title ? ev.title + ' (cópia)' : '',
        linkedTaskId: null,
        outlookEventId: null,
        createdAt: Date.now(),
      };
      state.events.push(dup);
      markDirty();
      closeEventComposer();
      // Reabre já editando a copia, com a mesma data de origem - o usuario troca a
      // data direto no campo do formulario, que ja abre em foco nesse fluxo de edicao.
      openEventComposer(dup);
    };
    modal.querySelector('#evExportIcsBtn').onclick = (e) => {
      e.stopPropagation();
      downloadEventAsICS(ev);
    };
  }

  modal.querySelector('#evSaveBtn').onclick = () => {
    const rawAttendees = modal.querySelector('#evAttendees').value.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
    const badEmails = rawAttendees.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    const errEl = modal.querySelector('#evAttendeesError');
    if(badEmails.length){
      errEl.textContent = 'E-mail inválido: ' + badEmails.join(', ');
      errEl.style.display = 'block';
      modal.querySelector('#evAttendees').focus();
      return;
    }
    errEl.style.display = 'none';
    ev.attendees = Array.from(new Set(rawAttendees.map(x => x.toLowerCase())));
    // histórico de e-mails: os mais recentes primeiro, sem repetir (até 100)
    state.emailHistory = ev.attendees.concat((state.emailHistory || []).filter(x => !ev.attendees.includes(x))).slice(0, 100);
    ev.sendInvite = modal.querySelector('#evSendInvite').checked && ev.attendees.length > 0;
    ev.title = modal.querySelector('#evTitle').value.trim();
    ev.date = modal.querySelector('#evDate').value || todayStr();
    ev.endDate = modal.querySelector('#evEndDate').value || ev.date;
    ev.startTime = modal.querySelector('#evStartTime').value || '';
    ev.endTime = modal.querySelector('#evEndTime').value || '';
    ev.description = modal.querySelector('#evDescription').value;
    ev.updatedAt = Date.now();
    ev.wasEdited = isEditing;
    if(ev.recurrence && ev.recurrence !== 'none') ev.recurrenceBaseDate = ev.date;
    let target = ev;
    if(isEditing){
      target = existingEvent;
      Object.keys(target).forEach(k => { if(!(k in ev)) delete target[k]; });
      Object.assign(target, ev);
    } else {
      state.events.push(ev);
    }
    closeEventComposer();
    markDirty();
    syncEventToOutlook(target);
  };

  document.getElementById('eventComposerOverlay').classList.add('show');
  setTimeout(() => modal.querySelector('#evTitle').focus(), 0);
}

function closeEventComposer(){
  document.getElementById('eventComposerOverlay').classList.remove('show');
}

let eventOverlayMouseDownOnBackdrop = false;
document.getElementById('eventComposerOverlay').addEventListener('mousedown', e => {
  eventOverlayMouseDownOnBackdrop = (e.target.id === 'eventComposerOverlay');
});
document.getElementById('eventComposerOverlay').addEventListener('click', e => {
  if(e.target.id === 'eventComposerOverlay' && eventOverlayMouseDownOnBackdrop) closeEventComposer();
});

function noteSpaceKey(){ return activeCategoryFilter || '_all'; }
let lastRenderedNoteSpaceKey = null;

function closeNotebookMenu(){
  const m = document.getElementById('notebookMenuPopover');
  if(m) m.remove();
}

function renderNotes(){
  const view = document.getElementById('notesView');
  const titleWasFocused = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('note-title');
  const titleCursor = titleWasFocused ? document.activeElement.selectionStart : null;
  view.innerHTML = '';

  const term = searchTerm.trim().toLowerCase();
  function matches(n){
    if(term && !(n.title + stripHtml(n.body)).toLowerCase().includes(term)) return false;
    return true;
  }

  const spaceNotebooks = state.notebooks
    .filter(nb => !activeCategoryFilter || nb.categoryId === activeCategoryFilter)
    .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));

  // se o espaço mudou desde o último render, soltar a nota ativa para restaurar a do novo espaço
  if(lastRenderedNoteSpaceKey !== null && lastRenderedNoteSpaceKey !== noteSpaceKey()){
    if(currentNoteComposerCommit) currentNoteComposerCommit();
    activeNoteId = null;
    creatingNewNote = false;
  }
  lastRenderedNoteSpaceKey = noteSpaceKey();

  // restaurar última nota aberta deste espaço, se ainda não houver nota/edição ativa
  if(!activeNoteId && !creatingNewNote){
    const lastId = state.lastActiveNoteBySpace[noteSpaceKey()];
    if(lastId){
      const n = state.notes.find(x => x.id === lastId && !x.archived && (!activeCategoryFilter || x.categoryId === activeCategoryFilter));
      if(n){ activeNoteId = n.id; if(n.notebookId) expandedNotebookIds.add(n.notebookId); }
    }
  }
  if(activeNoteId) state.lastActiveNoteBySpace[noteSpaceKey()] = activeNoteId;

  const layout = document.createElement('div');
  layout.className = 'notes-layout';

  const notebooksCol = document.createElement('div');
  notebooksCol.className = 'notebooks-col';
  notebooksCol.style.width = (state.notebooksColWidth || 260) + 'px';
  function noteOrderOf(n){ return n.noteOrder!=null ? n.noteOrder : (n.createdAt||0); }
  function notebookGroupHtml(nb){
    const nbNotes = state.notes.filter(n => n.notebookId === nb.id && !n.archived && matches(n))
      .sort((a,b) => (b.pinned - a.pinned) || (noteOrderOf(a) - noteOrderOf(b)));
    const expanded = expandedNotebookIds.has(nb.id);
    return `
      <div class="notebook-group">
        <div class="notebook-row" data-nb-id="${nb.id}" draggable="true">
          <svg class="notebook-chevron ${expanded?'expanded':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          <svg class="notebook-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span class="notebook-name">${escapeHtml(nb.name && nb.name.trim() ? nb.name : 'Caderno sem nome')}</span>
          <span class="notebook-count">${nbNotes.length}</span>
          <button type="button" class="notebook-menu-btn" data-nb-id="${nb.id}" title="Opções"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg></button>
        </div>
        ${expanded ? `
        <div class="notebook-notes" data-nb-id="${nb.id}">
          ${nbNotes.map(n => `<div class="notebook-note-item ${n.id===activeNoteId?'active':''} ${n.pinned?'is-pinned':''}" data-note-id="${n.id}" draggable="true"><button type="button" class="nb-note-pin-btn ${n.pinned?'pinned':''}" data-pin-note-id="${n.id}" title="${n.pinned?'Desafixar':'Fixar'}">${pinIconSvg(n.pinned)}</button><span>${escapeHtml(n.title||'Sem título')}</span></div>`).join('')}
          <button type="button" class="notebook-add-note-btn" data-nb-id="${nb.id}">+ Nova nota</button>
        </div>` : ''}
      </div>
    `;
  }
  let nbHtml = '';
  if(activeCategoryFilter){
    spaceNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
  } else {
    // sem filtro de espaço: agrupar os cadernos por espaço, mantendo a estrutura de cada um separada
    state.categories.forEach(cat => {
      const catNotebooks = spaceNotebooks.filter(nb => nb.categoryId === cat.id);
      if(catNotebooks.length === 0) return;
      nbHtml += `<div class="notebooks-space-header"><span class="cat-swatch" style="background:${cat.color}"></span>${escapeHtml(cat.name)}</div>`;
      catNotebooks.forEach(nb => { nbHtml += notebookGroupHtml(nb); });
    });
  }
  notebooksCol.innerHTML = `
    <div class="notebooks-col-header-row">
      <div class="notebooks-col-header">Cadernos</div>
      <button type="button" class="notebook-new-btn-top" id="newNotebookBtn" title="Novo caderno">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <button type="button" class="notebooks-col-close" id="notebooksColCloseBtn" title="Fechar" aria-label="Fechar cadernos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="notebooks-list">${nbHtml}</div>
    <div class="notebooks-col-resize-handle" id="notebooksColResizeHandle" title="Arrastar para redimensionar"></div>
  `;
  notebooksCol.classList.toggle('open', notesDrawerOpen);
  const resizeHandle = notebooksCol.querySelector('#notebooksColResizeHandle');
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = notebooksCol.getBoundingClientRect().width;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    function onMove(e2){
      const newWidth = Math.min(480, Math.max(200, startWidth + (e2.clientX - startX)));
      notebooksCol.style.width = newWidth + 'px';
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      resizeHandle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      state.notebooksColWidth = Math.round(notebooksCol.getBoundingClientRect().width);
      persistOnly();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  const detailCol = document.createElement('div');
  detailCol.className = 'note-detail-col';
  const activeNote = activeNoteId ? state.notes.find(n => n.id === activeNoteId) : null;
  if(activeNote){
    const { element, commit } = buildNoteComposer(activeNote);
    currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
  } else if(creatingNewNote){
    const { element, commit } = buildNoteComposer(null, pendingNotePrefillTaskId, pendingNoteNotebookId);
    currentNoteComposerCommit = commit;
    detailCol.appendChild(element);
    setTimeout(() => { const t = element.querySelector('.note-title'); if(t) t.focus(); }, 0);
  } else {
    currentNoteComposerCommit = null;
    detailCol.innerHTML = `<div class="note-detail-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
      <p>Selecione uma nota na lista de cadernos, ou crie uma nova para começar.</p>
    </div>`;
  }

  // barra do celular: caderno/nota atuais abrem a gaveta de cadernos; botão de modo foco
  const barNotebook = activeNote ? state.notebooks.find(x => x.id === activeNote.notebookId)
    : (creatingNewNote && pendingNoteNotebookId ? state.notebooks.find(x => x.id === pendingNoteNotebookId) : null);
  const barNoteTitle = activeNote ? (activeNote.title || 'Sem título') : (creatingNewNote ? 'Nova nota' : '');
  const mbar = document.createElement('div');
  mbar.className = 'notes-mbar';
  mbar.innerHTML = `
    <button type="button" class="notes-mbar-pill" id="notesDrawerBtn" aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      <span class="mb-text">${escapeHtml(barNotebook ? (barNotebook.name && barNotebook.name.trim() ? barNotebook.name : 'Caderno sem nome') : 'Cadernos')}${barNoteTitle ? ` <span class="mb-note">› ${escapeHtml(barNoteTitle)}</span>` : ''}</span>
      <svg class="mb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <button type="button" class="notes-mbar-focus" id="notesFocusBtn" title="Modo foco" aria-label="Modo foco">
      <svg class="ico-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
      <svg class="ico-collapse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
    </button>`;
  const drawerBackdrop = document.createElement('div');
  drawerBackdrop.className = 'notes-drawer-backdrop' + (notesDrawerOpen ? ' open' : '');
  function setDrawer(open){
    notesDrawerOpen = open;
    notebooksCol.classList.toggle('open', open);
    drawerBackdrop.classList.toggle('open', open);
  }
  mbar.querySelector('#notesDrawerBtn').onclick = () => setDrawer(!notesDrawerOpen);
  mbar.querySelector('#notesFocusBtn').onclick = () => {
    notesFocusMode = !notesFocusMode;
    document.body.classList.toggle('notes-focus', notesFocusMode);
  };
  drawerBackdrop.onclick = () => setDrawer(false);
  notebooksCol.querySelector('#notebooksColCloseBtn').onclick = () => setDrawer(false);

  layout.appendChild(mbar);
  layout.appendChild(notebooksCol);
  layout.appendChild(drawerBackdrop);
  layout.appendChild(detailCol);
  view.appendChild(layout);
  if(titleWasFocused){
    const newTitle = detailCol.querySelector('.note-title');
    if(newTitle){
      newTitle.focus();
      if(titleCursor != null) newTitle.setSelectionRange(titleCursor, titleCursor);
    }
  }

  function selectNote(noteId){
    if(currentNoteComposerCommit) currentNoteComposerCommit();
    activeNoteId = noteId;
    creatingNewNote = false;
    notesDrawerOpen = false;
    state.lastActiveNoteBySpace[noteSpaceKey()] = noteId;
    markDirty();
    renderNotes();
  }

  notebooksCol.querySelectorAll('.notebook-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if(e.target.closest('.notebook-menu-btn')) return;
      const id = row.dataset.nbId;
      if(expandedNotebookIds.has(id)) expandedNotebookIds.delete(id);
      else expandedNotebookIds.add(id);
      renderNotes();
    });
    row.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      draggedNotebookId = row.dataset.nbId;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      draggedNotebookId = null;
      row.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before','drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if(draggedNoteId){
        e.preventDefault();
        row.classList.add('drag-over');
      } else if(draggedNotebookId && draggedNotebookId !== row.dataset.nbId){
        e.preventDefault();
        const rect = row.getBoundingClientRect();
        const isBefore = (e.clientY - rect.top) < rect.height/2;
        row.classList.toggle('drop-before', isBefore);
        row.classList.toggle('drop-after', !isBefore);
      }
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over','drop-before','drop-after'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const isBefore = row.classList.contains('drop-before');
      row.classList.remove('drag-over','drop-before','drop-after');
      if(draggedNoteId){
        const n = state.notes.find(x => x.id === draggedNoteId);
        const nb = state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!n || !nb || n.notebookId === nb.id) return;
        if(currentNoteComposerCommit) currentNoteComposerCommit();
        n.notebookId = nb.id;
        n.categoryId = nb.categoryId;
        expandedNotebookIds.add(nb.id);
        markDirty();
        renderNotes();
      } else if(draggedNotebookId && draggedNotebookId !== row.dataset.nbId){
        const draggedNb = state.notebooks.find(x => x.id === draggedNotebookId);
        const targetNb = state.notebooks.find(x => x.id === row.dataset.nbId);
        if(!draggedNb || !targetNb || draggedNb.categoryId !== targetNb.categoryId) return;
        const siblingsSorted = state.notebooks.filter(x => x.categoryId === targetNb.categoryId)
          .sort((a,b) => (a.notebookOrder!=null?a.notebookOrder:(a.createdAt||0)) - (b.notebookOrder!=null?b.notebookOrder:(b.createdAt||0)));
        const withoutDragged = siblingsSorted.filter(x => x.id !== draggedNb.id);
        let idx = withoutDragged.findIndex(x => x.id === targetNb.id);
        if(idx < 0) idx = withoutDragged.length;
        if(!isBefore) idx += 1;
        withoutDragged.splice(idx, 0, draggedNb);
        withoutDragged.forEach((x,i) => { x.notebookOrder = i; });
        markDirty();
        renderNotes();
      }
    });
  });
  notebooksCol.querySelectorAll('.notebook-note-item[data-note-id]').forEach(item => {
    item.addEventListener('click', () => selectNote(item.dataset.noteId));
    item.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      draggedNoteId = item.dataset.noteId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      draggedNoteId = null;
      item.classList.remove('dragging');
      notebooksCol.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(el => el.classList.remove('drag-over','drop-before','drop-after'));
    });
    item.addEventListener('dragover', (e) => {
      if(!draggedNoteId || draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = item.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < rect.height/2;
      item.classList.toggle('drop-before', isBefore);
      item.classList.toggle('drop-after', !isBefore);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-before','drop-after'));
    item.addEventListener('drop', (e) => {
      if(!draggedNoteId || draggedNoteId === item.dataset.noteId) return;
      e.preventDefault();
      e.stopPropagation();
      const isBefore = item.classList.contains('drop-before');
      item.classList.remove('drop-before','drop-after');
      const targetNote = state.notes.find(n => n.id === item.dataset.noteId);
      const draggedNote = state.notes.find(n => n.id === draggedNoteId);
      if(!targetNote || !draggedNote) return;
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      draggedNote.notebookId = targetNote.notebookId;
      draggedNote.categoryId = targetNote.categoryId;
      const nbNotesSorted = state.notes.filter(n => n.notebookId === targetNote.notebookId && !n.archived)
        .sort((a,b) => (b.pinned - a.pinned) || (noteOrderOf(a) - noteOrderOf(b)));
      const withoutDragged = nbNotesSorted.filter(n => n.id !== draggedNote.id);
      let idx = withoutDragged.findIndex(n => n.id === targetNote.id);
      if(idx < 0) idx = withoutDragged.length;
      if(!isBefore) idx += 1;
      withoutDragged.splice(idx, 0, draggedNote);
      withoutDragged.forEach((n,i) => { n.noteOrder = i; });
      expandedNotebookIds.add(targetNote.notebookId);
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.nb-note-pin-btn[data-pin-note-id]').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = state.notes.find(x => x.id === pin.dataset.pinNoteId);
      if(!n) return;
      n.pinned = !n.pinned;
      n.pinnedAt = n.pinned ? Date.now() : null;
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      markDirty();
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-add-note-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(currentNoteComposerCommit) currentNoteComposerCommit();
      activeNoteId = null;
      creatingNewNote = true;
      pendingNotePrefillTaskId = null;
      pendingNoteNotebookId = btn.dataset.nbId;
      expandedNotebookIds.add(btn.dataset.nbId);
      notesDrawerOpen = false;
      renderNotes();
    });
  });
  notebooksCol.querySelectorAll('.notebook-menu-btn[data-nb-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('notebookMenuPopover');
      closeNotebookMenu();
      if(existing && existing.dataset.nbId === btn.dataset.nbId) return;
      const nb = state.notebooks.find(x => x.id === btn.dataset.nbId);
      if(!nb) return;
      const pop = document.createElement('div');
      pop.id = 'notebookMenuPopover';
      pop.className = 'task-menu-portal show';
      pop.dataset.nbId = nb.id;
      pop.innerHTML = `
        <button type="button" class="task-menu-item" data-act="rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Renomear</button>
        <button type="button" class="task-menu-item" data-act="move-space"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>Mover de Espaço</button>
        <button type="button" class="task-menu-item danger" data-act="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>Excluir caderno</button>
      `;
      document.body.appendChild(pop);
      const r = btn.getBoundingClientRect();
      pop.style.left = Math.min(r.left, window.innerWidth - 190) + 'px';
      pop.style.top = (r.bottom + 4) + 'px';
      pop.onclick = e2 => e2.stopPropagation();
      pop.querySelector('[data-act=move-space]').onclick = (e2) => {
        openMoveGroupPortal(e2.currentTarget, nb.categoryId, (newCatId) => {
          nb.categoryId = newCatId;
          state.notes.forEach(n => { if(n.notebookId === nb.id) n.categoryId = newCatId; });
          closeNotebookMenu();
          markDirty();
          renderNotes();
        });
      };
      pop.querySelector('[data-act=rename]').onclick = () => {
        closeNotebookMenu();
        const row = notebooksCol.querySelector(`.notebook-row[data-nb-id="${nb.id}"] .notebook-name`);
        if(!row) return;
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'notebook-rename-input'; input.value = nb.name;
        row.replaceWith(input);
        input.focus(); input.select();
        const finish = () => {
          const v = input.value.trim();
          if(v) nb.name = v;
          markDirty();
          renderNotes();
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', e2 => { if(e2.key==='Enter') input.blur(); if(e2.key==='Escape'){ input.value = nb.name; input.blur(); } });
        input.addEventListener('click', e2 => e2.stopPropagation());
      };
      pop.querySelector('[data-act=delete]').onclick = () => {
        closeNotebookMenu();
        openConfirmPortal(btn, `Excluir o caderno "${nb.name}"? As notas dele ficarão sem caderno.`, () => {
          state.notes.forEach(n => { if(n.notebookId === nb.id) n.notebookId = null; });
          state.notebooks = state.notebooks.filter(x => x.id !== nb.id);
          if(activeNote && activeNote.notebookId === nb.id){ activeNoteId = null; }
          markDirty();
          renderNotes();
        });
      };
    });
  });
  document.getElementById('newNotebookBtn').onclick = () => {
    const catId = activeCategoryFilter || state.categories[0].id;
    const nb = { id: uid('nb'), name: 'Novo caderno', categoryId: catId, createdAt: Date.now() };
    state.notebooks.push(nb);
    expandedNotebookIds.add(nb.id);
    markDirty();
    renderNotes();
  };
}

function initials(name){
  const parts = (name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length === 0) return '?';
  return parts.slice(0,2).map(p=>p[0].toUpperCase()).join('');
}

function genericAvatarSvg(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
function avatarInnerHtml(profile){
  if(profile.avatar) return `<img src="${profile.avatar}" alt="">`;
  return genericAvatarSvg();
}

function renderProfileCard(){
  const html = avatarInnerHtml(state.profile);
  const avatarTop = document.getElementById('profileAvatarTopbar');
  const avatarDrop = document.getElementById('profileAvatarDropdown');
  if(avatarTop) avatarTop.innerHTML = html;
  if(avatarDrop) avatarDrop.innerHTML = html;
  const nameEl = document.getElementById('profileNameDropdown');
  const emailEl = document.getElementById('profileEmailDropdown');
  if(nameEl) nameEl.textContent = state.profile.name || 'Seu nome';
  if(emailEl) emailEl.textContent = state.profile.email || 'seu@email.com';
  const chipNameEl = document.getElementById('topbarProfileName');
  if(chipNameEl) chipNameEl.textContent = state.profile.name || 'Conta';
}

let tempAvatarData = null;
let settingsTab = 'perfil';

const SETTINGS_NAV_ICONS = {
  perfil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  personalizacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  categorias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
  tags: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l5.6-5.59a2 2 0 000-2.82z"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>',
  arquivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
  integracoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/></svg>',
  templates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
};
const SETTINGS_NAV_LABELS = { perfil:'Perfil', personalizacao:'Personalização', categorias:'Espaços', tags:'Tags', templates:'Templates', arquivo:'Arquivo', integracoes:'Integrações' };
/* Agrupa o conteúdo do painel em cartões, um por assunto (cada título/cabeçalho abre um cartão novo).
   Os elementos são movidos, não recriados, então os eventos continuam valendo. */
function cardifySettingsPanel(panel){
  const kids = Array.from(panel.children);
  if(!kids.length || kids.some(k => k.classList.contains('settings-card'))) return;
  const isStart = el => el.matches('h3.settings-section-title, .settings-section-header-row');
  const groups = [];
  let cur = null;
  kids.forEach(k => {
    if(!cur || (isStart(k) && cur.hasStart)){ cur = { nodes: [], hasStart: false }; groups.push(cur); }
    if(isStart(k)) cur.hasStart = true;
    cur.nodes.push(k);
  });
  groups.forEach(g => {
    const card = document.createElement('div');
    card.className = 'settings-card';
    panel.insertBefore(card, g.nodes[0]);
    g.nodes.forEach(n => card.appendChild(n));
  });
}
function renderSettingsView(){
  const view = document.getElementById('settingsView');
  view.innerHTML = `
    <div class="settings-layout">
      <div class="settings-nav">
        ${Object.keys(SETTINGS_NAV_LABELS).map(key => `
          <button class="settings-nav-item" data-tab="${key}">${SETTINGS_NAV_ICONS[key]}${SETTINGS_NAV_LABELS[key]}</button>
        `).join('')}
      </div>
      <div class="settings-panel" id="settingsPanel"></div>
    </div>
  `;
  view.querySelectorAll('.settings-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === settingsTab);
    btn.onclick = () => { settingsTab = btn.dataset.tab; renderSettingsView(); };
  });
  const panel = document.getElementById('settingsPanel');
  if(settingsTab === 'categorias') renderCategoriesPanel(panel);
  else if(settingsTab === 'tags') renderTagsPanel(panel);
  else if(settingsTab === 'templates') renderTemplatesPanel(panel);
  else if(settingsTab === 'arquivo') renderFilePanel(panel);
  else if(settingsTab === 'personalizacao') renderPersonalizationPanel(panel);
  else if(settingsTab === 'integracoes') renderIntegrationsPanel(panel);
  else renderProfilePanel(panel);
  // sempre que o painel for redesenhado (ex.: ao adicionar um espaço), reagrupa em cartões
  cardifySettingsPanel(panel);
  const settingsObs = new MutationObserver(() => { settingsObs.disconnect(); cardifySettingsPanel(panel); settingsObs.observe(panel, { childList: true }); });
  settingsObs.observe(panel, { childList: true });
}

