import { G } from './globais.js';
import { catById, dateToStr } from './10-helpers.js';

/* ===================== CALENDÁRIO ===================== */
export const WEEKDAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
export const WEEKDAY_FULL_LABELS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
export const MONTH_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function eventsInScope(){
  return G.state.events.filter(ev => !G.activeCategoryFilter || ev.categoryId === G.activeCategoryFilter);
}
/* Uma agenda recorrente é salva uma vez só (na data de início). As ocorrências são
   calculadas na hora: a partir de ev.date, a cada N dias/semanas/meses/anos, até
   recurrenceEndDate (se houver). Mês/ano mais curto cai no último dia possível.
   Agenda de vários dias (ev.endDate depois de ev.date) aparece em todos os dias
   do período, e em cada repetição também. */
export function eventStartsOn(ev, dateStr){
  if(!ev.date || !dateStr) return false;
  if(ev.date === dateStr) return true;
  const rec = ev.recurrence;
  if(!rec || rec === 'none' || dateStr < ev.date) return false;
  if(ev.recurrenceEndDate && dateStr > ev.recurrenceEndDate) return false;
  const n = Math.max(1, parseInt(ev.recurrenceInterval, 10) || 1);
  const [ay, am, ad] = ev.date.split('-').map(Number);
  const [dy, dm, dd] = dateStr.split('-').map(Number);
  const daysBetween = Math.round((Date.UTC(dy, dm-1, dd) - Date.UTC(ay, am-1, ad)) / 86400000);
  const lastDayOf = (y, m) => new Date(y, m, 0).getDate();
  switch(rec){
    case 'daily': return daysBetween % n === 0;
    case 'weekly': return daysBetween % (7*n) === 0;
    case 'monthly': return ((dy-ay)*12 + (dm-am)) % n === 0 && dd === Math.min(ad, lastDayOf(dy, dm));
    case 'yearly': return (dy-ay) % n === 0 && dm === am && dd === Math.min(ad, lastDayOf(dy, dm));
    default: return false;
  }
}
export function eventOccursOn(ev, dateStr){
  if(!ev.date || !dateStr || dateStr < ev.date) return false;
  const utc = d => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  const span = ev.endDate && ev.endDate > ev.date ? Math.min(400, Math.round((utc(ev.endDate) - utc(ev.date)) / 86400000)) : 0;
  for(let k = 0; k <= span; k++){
    if(eventStartsOn(ev, k ? addDaysStr(dateStr, -k) : dateStr)) return true;
  }
  return false;
}
export function eventsOnDate(list, dateStr){
  return list.filter(ev => eventOccursOn(ev, dateStr)).sort((a,b) => (a.startTime||'00:00').localeCompare(b.startTime||'00:00'));
}
// próximas ocorrências a partir de fromStr, nos próximos "days" dias; cada item é a agenda com .date da ocorrência
export function upcomingEventOccurrences(list, fromStr, days){
  const out = [];
  for(let i = 0; i <= days; i++){
    const d = addDaysStr(fromStr, i);
    eventsOnDate(list, d).forEach(ev => out.push({ ...ev, date: d }));
  }
  return out;
}
export function getEventsForDate(dateStr){
  return eventsOnDate(eventsInScope(), dateStr);
}
export function eventColor(ev){
  if(ev.tagIds && ev.tagIds.length){
    const tg = G.state.tags.find(t => t.id === ev.tagIds[0]);
    if(tg) return tg.color;
  }
  const cat = catById(ev.categoryId);
  return cat ? cat.color : 'var(--primary)';
}
export function eventPrimaryTagName(ev){
  if(ev.tagIds && ev.tagIds.length){
    const tg = G.state.tags.find(t => t.id === ev.tagIds[0]);
    if(tg) return tg.name;
  }
  return null;
}
export function addDaysStr(dateStr, n){
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateToStr(d);
}
export function startOfWeekStr(dateStr){
  const d = new Date(dateStr + 'T00:00:00');
  const startDay = G.state.weekStartDay || 0;
  const diff = (d.getDay() - startDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return dateToStr(d);
}

