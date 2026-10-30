import { G } from './globais.js';
import { closeAboutModal } from './03-outlook.js';
import { closeWhatsNew } from './05-novidades-painel.js';
import { closeHelpPanel } from './06-cabecalho-e-ajuda.js';
import { catById, todayStr, uid } from './10-helpers.js';
import { closeNoteComposer } from './24-render-notes.js';
import { closeEventComposer } from './28-calendario-eventos.js';
import { closeMobileSidebar } from './45-nav-view-switch.js';
import { closeSearchResultsDropdown } from './46-busca-e-notificacoes.js';
import { render } from './48-render-principal.js';

/* Concluir leva a subtarefa para o fim da lista e guarda onde ela estava (as pendentes que vinham
   depois dela, na ordem). Desmarcar devolve ao mesmo lugar: antes da primeira dessas ainda pendente
   ou, se não sobrou nenhuma, no fim das pendentes. Sem posição guardada (concluída de antes ou
   criada já concluída), desmarcar não muda a ordem. A posição fica no próprio estado, então
   sobrevive a recarregar a página e a sincronizar. */
export function toggleSubtaskDone(task, sub){
  const list = task.subtasks;
  const i = list.indexOf(sub);
  if(!sub.done){
    sub.done = true;
    sub.nextIds = list.slice(i + 1).filter(x => !x.done).map(x => x.id);
    sub.prevIdx = i;
    list.splice(i, 1);
    list.push(sub);
    return;
  }
  sub.done = false;
  const hasMemory = Array.isArray(sub.nextIds) || sub.prevIdx != null;
  if(hasMemory){
    list.splice(i, 1);
    let at = -1;
    if(Array.isArray(sub.nextIds)){
      const ref = sub.nextIds.map(id => list.find(x => x.id === id)).find(x => x && !x.done);
      at = ref ? list.indexOf(ref) : list.findIndex(x => x.done);
    } else {
      at = Math.min(sub.prevIdx, list.findIndex(x => x.done) < 0 ? list.length : list.findIndex(x => x.done));
    }
    if(at < 0) at = list.length;
    list.splice(at, 0, sub);
  }
  delete sub.nextIds;
  delete sub.prevIdx;
}

/* ===================== PAINEL LATERAL DE TAREFA ===================== */
export function openTaskPanel(taskId){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  G.activeTaskId = taskId;
  G.creatingNewTask = false;
  G.tagsPopoverOpen = false;
  render();
}

export function openNewTaskPanel(){
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  G.activeTaskId = null;
  G.creatingNewTask = true;
  G.tagsPopoverOpen = false;
  render();
}

/* Comentário em digitação é guardado por tarefa ('__new__' = tarefa ainda não
   criada). Antes, qualquer alteração de campo redesenhava o painel e o texto do
   comentário sumia; agora ele é restaurado a cada redesenho. */
export const COMMENT_DRAFTS_KEY = 'dounoCommentDrafts';
G.tpCommentDrafts = {};
try{ G.tpCommentDrafts = JSON.parse(sessionStorage.getItem(COMMENT_DRAFTS_KEY) || '{}') || {}; }catch(e){ G.tpCommentDrafts = {}; }
export function saveCommentDrafts(){
  try{ sessionStorage.setItem(COMMENT_DRAFTS_KEY, JSON.stringify(G.tpCommentDrafts)); }catch(e){}
}
export function currentCommentKey(){ return G.creatingNewTask ? '__new__' : G.activeTaskId; }
export function showUnsentCommentDialog(){
  let ov = document.getElementById('unsentCommentOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = 'unsentCommentOverlay';
    ov.style.zIndex = '120';
    ov.innerHTML = `<div class="modal" style="width:420px; max-width:calc(100vw - 24px);">
      <h3 style="margin-bottom:8px;">Comentário não enviado</h3>
      <p style="font-size:13.5px; color:var(--ink-soft); line-height:1.5; margin-bottom:14px;">Você escreveu um comentário e ainda não enviou. O que deseja fazer?</p>
      <div class="modal-footer" style="flex-wrap:wrap;">
        <button type="button" class="btn ghost small" id="unsentBack">Voltar</button>
        <button type="button" class="btn ghost small" id="unsentDiscard" style="color:var(--danger); border-color:var(--danger-light);">Descartar</button>
        <button type="button" class="btn small" id="unsentSend">Enviar e fechar</button>
      </div></div>`;
    document.body.appendChild(ov);
  }
  const key = currentCommentKey();
  const hide = () => ov.classList.remove('show');
  ov.querySelector('#unsentBack').onclick = hide;
  ov.querySelector('#unsentDiscard').onclick = () => { delete G.tpCommentDrafts[key]; saveCommentDrafts(); hide(); closeTaskPanel(true); };
  ov.querySelector('#unsentSend').onclick = () => {
    const text = (G.tpCommentDrafts[key] || '').trim();
    hide();
    if(text){
      const t = getOrCreateActiveTask();
      if(t){
        t.comments = t.comments || [];
        t.comments.push({ id: uid('cmt'), text, createdAt: Date.now() });
      }
    }
    delete G.tpCommentDrafts[key];
    saveCommentDrafts();
    closeTaskPanel(true);
  };
  ov.classList.add('show');
  setTimeout(() => ov.querySelector('#unsentBack').focus(), 0);
}
export function closeTaskPanel(force){
  if(force !== true){
    const draft = (G.tpCommentDrafts[currentCommentKey()] || '').trim();
    if(draft){ showUnsentCommentDialog(); return; }
  }
  const panel = document.querySelector('.task-panel');
  if(panel && document.activeElement && panel.contains(document.activeElement) && typeof document.activeElement.blur === 'function'){
    document.activeElement.blur();
  }
  G.activeTaskId = null;
  G.creatingNewTask = false;
  G.tagsPopoverOpen = false;
  render();
}

