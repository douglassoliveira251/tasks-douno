import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { catById, completeRecurring, dateToStr, escapeHtml, fmtDate, todayStr } from './10-helpers.js';
import { PRIORITY_CONFIG } from './12-render-tasks.js';
import { MONTH_LABELS, WEEKDAY_LABELS, addDaysStr, eventStartsOn, eventsOnDate } from './25-calendario.js';
import { openEventComposer } from './28-calendario-eventos.js';
import { defaultProjectTab, projectById, projectColor, projectIconSvg, projectStatus } from './31-projetos.js';
import { getOrderedCategories } from './38-configuracoes-espacos-e-etiquetas.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';
import { bindOnboardingCard, onboardingCardHtml } from './51-primeiro-uso.js';
import { PAINEL_INICIO, PERIODOS } from './estado-ui.js';
import { bindLineChart, buildSeries } from './26-dashboard-grafico.js';

/* ===================== DASHBOARD (Visão geral) ===================== */
/* Período escolhido no filtro do topo: [início, fim] em AAAA-MM-DD e o período anterior, do mesmo tamanho. */
export function periodRange(todayS, key){
  let start;
  if(key === 'semana') start = addDaysStr(todayS, -6);
  else if(key === '30') start = addDaysStr(todayS, -29);
  else if(key === '90') start = addDaysStr(todayS, -89);
  else start = todayS.slice(0, 8) + '01';
  const days = Math.round((Date.parse(todayS) - Date.parse(start)) / 86400000) + 1;
  const prevEnd = addDaysStr(start, -1);
  const prevStart = addDaysStr(start, -days);
  return { start, end: todayS, days, prevStart, prevEnd };
}

/* Marca a tarefa como concluída (ou reabre) direto do painel, igual ao círculo da lista de tarefas. */
function toggleTaskFromDashboard(t){
  const wasDone = t.done;
  const prevStatus = t.status;
  t.done = !t.done;
  t.status = t.done ? 'concluida' : 'nao_iniciado';
  t.completedAt = t.done ? Date.now() : null;
  if(t.done) t.pinned = false;
  if(!wasDone && t.done && t.recurrence && t.recurrence !== 'none'){
    const next = completeRecurring(t, prevStatus);
    if(next) G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
  }
  markDirty();
}

