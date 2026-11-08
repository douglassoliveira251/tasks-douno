import { G } from './globais.js';
import { escapeHtml, fmtDate, todayStr, isOverdue } from './10-helpers.js';
import { eventsOnDate } from './25-calendario.js';
import { openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { render } from './48-render-principal.js';

/* ===================== RESUMO DO DIA (coluna da direita de Tarefas, sem tarefa aberta) =====================
   Só lê dados que já existem: tarefas, eventos e espaços. Respeita o espaço escolhido no topo. */
const PRIOS = [
  { key: 'critica', label: 'Crítica', color: '#E11D48' },
  { key: 'alta', label: 'Alta', color: '#F79009' },
  { key: 'media', label: 'Média', color: '#12B76A' },
  { key: 'baixa', label: 'Baixa', color: '#2E90FA' },
];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function doneToday(t, today){
  if(!t.done || !t.completedAt) return false;
  const d = new Date(t.completedAt);
  const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return s === today;
}

function ringSvg(pct){
  const size = 72, w = 8, r = (size - w) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${w}"/>
    <circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--primary)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/>
    <text x="${m}" y="${m + 4}" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor">${pct}%</text></svg>`;
}

export function buildDaySummary(){
  const today = todayStr();
  const inSpace = x => !G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter;
  const tasks = G.state.tasks.filter(inSpace);
  const open = tasks.filter(t => !t.done);
  const hojeAbertas = open.filter(t => t.dueDate === today);
  const feitasHoje = tasks.filter(t => doneToday(t, today));
  const totalHoje = hojeAbertas.length + feitasHoje.length;
  const pct = totalHoje ? Math.round(feitasHoje.length / totalHoje * 100) : 0;
  const vencidas = open.filter(t => isOverdue(t.dueDate, t.done)).length;
  const retomar = open.filter(t => t.followUpDate && t.followUpDate <= today && !(t.dueDate && t.dueDate < today)).length;
  const prios = PRIOS.map(p => ({ ...p, n: open.filter(t => (t.priority || 'media') === p.key).length }));
  const totalPrio = prios.reduce((s, p) => s + p.n, 0);
  const proximas = open.filter(t => t.dueDate && t.dueDate >= today)
    .sort((a, b) => (a.dueDate + (a.dueTime || '99:99')).localeCompare(b.dueDate + (b.dueTime || '99:99'))).slice(0, 3);
  const catName = id => ((G.state.categories || []).find(c => c.id === id) || {}).name || '';
  const quando = t => (t.dueDate === today ? 'Hoje' : fmtDate(t.dueDate)) + (t.dueTime ? ' ' + t.dueTime : '');
  const evs = eventsOnDate(G.state.events.filter(inSpace), today).slice()
    .sort((x, y) => (x.allDay ? '' : (x.startTime || '')).localeCompare(y.allDay ? '' : (y.startTime || ''))).slice(0, 4);
  const d = new Date(today + 'T00:00:00');
  const proxEntrega = proximas[0];

  const el = document.createElement('aside');
  el.className = 'day-summary';
  el.setAttribute('aria-label', 'Resumo do dia');
  el.innerHTML = `
    <div class="ds-cap">Resumo do dia</div>
    <div class="ds-top">
      <div class="ds-ring">${ringSvg(pct)}</div>
      <div class="ds-top-tx">
        <div class="ds-big">${totalHoje ? `${feitasHoje.length} de ${totalHoje} <span>tarefas de hoje</span>` : '<span>Nenhuma tarefa para hoje</span>'}</div>
        <div class="ds-sub">${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}</div>
        ${proxEntrega ? `<div class="ds-next"><span>Próxima entrega:</span> <b>${escapeHtml(proxEntrega.title || 'Sem título')}${proxEntrega.dueDate === today && proxEntrega.dueTime ? ' · ' + proxEntrega.dueTime : ''}</b></div>` : ''}
      </div>
    </div>
    <div class="ds-kpis">
      <div class="ds-kpi"><small>Abertas</small><b>${open.length}</b></div>
      <div class="ds-kpi"><small>Vencidas</small><b class="bad">${vencidas}</b></div>
      <div class="ds-kpi"><small>Feitas hoje</small><b class="ok">${feitasHoje.length}</b></div>
      <div class="ds-kpi"><small>Retomar hoje</small><b class="pri">${retomar}</b></div>
    </div>
    <div class="ds-cap">Por prioridade</div>
    ${totalPrio ? `<div class="ds-stack">${prios.filter(p => p.n).map(p => `<i style="flex:${p.n}; background:${p.color}"></i>`).join('')}</div>
    <div class="ds-legend">${prios.filter(p => p.n).map(p => `<span>${p.label} ${p.n}</span>`).join('')}</div>` : '<div class="ds-empty">Nada em aberto</div>'}
    <div class="ds-cap">Próximas tarefas</div>
    ${proximas.length ? proximas.map(t => `<button type="button" class="ds-task" data-open="${t.id}">
      <i style="background:${(PRIOS.find(p => p.key === (t.priority || 'media')) || PRIOS[2]).color}"></i>
      <span><b>${escapeHtml(t.title || 'Sem título')}</b><small>${quando(t)}${catName(t.categoryId) ? ' · ' + escapeHtml(catName(t.categoryId)) : ''}</small></span></button>`).join('') : '<div class="ds-empty">Nenhuma tarefa com prazo à frente</div>'}
    <div class="ds-cap">Agenda de hoje</div>
    ${evs.length ? evs.map(ev => `<button type="button" class="ds-ev" data-cal="1"><span class="t">${ev.allDay ? 'Dia todo' : (ev.startTime || '')}</span><b>${escapeHtml(ev.title || 'Sem título')}</b></button>`).join('') : '<div class="ds-empty">Nenhum compromisso hoje</div>'}`;
  el.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openTaskPanel(b.dataset.open); });
  el.querySelectorAll('[data-cal]').forEach(b => { b.onclick = () => { G.calendarFocusDate = today; G.calendarView = 'day'; G.currentView = 'calendar'; render(); }; });
  return el;
}