G.taskPanelMouseDownOutside = false;
document.addEventListener('mousedown', (e) => {
  if(G.currentView !== 'tasks' && G.currentView !== 'projects') return;
  if(!(G.activeTaskId || G.creatingNewTask)) return;
  const panel = document.querySelector('.task-panel');
  G.taskPanelMouseDownOutside = !panel || !panel.contains(e.target);
}, true);

document.addEventListener('click', (e) => {
  if(G.currentView !== 'tasks' && G.currentView !== 'projects') return;
  if(!(G.activeTaskId || G.creatingNewTask)) return;
  if(!G.taskPanelMouseDownOutside) return;
  const panel = document.querySelector('.task-panel');
  if(!panel || panel.contains(e.target)) return;
  if(e.target.closest && (
    e.target.closest('.task-row') ||
    e.target.closest('.gantt-task') || e.target.closest('.gantt-add') || e.target.closest('.proj-side-task') ||
    e.target.closest('.icon-add-btn') ||
    e.target.closest('.task-menu-portal') ||
    e.target.closest('.confirm-action-portal') ||
    e.target.closest('.color-popover-portal') ||
    e.target.closest('.tags-picker-portal')
  )) return;
  closeTaskPanel();
}, true);

document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  if((G.currentView === 'tasks' || G.currentView === 'projects') && (G.activeTaskId || G.creatingNewTask)){
    closeTaskPanel();
    return;
  }
  if(G.currentView === 'notes' && (G.activeNoteId || G.creatingNewNote)){
    closeNoteComposer();
    return;
  }
  if(document.getElementById('eventComposerOverlay').classList.contains('show')){
    closeEventComposer();
    return;
  }
  if(document.getElementById('whatsNewOverlay').classList.contains('show')){
    closeWhatsNew();
    return;
  }
  if(document.getElementById('aboutOverlay').classList.contains('show')){
    closeAboutModal();
    return;
  }
  if(document.getElementById('helpPanel').classList.contains('show')){
    closeHelpPanel();
    return;
  }
  if(document.querySelector('.sidebar').classList.contains('mobile-open')){
    closeMobileSidebar();
    return;
  }
  if(document.getElementById('searchResultsDropdown').style.display !== 'none'){
    closeSearchResultsDropdown();
  }
});

document.addEventListener('click', (e) => {
  if(!G.tagsPopoverOpen) return;
  const popover = document.getElementById('tpTagsPopover');
  const toggleBtn = document.getElementById('tpTagsToggleBtn');
  if(popover && toggleBtn && !popover.contains(e.target) && !toggleBtn.contains(e.target)){
    G.tagsPopoverOpen = false;
    render();
  }
});


export function getOrCreateActiveTask(){
  if(G.creatingNewTask){
    const defaultCat = (G.activeCategoryFilter && catById(G.activeCategoryFilter)) ? G.activeCategoryFilter : G.state.categories[0].id;
    G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
    const t = {
      id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'),
      title:'', categoryId: defaultCat, done:false, status:'nao_iniciado',
      dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority:'media', description:'',
      tagIds:[], recurrence:'none', subtasks:[], comments:[], attachments:[], createdAt: Date.now()
    };
    G.state.tasks.push(t);
    if(G.tpCommentDrafts['__new__'] !== undefined){ G.tpCommentDrafts[t.id] = G.tpCommentDrafts['__new__']; delete G.tpCommentDrafts['__new__']; saveCommentDrafts(); }
    G.activeTaskId = t.id;
    G.creatingNewTask = false;
    return t;
  }
  return G.state.tasks.find(x => x.id === G.activeTaskId);
}

export const RECURRENCE_LABELS = { none:'Não repete', daily:'Diariamente', weekly:'Semanalmente', monthly:'Mensalmente', yearly:'Anualmente' };
export const RECURRENCE_UNIT_SINGULAR = { daily:'dia', weekly:'semana', monthly:'mês', yearly:'ano' };
export const RECURRENCE_UNIT_PLURAL = { daily:'dias', weekly:'semanas', monthly:'meses', yearly:'anos' };

export function recurrenceSummaryLabel(task){
  if(!task.recurrence || task.recurrence === 'none') return 'Não repete';
  const n = task.recurrenceInterval || 1;
  if(n === 1) return RECURRENCE_LABELS[task.recurrence];
  return `A cada ${n} ${RECURRENCE_UNIT_PLURAL[task.recurrence]}`;
}

