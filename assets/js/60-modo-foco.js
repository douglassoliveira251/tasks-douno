import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { escapeHtml, fmtDate, todayStr, completeRecurring, catById } from './10-helpers.js';
import { openNewTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { addDaysStr, eventsOnDate } from './25-calendario.js';
import { projectById } from './31-projetos.js';
import { showToast } from './42-nuvem-persistencia.js';
import { isMobileViewport } from './01-estado.js';
import { render } from './48-render-principal.js';

/* ===================== MODO FOCO (só no celular) =====================
   Um botão no topo liga/desliga. Ligado, o app mostra só o dia de hoje: a tarefa de agora em destaque (ou a reunião que
   está chegando), as próximas embaixo e o progresso do dia. A escolha de ligar fica no aparelho (localStorage), não vai
   para a nuvem: no computador o app continua normal. */
const KEY = 'dounoFoco';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PRIO_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PRIO_W = { critica: 0, alta: 1, media: 2, baixa: 3 };
const MEETING_AHEAD_MIN = 30; // a reunião toma o lugar do cartão faltando tanto tempo

try{ G.focoMode = localStorage.getItem(KEY) === '1'; }catch(e){ G.focoMode = false; }
const FOCO = { skipped: [], ack: new Set(), sheet: false };

export const focoActive = () => !!(isMobileViewport() && G.focoMode && !G.activeTaskId && !G.creatingNewTask);
export function setFoco(on){
  G.focoMode = !!on;
  try{ localStorage.setItem(KEY, on ? '1' : '0'); }catch(e){}
  FOCO.sheet = false;
  render();
}

const inSpace = (x) => !G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter;
const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const prioOf = (t) => t.priority || 'media';

/* tarefas de hoje e atrasadas, na ordem em que devem ser feitas */
function poolOf(today){
  const list = G.state.tasks.filter(t => !t.done && inSpace(t) && t.dueDate && t.dueDate <= today);
  list.sort((a, b) => {
    const ao = a.dueDate < today ? 0 : 1, bo = b.dueDate < today ? 0 : 1;
    if(ao !== bo) return ao - bo;
    if(ao === 0 && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if(ao === 1){ const at = a.dueTime || '99:99', bt = b.dueTime || '99:99'; if(at !== bt) return at < bt ? -1 : 1; }
    const pw = (PRIO_W[prioOf(a)] ?? 2) - (PRIO_W[prioOf(b)] ?? 2);
    if(pw) return pw;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  // "Pular" manda para o fim da fila (só nesta sessão)
  const sk = FOCO.skipped.filter(id => list.some(t => t.id === id));
  if(sk.length >= list.length) FOCO.skipped = [];
  else FOCO.skipped = sk;
  return list.filter(t => !FOCO.skipped.includes(t.id)).concat(FOCO.skipped.map(id => list.find(t => t.id === id)));
}

/* reunião de hoje que começa em até 30 min (ou já está em andamento) e ainda não foi dispensada */
function meetingNow(today){
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const evs = eventsOnDate(G.state.events.filter(inSpace), today).filter(ev => !ev.allDay && ev.startTime);
  for(const ev of evs){
    const s = toMin(ev.startTime); if(s == null) continue;
    let e = toMin(ev.endTime); if(e == null || e <= s) e = s + 60;
    if(nowMin >= s - MEETING_AHEAD_MIN && nowMin < e && !FOCO.ack.has(ev.id + today)) return { ev, s, e, nowMin };
  }
  return null;
}

function doneToday(t, today){
  if(!t.done || !t.completedAt) return false;
  const d = new Date(t.completedAt);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === today;
}

/* mesma regra do círculo da lista: conclui, e as recorrentes geram a próxima */
function complete(t){
  const prevStatus = t.status;
  t.done = true; t.status = 'concluida'; t.completedAt = Date.now(); t.pinned = false;
  if(t.recurrence && t.recurrence !== 'none'){
    const next = completeRecurring(t, prevStatus);
    if(next) G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
  }
  markDirty();
}
function postpone(t, dateStr){
  t.dueDate = dateStr;
  if(t.followUpDate && t.followUpDate < dateStr) t.followUpDate = dateStr;
  markDirty();
  showToast('Adiada para ' + fmtDate(dateStr) + '.');
}
const nextMonday = (today) => { const d = new Date(today + 'T00:00:00'); const add = ((8 - d.getDay()) % 7) || 7; return addDaysStr(today, add); };

const ring = (pct, size, inner, label, color) => `<div class="fc-ring" style="--p:${pct}%; width:${size}px; height:${size}px; ${color ? `--c:${color};` : ''}"><div style="width:${inner}px; height:${inner}px;">${label}</div></div>`;

function whenText(t, today){
  const proj = t.projectId ? projectById(t.projectId) : null;
  let when;
  if(t.dueDate < today){ when = 'Venceu ' + (t.dueDate === addDaysStr(today, -1) ? 'ontem' : fmtDate(t.dueDate)); }
  else when = 'Vence hoje' + (t.dueTime ? ' · ' + t.dueTime : '');
  return [when, proj ? proj.name : ''].filter(Boolean).join(' · ');
}

function html(today){
  const d = new Date(today + 'T00:00:00');
  const dateTxt = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  const tasks = G.state.tasks.filter(inSpace);
  const queue = poolOf(today);
  const feitas = tasks.filter(t => doneToday(t, today)).length;
  const abertasHoje = tasks.filter(t => !t.done && t.dueDate === today).length;
  const totalHoje = abertasHoje + feitas;
  const pct = totalHoje ? Math.round(feitas / totalHoje * 100) : 0;
  const meet = meetingNow(today);
  const foot = totalHoje ? `<div class="fc-foot">${ring(pct, 44, 34, feitas + '/' + totalHoje)}<span>${feitas} de ${totalHoje} feitas hoje</span></div>` : '';

  if(!queue.length && !meet){
    if(feitas > 0){
      return `<div class="fc-cen"><div id="fcRing">${ring(100, 120, 94, feitas + '/' + feitas, 'var(--success, #1f9d62)')}</div>
        <div class="fc-big">Tudo feito por hoje</div><div class="fc-mm">${feitas} ${feitas === 1 ? 'tarefa concluída' : 'tarefas concluídas'}. Bom descanso.</div>
        <button type="button" class="fc-btn fc-gho" id="fcExit" style="width:100%">Sair do Foco</button></div>`;
    }
    const next = tasks.filter(t => !t.done && t.dueDate && t.dueDate > today).sort((a, b) => (a.dueDate + (a.dueTime || '')).localeCompare(b.dueDate + (b.dueTime || '')))[0];
    return `<div class="fc-cen"><div class="fc-sun">☀</div><div class="fc-big">Nada para hoje</div><div class="fc-mm">Você não tem tarefas atrasadas nem com prazo hoje.</div>
      ${next ? `<button type="button" class="fc-card fc-next" data-open="${next.id}"><span class="fc-mm">Próxima tarefa com data</span><b>${escapeHtml(next.title || 'Sem título')}</b><span class="fc-mm">${fmtDate(next.dueDate)}${next.dueTime ? ' · ' + next.dueTime : ''}</span></button>` : ''}
      <button type="button" class="fc-btn fc-pri" id="fcNew" style="width:100%">+ Nova tarefa para hoje</button></div>`;
  }

  let card;
  let rest = queue;
  if(meet){
    const { ev, s, nowMin } = meet;
    const lab = nowMin < s ? 'Começa em ' + (s - nowMin) + ' min' : 'Em andamento' + (ev.endTime ? ' · termina às ' + ev.endTime : '');
    const cat = catById(ev.categoryId);
    card = `<div class="fc-card fc-main fc-meet"><div class="fc-tags"><span class="fc-warn">⏰ ${escapeHtml(lab)}</span></div>
      <div class="fc-title">${escapeHtml(ev.title || 'Sem título')}</div>
      <div class="fc-mm fc-meta">${escapeHtml(ev.startTime)}${ev.endTime ? ' – ' + escapeHtml(ev.endTime) : ''}${cat ? ' · ' + escapeHtml(cat.name) : ''}${ev.location ? ' · ' + escapeHtml(ev.location) : ''}</div>
      <div class="fc-acts"><button type="button" class="fc-btn fc-pri" id="fcAck" style="flex:1">Entendi</button><button type="button" class="fc-btn fc-gho" id="fcAgenda" style="width:132px; white-space:nowrap">Abrir agenda</button></div></div>`;
  } else {
    const t = queue[0]; rest = queue.slice(1);
    const late = t.dueDate < today, pr = prioOf(t);
    const cat = catById(t.categoryId);
    card = `<div class="fc-card fc-main"><div class="fc-tags"><span class="fc-tag${late ? ' late' : ''}">${late ? 'Atrasada' : 'Hoje'}${pr === 'alta' || pr === 'critica' ? ' · ' + PRIO_LABEL[pr] : ''}</span>${cat ? `<span class="fc-tag">${escapeHtml(cat.name)}</span>` : ''}</div>
      <button type="button" class="fc-title fc-link" data-open="${t.id}">${escapeHtml(t.title || 'Sem título')}</button>
      <div class="fc-mm fc-meta">${escapeHtml(whenText(t, today))}</div>
      <div class="fc-acts"><button type="button" class="fc-btn fc-pri" id="fcDone" style="flex:1">✓ Concluir</button><button type="button" class="fc-btn fc-gho" id="fcLater" style="width:96px">Adiar</button></div></div>
      ${queue.length > 1 ? '<button type="button" class="fc-skip" id="fcSkip">Pular para a próxima</button>' : ''}`;
  }
  const list = rest.slice(0, 6).map(t => `<div class="fc-li"><button type="button" class="fc-chk" data-done="${t.id}" aria-label="Concluir ${escapeHtml(t.title || 'tarefa')}"></button><button type="button" class="fc-lt" data-open="${t.id}"><b>${escapeHtml(t.title || 'Sem título')}</b><span class="${t.dueDate < today ? 'late' : ''}">${t.dueDate < today ? 'Atrasada' : (t.dueTime ? 'Hoje · ' + t.dueTime : 'Hoje')}</span></button></div>`).join('');
  return `<div class="fc-date">${escapeHtml(dateTxt)}</div><div class="fc-h">Agora</div>${card}
    ${rest.length ? `<div class="fc-sec">Depois · ${rest.length}</div>${list}${rest.length > 6 ? `<div class="fc-mm fc-more">e mais ${rest.length - 6}</div>` : ''}` : ''}${foot}`;
}

function sheetHtml(today){
  return `<div class="fc-sheet-bg" id="fcSheetBg"><div class="fc-sheet" role="dialog" aria-label="Adiar tarefa">
    <div class="fc-sheet-t">Adiar para quando?</div>
    <button type="button" class="fc-opt" data-to="${addDaysStr(today, 1)}">Amanhã<small>${fmtDate(addDaysStr(today, 1))}</small></button>
    <button type="button" class="fc-opt" data-to="${nextMonday(today)}">Próxima semana<small>${fmtDate(nextMonday(today))}</small></button>
    <label class="fc-opt fc-datep">Escolher data<input type="date" id="fcDate" min="${addDaysStr(today, 1)}"></label>
    <button type="button" class="fc-btn fc-gho" id="fcSheetX" style="width:100%; margin-top:6px">Cancelar</button></div></div>`;
}

let timer = null;
export function renderFoco(){
  const view = document.getElementById('focoView');
  if(!view) return;
  const btn = document.getElementById('focoBtn');
  if(btn){ btn.classList.toggle('on', !!G.focoMode); btn.setAttribute('aria-pressed', G.focoMode ? 'true' : 'false'); if(!btn.dataset.bound){ btn.dataset.bound = '1'; btn.onclick = () => setFoco(!G.focoMode); } }
  const on = focoActive();
  document.body.classList.toggle('foco-on', on);
  if(timer){ clearInterval(timer); timer = null; }
  if(!on){ view.style.display = 'none'; return; }
  document.querySelectorAll('.main > .view').forEach(v => { if(v !== view) v.style.display = 'none'; });
  view.style.display = 'block';
  const today = todayStr();
  view.innerHTML = '<div class="fc">' + html(today) + (FOCO.sheet ? sheetHtml(today) : '') + '</div>';
  const $ = (s) => view.querySelector(s);
  const first = poolOf(today)[0];
  const openTask = (id) => { G.currentView = 'tasks'; G.activeTaskId = id; G.creatingNewTask = false; render(); window.scrollTo(0, 0); };
  view.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openTask(b.dataset.open); });
  view.querySelectorAll('[data-done]').forEach(b => { b.onclick = () => { const t = G.state.tasks.find(x => x.id === b.dataset.done); if(t) complete(t); }; });
  const done = $('#fcDone'); if(done) done.onclick = () => { if(first) complete(first); };
  const later = $('#fcLater'); if(later) later.onclick = () => { FOCO.sheet = true; renderFoco(); };
  const skip = $('#fcSkip'); if(skip) skip.onclick = () => { if(first){ FOCO.skipped.push(first.id); renderFoco(); } };
  const ack = $('#fcAck'); if(ack) ack.onclick = () => { const m = meetingNow(today); if(m) FOCO.ack.add(m.ev.id + today); renderFoco(); };
  const ag = $('#fcAgenda'); if(ag) ag.onclick = () => { G.focoMode = false; try{ localStorage.setItem(KEY, '0'); }catch(e){} G.calendarFocusDate = today; G.calendarView = 'day'; G.currentView = 'calendar'; render(); };
  const ex = $('#fcExit'); if(ex) ex.onclick = () => setFoco(false);
  const nw = $('#fcNew'); if(nw) nw.onclick = () => { G.currentView = 'tasks'; openNewTaskPanel({ dueDate: today }); };
  if(FOCO.sheet){
    const close = () => { FOCO.sheet = false; renderFoco(); };
    $('#fcSheetX').onclick = close;
    $('#fcSheetBg').onclick = (e) => { if(e.target.id === 'fcSheetBg') close(); };
    view.querySelectorAll('.fc-opt[data-to]').forEach(b => { b.onclick = () => { FOCO.sheet = false; if(first) postpone(first, b.dataset.to); else renderFoco(); }; });
    $('#fcDate').onchange = (e) => { const v = e.target.value; if(v && v > today){ FOCO.sheet = false; if(first) postpone(first, v); } };
  }
  // a reunião aparece/some com o passar do tempo: reavalia a cada 30 s sem refazer o app inteiro
  timer = setInterval(() => { if(focoActive() && !FOCO.sheet) renderFoco(); }, 30000);
}
