import { G } from './globais.js';
import { addDaysStr } from './25-calendario.js';
import { markDirty } from './08-persistencia.js';
import { showToast, showUndoToast } from './42-nuvem-persistencia.js';

/* ===================== HELPERS ===================== */
export function uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
export function catById(id){ return G.state.categories.find(c => c.id === id); }
/* Texto para comparar em buscas: minúsculo e sem acento (á→a, ç→c), mantendo o mesmo tamanho do original
   (os índices de um texto "dobrado" valem no texto de origem, para destacar o trecho achado). */
export function fold(s){ return String(s == null ? '' : s).replace(/[À-ɏ]/g, c => c.normalize('NFD').charAt(0)).toLowerCase(); }
export function togglePinned(t){
  t.pinned = !t.pinned;
  if(t.pinned && G.state.onboarding) G.state.onboarding.pinned = true; // marca o passo "fixar" do cartão Comece por aqui
}
export function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
export function fmtDate(d){
  if(!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}
export function fmtFriendlyDate(d){
  if(!d) return '';
  const todayS = todayStr();
  if(d === todayS) return 'Hoje';
  if(d === addDaysStr(todayS, 1)) return 'Amanhã';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}
export function fmtEditedLabel(ts){
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
export function isOverdue(d, done){
  if(!d || done) return false;
  return new Date(d + 'T23:59:59') < new Date();
}
export function pad2(n){ return String(n).padStart(2,'0'); }
export function dateToStr(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
export function todayStr(){ return dateToStr(new Date()); }
export const DEFAULT_DUE_TIME = '08:00';

export function advanceDateByRecurrence(dateStr, recurrence, interval){
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

/* Concluir uma tarefa recorrente remove a ocorrência e cria a próxima. Para a conclusão continuar
   contando (cabeçalho, painel de resumo) sem aparecer como uma tarefa a mais em "Concluídas", ela é
   registrada em state.completedLog: um registro enxuto, com o formato mínimo de tarefa concluída. */
export function completeRecurring(task, prevStatus){
  const idx = G.state.tasks.indexOf(task);
  const next = spawnNextRecurrence(task);
  if(!next) return null;
  if(!Array.isArray(G.state.completedLog)) G.state.completedLog = [];
  const completedAt = task.completedAt || Date.now();
  const entry = {
    id: uid('rc'), title: task.title, categoryId: task.categoryId, priority: task.priority, tagIds: (task.tagIds||[]).slice(),
    projectId: task.projectId || null, dueDate: task.dueDate || null, createdAt: task.createdAt || completedAt, completedAt,
    done: true, status: 'concluida', recurring: true,
  };
  G.state.completedLog.push(entry);
  const limit = Date.now() - 400 * 86400000;
  G.state.completedLog = G.state.completedLog.filter(e => e.completedAt >= limit);
  /* Desfazer: devolve a ocorrência original (pendente, na mesma posição), apaga a próxima e tira a conclusão do registro. */
  showUndoToast('Concluída. Próxima: ' + fmtDate(next.dueDate) + '.', 'Desfazer', () => {
    if(!G.state.tasks.includes(next) || next.done){ showToast('Não dá mais para desfazer: a próxima ocorrência já foi alterada.'); return; }
    task.done = false;
    task.status = prevStatus && prevStatus !== 'concluida' ? prevStatus : 'nao_iniciado';
    task.completedAt = null;
    G.state.tasks = G.state.tasks.filter(x => x.id !== next.id && x.id !== task.id);
    G.state.tasks.splice(idx >= 0 ? Math.min(idx, G.state.tasks.length) : G.state.tasks.length, 0, task);
    G.state.completedLog = G.state.completedLog.filter(e => e.id !== entry.id);
    if(G.activeTaskId === next.id){ G.activeTaskId = task.id; G.creatingNewTask = false; }
    markDirty();
  });
  return next;
}

export function spawnNextRecurrence(task){
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
  G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
  const next = {
    id: uid('task'),
    shortId: String(G.state.taskIdCounter).padStart(4, '0'),
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
  G.state.tasks.push(next);
  return next;
}

