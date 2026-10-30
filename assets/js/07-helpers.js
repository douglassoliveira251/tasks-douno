/* ===================== HELPERS ===================== */
function uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function catById(id){ return state.categories.find(c => c.id === id); }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtDate(d){
  if(!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}
function fmtFriendlyDate(d){
  if(!d) return '';
  const todayS = todayStr();
  if(d === todayS) return 'Hoje';
  if(d === addDaysStr(todayS, 1)) return 'Amanhã';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function fmtEditedLabel(ts){
  if(!ts) return '';
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  const dStr = dateToStr(d);
  const todayS = todayStr();
  const yestS = addDaysStr(todayS, -1);
  if(dStr === todayS) return `hoje, ${timeStr}`;
  if(dStr === yestS) return `ontem, ${timeStr}`;
  const [y,m,day] = dStr.split('-');
  return `em ${day}/${m}/${y}`;
}
function isOverdue(d, done){
  if(!d || done) return false;
  return new Date(d + 'T23:59:59') < new Date();
}
function pad2(n){ return String(n).padStart(2,'0'); }
function dateToStr(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function todayStr(){ return dateToStr(new Date()); }
const DEFAULT_DUE_TIME = '08:00';

function advanceDateByRecurrence(dateStr, recurrence, interval){
  const n = Math.max(1, parseInt(interval, 10) || 1);
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  switch(recurrence){
    case 'daily': base.setDate(base.getDate()+n); break;
    case 'weekly': base.setDate(base.getDate()+7*n); break;
    case 'monthly': base.setMonth(base.getMonth()+n); break;
    case 'yearly': base.setFullYear(base.getFullYear()+n); break;
    default: return dateStr;
  }
  return dateToStr(base);
}

function spawnNextRecurrence(task){
  /* A proxima data parte sempre do "A partir de" (recurrenceBaseDate), nunca do
     dueDate atual: dueDate é só quando o usuário planeja fazer essa ocorrência e
     pode ser editado livremente (ex. adiar de dia 1 pra dia 4) sem afetar o
     cálculo da recorrência. Sem isso, editar o prazo antes de concluir mudava
     a base do cálculo e desalinhava a cadência (ex. semanal criada dia 1,
     replanejada pra dia 4 e concluída ali, gerava a próxima em dia 11 em vez
     de dia 8). */
  const baseDate = task.recurrenceBaseDate || task.dueDate;
  const nextDueDate = advanceDateByRecurrence(baseDate, task.recurrence, task.recurrenceInterval);
  if(task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) return null;
  state.taskIdCounter = (state.taskIdCounter || 0) + 1;
  const next = {
    id: uid('task'),
    shortId: String(state.taskIdCounter).padStart(4, '0'),
    title: task.title,
    categoryId: task.categoryId,
    done: false,
    status: 'nao_iniciado',
    dueDate: nextDueDate,
    /* a próxima ocorrência volta ao radar de retomada no dia dela, ou remindBefore dias antes (nunca no passado) */
    followUpDate: (() => { const f = addDaysStr(nextDueDate, -(parseInt(task.remindBefore, 10) || 0)); return f < todayStr() ? todayStr() : f; })(),
    remindBefore: parseInt(task.remindBefore, 10) || 0,
    dueTime: task.dueTime,
    priority: task.priority,
    description: task.description || '',
    tagIds: (task.tagIds||[]).slice(),
    recurrence: task.recurrence,
    recurrenceInterval: task.recurrenceInterval || 1,
    /* Vira o novo "A partir de": a proxima ocorrencia calcula a data dela a
       partir desta, mantendo a cadencia (ex. semanal) andando certinho mesmo
       que essa ocorrencia seja concluida atrasada ou tenha o prazo editado. */
    recurrenceBaseDate: nextDueDate,
    recurrenceEndDate: task.recurrenceEndDate || null,
    subtasks: (task.subtasks||[]).map(s => ({ id: uid('sub'), title: s.title, done:false })),
    comments: [],
    attachments: [],
    createdAt: Date.now()
  };
  state.tasks.push(next);
  return next;
}

