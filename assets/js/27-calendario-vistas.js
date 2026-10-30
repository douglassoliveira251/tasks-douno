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

