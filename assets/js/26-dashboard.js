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