export function renderDashboard(){
  const view = document.getElementById('dashboardView');
  const todayS = todayStr();
  const inSpace = x => !G.dashboardSpace || x.categoryId === G.dashboardSpace;
  const scopeTasks = G.state.tasks.filter(inSpace);
  const scopeEvents = G.state.events.filter(inSpace);
  const scopeLog = (G.state.completedLog || []).filter(inSpace);
  const completed = scopeTasks.filter(t => t.done).concat(scopeLog);
  const now = Date.now();
  const DAY = 86400000;

  const open = scopeTasks.filter(t => !t.done);
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayS);
  const dueToday = open.filter(t => t.dueDate === todayS);
  const noDue = open.filter(t => !t.dueDate);
  const noFollow = open.filter(t => !t.followUpDate);
  const todayEvents = eventsOnDate(scopeEvents, todayS);
  const inProgress = open.filter(t => t.status === 'em_andamento');
  const pctOf = n => open.length ? Math.round(n / open.length * 100) : 0;

  const completedLast7 = completed.filter(t => t.completedAt && t.completedAt >= now - 7 * DAY);
  const completedPrev7 = completed.filter(t => t.completedAt && t.completedAt >= now - 14 * DAY && t.completedAt < now - 7 * DAY);

  const upcomingTasks = open.filter(t => t.dueDate && t.dueDate >= todayS && t.dueDate <= addDaysStr(todayS, 7))
    .sort((x, y) => (x.dueDate + (x.dueTime || '99:99')).localeCompare(y.dueDate + (y.dueTime || '99:99')));
  const prStatus = (G.state.projects || []).filter(p => !G.dashboardSpace || p.categoryId === G.dashboardSpace).map(p => ({ p, st: projectStatus(p) }));
  const lateProjects = prStatus.filter(x => x.st.late).length;
  const importantTasks = open.filter(t => t.priority === 'alta' || t.priority === 'critica')
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const spaceList = getOrderedCategories();
  const dateOfDay = d => dateToStr(new Date(d));

  /* ---- período escolhido no topo ---- */
  const per = periodRange(todayS, PAINEL_INICIO.periodo);
  const perDef = PERIODOS.find(p => p.key === PAINEL_INICIO.periodo) || PERIODOS[1];
  const inRange = (t, a, b) => { if(!t.completedAt) return false; const d = dateOfDay(t.completedAt); return d >= a && d <= b; };
  const donePeriod = completed.filter(t => inRange(t, per.start, per.end));
  const donePrev = completed.filter(t => inRange(t, per.prevStart, per.prevEnd));
  const periodTrend = donePrev.length ? Math.round((donePeriod.length - donePrev.length) / donePrev.length * 100) : null;

  /* conclusões por dia da semana (seg → dom) dentro do período */
  const wk = [0, 0, 0, 0, 0, 0, 0];
  donePeriod.forEach(t => { wk[(new Date(t.completedAt).getDay() + 6) % 7]++; });
  const wkLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const wkMax = Math.max(1, ...wk);
  const wkToday = (new Date().getDay() + 6) % 7;
  const bestIdx = wk.indexOf(Math.max(...wk));
  const bestLabel = Math.max(...wk) > 0 ? wkLabels[bestIdx] + ' · ' + wk[bestIdx] : '—';
  const avgPerDay = per.days ? (donePeriod.length / per.days) : 0;
  let streak = 0;
  for(let i = 0; i < 365; i++){
    const dStr = addDaysStr(todayS, -i);
    if(completed.some(t => t.completedAt && dateOfDay(t.completedAt) === dStr)) streak++;
    else if(i === 0) continue;
    else break;
  }

  /* ---- status das tarefas (rosca) ---- */
  const stOver = overdue.length;
  const stProg = open.filter(t => t.status === 'em_andamento' && !(t.dueDate && t.dueDate < todayS)).length;
  const stPend = Math.max(0, open.length - stOver - stProg);
  const stDone = donePeriod.length;
  const stBuckets = [
    { label: 'Em andamento', n: stProg, color: 'var(--primary)' },
    { label: 'Não iniciadas', n: stPend, color: 'var(--dv-pend)' },
    { label: 'Atrasadas', n: stOver, color: 'var(--danger)' },
    { label: 'Concluídas', n: stDone, color: 'var(--ok)' },
  ];
  const stTotal = stBuckets.reduce((s, b) => s + b.n, 0);
  const donut = (() => {
    const size = 128, sw = 16, r = (size - sw) / 2, c = 2 * Math.PI * r;
    let off = 0;
    const segs = stBuckets.filter(b => b.n > 0).map(b => {
      const len = c * b.n / (stTotal || 1);
      const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${b.color}" stroke-width="${sw}" stroke-dasharray="${Math.max(len - 3, 1).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`;
      off += len;
      return seg;
    }).join('');
    return `<div class="dv-donut"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)" role="img" aria-label="Tarefas por status"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${sw}"/>${segs}</svg><div class="dv-donut-c"><b>${stTotal}</b><small>tarefas</small></div></div>`;
  })();

  /* ---- agenda ---- */
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
  const agendaRowHtml = r => {
    const cat = catById(r.ev.categoryId);
    const sub = r.until ? `até ${r.until.slice(8)}/${r.until.slice(5, 7)}` : (cat ? escapeHtml(cat.name) : '');
    const day = r.until ? (agendaDayLabel(r.date) || 'Hoje') : agendaDayLabel(r.date);
    return `<div class="dv-tl dash-list-row" data-event-id="${r.ev.id}"><span class="h">${r.ev.allDay || !r.ev.startTime ? 'Dia todo' : r.ev.startTime}</span><span class="l" style="background:${cat ? cat.color : 'var(--primary)'}"></span><div class="tx"><b>${escapeHtml(r.ev.title || 'Sem título')}</b><small>${sub}</small></div>${day ? `<span class="d">${day}</span>` : ''}</div>`;
  };

  /* ---- tabela de tarefas (Hoje | Atrasadas | Próximas) ---- */
  const aba = ['hoje', 'atrasadas', 'proximas'].includes(PAINEL_INICIO.aba) ? PAINEL_INICIO.aba : 'hoje';
  const doneToday = scopeTasks.filter(t => t.done && t.dueDate === todayS);
  /* A tabela junta prazo e retomada: além das tarefas com prazo, entram as que é hora de retomar
     (retomada hoje ou antes, em "Hoje"; retomada nos próximos 7 dias, em "Próximas"), sinalizadas com "Retomar". */
  const taken = new Set();
  const uniq = list => list.filter(t => { if(taken.has(t.id)) return false; taken.add(t.id); return true; });
  const hojeList = uniq(dueToday.slice().sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')));
  const retHoje = uniq(open.filter(t => t.followUpDate && t.followUpDate <= todayS && !(t.dueDate && t.dueDate < todayS)).sort((x, y) => x.followUpDate.localeCompare(y.followUpDate)));
  const proxList = uniq(upcomingTasks.filter(t => t.dueDate > todayS));
  const retProx = uniq(open.filter(t => t.followUpDate && t.followUpDate > todayS && t.followUpDate <= addDaysStr(todayS, 7)).sort((x, y) => x.followUpDate.localeCompare(y.followUpDate)));
  const tabLists = {
    hoje: hojeList.concat(retHoje, doneToday.filter(t => !taken.has(t.id))),
    atrasadas: overdue.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    proximas: proxList.concat(retProx),
  };
  const tabEmpty = { hoje: 'Nenhuma tarefa para hoje.', atrasadas: 'Nada atrasado. Bom trabalho!', proximas: 'Nada com prazo nos próximos 7 dias.' };
  const listNow = tabLists[aba];
  const prioChip = k => {
    const p = PRIORITY_CONFIG.find(x => x.key === k);
    return p ? `<span class="dv-chip p-${p.key}">${p.label}</span>` : '<span class="dv-muted">—</span>';
  };
  const dueLabel = t => {
    if(t.done) return 'Concluída';
    if(!t.dueDate){
      if(t.followUpDate) return '↻ ' + (t.followUpDate <= todayS ? 'Hoje' : t.followUpDate.slice(8) + '/' + t.followUpDate.slice(5, 7));
      return '—';
    }
    if(t.dueDate === todayS) return 'Hoje' + (t.dueTime ? ' ' + t.dueTime : '');
    const d = new Date(t.dueDate + 'T12:00:00');
    return WEEKDAY_LABELS[d.getDay()] + ' ' + t.dueDate.slice(8) + '/' + t.dueDate.slice(5, 7);
  };
  const taskRow = t => {
    const cat = catById(t.categoryId);
    const pr = t.projectId ? projectById(t.projectId) : null;
    return `<div class="dv-tr${t.done ? ' done' : ''}${t.dueDate && t.dueDate < todayS && !t.done ? ' late' : ''}" data-task-id="${t.id}">
      <span class="dv-cb${t.done ? ' on' : ''}" data-check="${t.id}" role="checkbox" aria-checked="${t.done ? 'true' : 'false'}" aria-label="Concluir tarefa" tabindex="0">${t.done ? icon('check') : ''}</span>
      <span class="dv-t1"><span class="ln"><b>${escapeHtml(t.title || 'Sem título')}</b>${!t.done && t.followUpDate && t.followUpDate <= (aba === 'proximas' ? addDaysStr(todayS, 7) : todayS) ? `<i class="dv-ret" title="É hora de retomar esta tarefa (${fmtDate(t.followUpDate)})">↻<em> Retomar</em></i>` : ''}</span>${pr ? `<small>${escapeHtml(pr.name)}</small>` : ''}</span>
      <span class="dv-sp">${cat ? `<i style="background:${cat.color}"></i>${escapeHtml(cat.name)}` : ''}</span>
      <span>${prioChip(t.priority)}</span>
      <span class="dv-due">${dueLabel(t)}</span>
    </div>`;
  };
  const TASK_ROWS = 6;

  const projRows = prStatus.slice(0, 4).map(x => {
    const fin = x.st.total && x.st.done === x.st.total;
    const sub = fin ? 'Concluído' : (x.st.next ? escapeHtml(x.st.next.name || 'Etapa') + ' · ' + fmtDate(x.st.next.end) : (x.st.end ? 'Entrega ' + fmtDate(x.st.end) : 'Sem etapas'));
    const tag = x.st.late ? `${x.st.lateCount} atrasada${x.st.lateCount > 1 ? 's' : ''}` : (fin ? 'Concluído' : 'No prazo');
    return `<div class="dv-pr" data-project="${x.p.id}" style="--c:${projectColor(x.p)}; --p:${x.st.pct}">
      <div class="pj-ig"><i><b>${projectIconSvg(x.p.icon || 'briefcase')}</b></i><em>${x.st.pct}%</em></div>
      <div class="pj-tx"><b>${escapeHtml(x.p.name || 'Projeto')}</b><small>${sub}</small></div>
      <span class="dv-tag${x.st.late ? ' late' : (fin ? ' ok' : '')}">${tag}</span>
    </div>`;
  }).join('');

  const spacesHtml = spaceList.slice(0, 5).map(c => {
    const o = open.filter(t => t.categoryId === c.id).length;
    const d = completed.filter(t => t.categoryId === c.id).length;
    const pct = (o + d) ? Math.round(d / (o + d) * 100) : 0;
    return `<div class="dv-sp-row" data-space="${c.id}" title="Ver as tarefas deste espaço">
      <span class="sq" style="background:color-mix(in srgb, ${c.color} 18%, var(--surface)); color:${c.color};">${escapeHtml((c.name || '?').charAt(0).toUpperCase())}</span>
      <div class="tx"><div class="top"><b>${escapeHtml(c.name)}</b><small>${o} aberta${o === 1 ? '' : 's'}</small></div><span class="dv-bar"><u style="width:${pct}%; background:${c.color}"></u></span></div>
    </div>`;
  }).join('');

  /* ---- mapa de calor: prazos de tarefas em aberto + eventos, dia a dia, no mês escolhido ---- */
  const mesKey = /^\d{4}-\d{2}$/.test(PAINEL_INICIO.mapaMes || '') ? PAINEL_INICIO.mapaMes : todayS.slice(0, 7);
  const [mapY, mapM] = mesKey.split('-').map(Number);
  const mapDias = new Date(mapY, mapM, 0).getDate();
  const mapIni = G.state.weekStartDay || 0;
  const mapLead = (new Date(mapY, mapM - 1, 1).getDay() - mapIni + 7) % 7;
  const mapLetters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  let mapTotal = 0;
  const heatCells = [];
  for(let i = 0; i < mapLead; i++) heatCells.push('<i class="hm-c empty"></i>');
  for(let d = 1; d <= mapDias; d++){
    const ds = mesKey + '-' + String(d).padStart(2, '0');
    const prazos = open.filter(t => t.dueDate === ds).length;
    const evs = eventsOnDate(scopeEvents, ds).length;
    const n = prazos + evs;
    mapTotal += n;
    const dow = new Date(mapY, mapM - 1, d).getDay();
    const tip = `${WEEKDAY_LABELS[dow]}, ${d} ${MONTH_LABELS[mapM - 1].slice(0, 3).toLowerCase()}\n` + (n ? `${n} ${n === 1 ? 'item' : 'itens'} · ${prazos} ${prazos === 1 ? 'prazo' : 'prazos'} e ${evs} ${evs === 1 ? 'evento' : 'eventos'}` : 'Nada marcado');
    heatCells.push(`<button type="button" class="hm-c l${Math.min(n, 4)}${ds === todayS ? ' today' : ''}" data-day="${ds}" data-tip="${tip}" aria-label="${tip.replace('\n', ': ')}">${d}</button>`);
  }
  /* celular: anel com o andamento do dia e indicadores em grade */
  const feitasHoje = completed.filter(t => t.completedAt && dateOfDay(t.completedAt) === todayS).length;
  /* cartão Hoje: o que pede atenção agora, sem repetir a mesma tarefa em dois grupos */
  const retomar = open.filter(t => t.followUpDate && t.followUpDate <= todayS && !(t.dueDate && t.dueDate <= todayS));
  const atencao = overdue.length + dueToday.length + retomar.length;
  const diaTotal = atencao + feitasHoje;
  const diaPct = diaTotal ? Math.round(feitasHoje / diaTotal * 100) : 0;
  /* gráfico do topo: concluídas × criadas no período escolhido (Semana, Mês, Trimestre) */
  const created = scopeTasks.concat(scopeLog);
  const lcSeries = buildSeries(todayS, PAINEL_INICIO.periodo, completed, created);
  const sumN = arr => arr.reduce((n, v) => n + (v || 0), 0);
  const lcDone = sumN(lcSeries.done), lcNew = sumN(lcSeries.created);
  const saldo = lcNew - lcDone;
  const saldoTxt = (saldo > 0 ? '+' : (saldo < 0 ? '−' : '')) + Math.abs(saldo);
  const saldoCap = saldo < 0 ? 'a fila diminuiu' : (saldo > 0 ? 'a fila cresceu' : 'a fila ficou igual');
  const lcSegs = [['semana', 'Semana'], ['mes', 'Mês'], ['90', 'Trimestre']];
  const lcPerNome = { semana: 'últimos 7 dias', mes: 'este mês', 30: 'últimos 30 dias', 90: 'últimos 90 dias' }[PAINEL_INICIO.periodo] || perDef.label;
  const lcChip = (cls, n, label, aba) => n ? `<button type="button" class="lc-chip ${cls}" data-aba="${aba}" title="Ver na lista de tarefas"><b>${n}</b>${label}</button>` : '';
  const kpiTile = (ic_, cls, n, lbl) => `<div class="dv-kt ${cls}"><span class="ki">${icon(ic_)}</span><div><b>${n}</b><small>${lbl}</small></div></div>`;
  const alertRow = (kind, ic_, n, one, many) => n ? `<div class="dv-al" data-nodate="${kind}" role="button" tabindex="0"><span class="ai">${icon(ic_)}</span><b>${n} ${n === 1 ? one : many}</b>${icon('caret-right')}</div>` : '';
  const chart = wk.map((v, i) => `<div class="dv-col${i === wkToday ? ' today' : ''}" title="${wkLabels[i]}: ${v}"><span class="n">${v || ''}</span><i style="height:${v ? Math.max(5, Math.round(v / wkMax * 96)) : 4}px"></i><span class="l">${wkLabels[i]}</span></div>`).join('');

  view.innerHTML = `
    <div class="dv">
      ${onboardingCardHtml()}
      <div class="dv-r1">
        <section class="dv-card dv-hero dv-lc">
          <h3>${icon('trend-up')}Ritmo
            ${lateProjects ? `<span class="dv-tag late">${lateProjects} projeto${lateProjects > 1 ? 's' : ''} em atraso</span>` : ''}
            <span class="sp"></span>
            <span class="dv-lseg" role="tablist" aria-label="Período do gráfico">${lcSegs.map(([k, l]) => `<button type="button" role="tab" data-per="${k}" aria-selected="${PAINEL_INICIO.periodo === k}" class="${PAINEL_INICIO.periodo === k ? 'on' : ''}">${l}</button>`).join('')}</span>
          </h3>
          <div class="dv-lc-row">
            <div class="dv-lc-top"><span class="dv-lc-big"><b>${lcDone}</b></span><span class="dv-lc-cap">concluídas contra ${lcNew} criadas · ${lcPerNome}</span></div>
            <div class="dv-lc-kpis">
              <div class="k" title="${saldoCap}"><span class="cap">Saldo da fila</span><span class="v ${saldo < 0 ? 'good' : (saldo > 0 ? 'warn' : '')}">${saldoTxt}</span></div>
              <div class="k"><span class="cap">Ritmo médio</span><span class="v">${avgPerDay.toFixed(1).replace('.', ',')}<small> /dia</small>${periodTrend !== null ? ` <small class="${periodTrend >= 0 ? 'up' : 'dn'}" title="vs período anterior">${periodTrend >= 0 ? '▲' : '▼'} ${Math.abs(periodTrend)}%</small>` : ''}</span></div>
              <div class="k"><span class="cap">Hoje</span><span class="v">${feitasHoje}<small> de ${diaTotal} feitas</small></span></div>
            </div>
          </div>
          <div class="dv-lc-chart" id="lcChart"></div>
          <div class="dv-lc-foot">
            <span class="lc-chips">${atencao ? lcChip('o', overdue.length, 'atrasadas', 'atrasadas') + lcChip('d', dueToday.length, 'vencem hoje', 'hoje') + lcChip('r', retomar.length, 'retomar', 'hoje') : '<span class="cap">Tudo em dia</span>'}</span>
            <span class="lc-nd"><span data-nodate="due" role="button" tabindex="0" title="Ver tarefas"><b>${noDue.length}</b> sem prazo</span><span data-nodate="follow" role="button" tabindex="0" title="Ver tarefas"><b>${noFollow.length}</b> sem retomada</span></span>
            <span class="sp"></span>
            <span class="dv-lc-leg"><span><svg width="15" height="6" viewBox="0 0 15 6" aria-hidden="true"><line x1="1" y1="3" x2="14" y2="3" stroke="var(--lc-line)" stroke-width="3" stroke-linecap="round"/></svg>Concluídas</span><span><svg width="15" height="6" viewBox="0 0 15 6" aria-hidden="true"><line x1="1" y1="3" x2="14" y2="3" stroke="var(--lc-new)" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 4"/></svg>Criadas</span><span><svg width="15" height="6" viewBox="0 0 15 6" aria-hidden="true"><line x1="1" y1="3" x2="14" y2="3" stroke="var(--ink-faint)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"/></svg>Anterior</span></span>
          </div>
        </section>
        <section class="dv-mkpis">
          <div class="dv-kgrid">
            ${kpiTile('list-bullets', 'k-ab', open.length, 'Abertas')}${kpiTile('clock', 'k-an', inProgress.length, 'Em andamento')}${kpiTile('warning-circle', 'k-at', overdue.length, 'Atrasadas')}${kpiTile('check-square', 'k-ok', completedLast7.length, 'Concluídas 7d')}
          </div>
          ${(noDue.length || noFollow.length) ? `<div class="dv-card dv-alerts">${alertRow('due', 'calendar-blank', noDue.length, 'tarefa sem prazo', 'tarefas sem prazo')}${alertRow('follow', 'repeat', noFollow.length, 'tarefa sem data de retomada', 'tarefas sem data de retomada')}</div>` : ''}
        </section>
        <section class="dv-card dv-status-card">
          <h3>${icon('flag')}Status das tarefas</h3>
          <div class="dv-status">${donut}
            <div class="dv-legend">${stBuckets.map(b => `<div><i style="background:${b.color}"></i>${b.label}<b>${b.n}</b></div>`).join('')}</div>
          </div>
        </section>
        <section class="dv-card dv-heat">
          <h3>${icon('calendar-blank')}Compromissos
            <span class="hm-nav"><button type="button" id="hmPrev" aria-label="Mês anterior">${icon('caret-left')}</button><span>${MONTH_LABELS[mapM - 1]} ${mapY}</span><button type="button" id="hmNext" aria-label="Próximo mês">${icon('caret-right')}</button></span></h3>
          <div class="hm-wd">${[0, 1, 2, 3, 4, 5, 6].map(k => `<span>${mapLetters[(k + mapIni) % 7]}</span>`).join('')}</div>
          <div class="hm-g">${heatCells.join('')}</div>
          <div class="hm-legend"><span>Menos</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>Mais</span><b>${mapTotal} ${mapTotal === 1 ? 'item' : 'itens'} no mês</b></div>
        </section>
      </div>

      <div class="dv-r2">
        <section class="dv-card dv-tarefas">
          <h3>${icon('list-bullets')}Tarefas
            <span class="dv-seg" role="tablist">
              <a role="tab" data-aba="hoje" class="${aba === 'hoje' ? 'on' : ''}">Hoje</a><a role="tab" data-aba="atrasadas" class="${aba === 'atrasadas' ? 'on' : ''}">Atrasadas</a><a role="tab" data-aba="proximas" class="${aba === 'proximas' ? 'on' : ''}">Próximas</a>
            </span></h3>
          <div class="dv-thead"><span></span><span>Tarefa</span><span>Espaço</span><span>Prior.</span><span>Prazo</span></div>
          ${listNow.length ? listNow.slice(0, TASK_ROWS).map(taskRow).join('') : `<div class="dv-empty">${tabEmpty[aba]}</div>`}
          ${listNow.length > TASK_ROWS ? `<span class="dv-link" id="dashSeeAllTasksLink">Ver todas (${listNow.length}) →</span>` : ''}
        </section>
        <section class="dv-card dv-conc">
          <h3>${icon('trend-up')}Conclusões por dia ${periodTrend !== null ? `<span class="dv-chip ${periodTrend >= 0 ? 'ok' : 'late'}">${periodTrend >= 0 ? '↑' : '↓'} ${Math.abs(periodTrend)}%</span>` : ''}</h3>
          <div class="dv-chart">${chart}</div>
          <div class="dv-mrow"><div><small>Média por dia</small><b>${avgPerDay.toFixed(1).replace('.', ',')}</b></div><div><small>Melhor dia</small><b>${bestLabel}</b></div><div><small>Sequência</small><b>${streak} dia${streak === 1 ? '' : 's'}</b></div></div>
        </section>
        <section class="dv-card dv-prazos">
          <h3>${icon('calendar-blank')}Próximos prazos <span class="dv-more" id="dashSeeAllTasksTop">Tarefas →</span></h3>
          ${upcomingTasks.length ? upcomingTasks.slice(0, 4).map(t => { const cat = catById(t.categoryId), pr = t.projectId ? projectById(t.projectId) : null; const d = new Date(t.dueDate + 'T12:00:00'); return `
            <div class="dv-li dash-list-row" data-task-id="${t.id}">
              <span class="dv-dt"><b>${t.dueDate.slice(8)}</b>${MONTH_LABELS[d.getMonth()].slice(0, 3)}</span>
              <div class="tx"><b>${escapeHtml(t.title || 'Sem título')}</b><small>${pr ? escapeHtml(pr.name) : (cat ? escapeHtml(cat.name) : '')}${t.dueTime ? ' · ' + t.dueTime : ''}</small></div>
            </div>`; }).join('') : '<div class="dv-empty">Nada com prazo nos próximos 7 dias.</div>'}
        </section>
      </div>

      <div class="dv-r3">
        <section class="dv-card dv-proj">
          <h3>${icon('kanban')}Projetos <span class="dv-more" id="rsSeeProjects">${prStatus.length ? prStatus.length + ' ativo' + (prStatus.length > 1 ? 's' : '') + ' · ' : ''}Ver todos →</span></h3>
          ${prStatus.length ? projRows : '<div class="dv-empty">Nenhum projeto ainda.</div>'}
        </section>
        <section class="dv-card dv-esp">
          <h3>${icon('stack')}Espaços <span class="dv-more" id="rsAddSpace">+ Espaço</span></h3>
          ${spacesHtml || '<div class="dv-empty">Nenhum espaço.</div>'}
        </section>
        <section class="dv-card dv-imp">
          <h3>${icon('flag')}Tarefas importantes <span class="dv-more" id="dashSeeAllImportantLink">Ver todas →</span></h3>
          ${importantTasks.length ? importantTasks.slice(0, 4).map(t => `<div class="dv-li dash-tasklist-row" data-task-id="${t.id}">
            <span class="dv-fl ${t.priority}">${icon('flag')}</span>
            <div class="tx"><b>${escapeHtml(t.title || 'Sem título')}</b><small>${t.dueDate ? fmtDate(t.dueDate) : 'Sem prazo'}</small></div>${prioChip(t.priority)}</div>`).join('') : '<div class="dv-empty">Nenhuma tarefa importante.</div>'}
        </section>
        <section class="dv-card dv-agenda">
          <h3>${icon('calendar-blank')}Agenda <span class="dv-more" id="${agendaRows.length > 4 ? 'dashAgendaMore' : 'dashSeeAllEventsLink'}">${agendaRows.length > 4 ? 'Ver mais (' + (agendaRows.length - 4) + ') →' : 'Calendário →'}</span></h3>
          ${agendaRows.length ? agendaRows.slice(0, 4).map(agendaRowHtml).join('') : '<div class="dv-empty">Nenhum evento nos próximos 7 dias.</div>'}
        </section>
      </div>
    </div>
  `;

  /* ---- interações ---- */
  view.querySelectorAll('[data-nodate]').forEach(el => {
    el.onkeydown = ev => { if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); el.click(); } };
    el.onclick = () => {
      G.currentView = 'tasks';
      G.taskGroupMode = el.dataset.nodate === 'due' ? 'periodo' : 'retomada';
      render();
    };
  });
  view.querySelectorAll('.dv-sp-row[data-space]').forEach(el => {
    el.onclick = () => { G.activeCategoryFilter = el.dataset.space; G.currentView = 'tasks'; render(); };
  });
  bindOnboardingCard(view);
  const addSpace = document.getElementById('rsAddSpace');
  if(addSpace) addSpace.onclick = () => { G.settingsTab = 'categorias'; G.settingsMobileList = false; G.currentView = 'settings'; render(); };
  view.querySelectorAll('.dv-pr[data-project]').forEach(el => {
    el.onclick = () => { G.activeProjectId = el.dataset.project; G.projectTab = defaultProjectTab(); G.currentView = 'projects'; render(); };
  });
  const seeProjects = document.getElementById('rsSeeProjects');
  if(seeProjects) seeProjects.onclick = () => { G.activeProjectId = null; G.currentView = 'projects'; render(); };

  bindLineChart(document.getElementById('lcChart'), lcSeries);
  view.querySelectorAll('.dv-lseg [data-per]').forEach(el => {
    el.onclick = () => {
      PAINEL_INICIO.periodo = el.dataset.per;
      try{ localStorage.setItem('dounoPeriodoPainel', PAINEL_INICIO.periodo); }catch(err){}
      render();
    };
  });
  view.querySelectorAll('[data-aba]').forEach(el => {
    el.onclick = () => { PAINEL_INICIO.aba = el.dataset.aba; renderDashboard(); };
  });
  view.querySelectorAll('[data-check]').forEach(el => {
    const toggle = (e) => {
      e.stopPropagation();
      const t = G.state.tasks.find(x => x.id === el.dataset.check);
      if(t) toggleTaskFromDashboard(t);
    };
    el.onclick = toggle;
    el.onkeydown = (e) => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); toggle(e); } };
  });
  const openTask = id => { G.currentView = 'tasks'; G.activeTaskId = id; G.creatingNewTask = false; render(); };
  view.querySelectorAll('.dv-tr[data-task-id], .dv-li[data-task-id]').forEach(row => { row.onclick = () => openTask(row.dataset.taskId); });
  view.querySelectorAll('.dash-list-row[data-event-id]').forEach(row => {
    row.onclick = () => {
      const ev = G.state.events.find(x => x.id === row.dataset.eventId);
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
    ov.querySelectorAll('.dash-list-row[data-event-id]').forEach(row => { row.onclick = () => { close(); const ev = G.state.events.find(x => x.id === row.dataset.eventId); if(ev) openEventComposer(ev); }; });
  };
  view.querySelectorAll('.hm-c[data-day]').forEach(el => {
    el.onclick = () => { G.calendarFocusDate = el.dataset.day; G.calendarView = 'day'; G.currentView = 'calendar'; render(); };
  });
  const moveMes = delta => {
    const d = new Date(mapY, mapM - 1 + delta, 1);
    PAINEL_INICIO.mapaMes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderDashboard();
  };
  const hmPrev = document.getElementById('hmPrev'), hmNext = document.getElementById('hmNext');
  if(hmPrev) hmPrev.onclick = () => moveMes(-1);
  if(hmNext) hmNext.onclick = () => moveMes(1);
  const goTasks = () => { G.currentView = 'tasks'; render(); };
  ['dashSeeAllImportantLink', 'dashSeeAllTasksLink', 'dashSeeAllTasksTop'].forEach(id => { const el = document.getElementById(id); if(el) el.onclick = goTasks; });
  const seeEvents = document.getElementById('dashSeeAllEventsLink');
  if(seeEvents) seeEvents.onclick = () => { G.currentView = 'calendar'; render(); };
}


G.calLayersOpen = false;
document.addEventListener('click', e => { if(G.calLayersOpen && !e.target.closest('.cal-layers')){ G.calLayersOpen = false; render(); } });
