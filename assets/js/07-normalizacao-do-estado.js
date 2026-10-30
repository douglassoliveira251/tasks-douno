import { G } from './globais.js';
import { uid } from './10-helpers.js';

export function normalizeState(){
  if(!G.state.profile) G.state.profile = { name:'', email:'', avatar:null };
  if(!G.state.tags) G.state.tags = [];
  if(!Array.isArray(G.state.emailHistory)) G.state.emailHistory = [];
  if(!Array.isArray(G.state.taskTemplates)) G.state.taskTemplates = [];
  if(!Array.isArray(G.state.projects)) G.state.projects = [];
  G.state.projects.forEach(p => { if(!Array.isArray(p.stages)) p.stages = []; });
  if(!G.state.tasks) G.state.tasks = [];
  if(!G.state.notes) G.state.notes = [];
  if(!G.state.events) G.state.events = [];
  G.state.events.forEach(ev => {
    if(ev.tagIds === undefined) ev.tagIds = [];
    if(ev.allDay === undefined) ev.allDay = !ev.startTime;
    if(ev.recurrence === undefined) ev.recurrence = 'none';
    if(ev.recurrenceInterval === undefined) ev.recurrenceInterval = 1;
    if(ev.recurrenceBaseDate === undefined) ev.recurrenceBaseDate = ev.date || null;
    if(ev.recurrenceEndDate === undefined) ev.recurrenceEndDate = null;
    if(ev.linkedTaskId === undefined) ev.linkedTaskId = null;
    if(ev.endDate === undefined) ev.endDate = ev.date || null;
    if(ev.updatedAt === undefined) ev.updatedAt = ev.createdAt || null;
    if(ev.description === undefined) ev.description = '';
    if(ev.outlookEventId === undefined) ev.outlookEventId = null;
  });
  if(!G.state.uiGroupCollapse) G.state.uiGroupCollapse = {};
  if(G.state.defaultCategoryFilter === undefined) G.state.defaultCategoryFilter = null;
  if(!G.state.categoryOrder) G.state.categoryOrder = 'creation';
  if(!G.state.categoryGroupModes) G.state.categoryGroupModes = {};
  G.lastGroupModeKey = null; // dados novos carregados: reaplica o agrupamento guardado no próximo render
  if(!G.state.categoryCalendarViews) G.state.categoryCalendarViews = {};
  if(!G.state.theme) G.state.theme = 'light';
  if(!G.state.calendarHourDensity) G.state.calendarHourDensity = 'normal';
  if(!G.state.calendarViewDefault) G.state.calendarViewDefault = 'month';
  if(G.state.weekStartDay === undefined) G.state.weekStartDay = 0;
  if(!Array.isArray(G.state.notebooks)) G.state.notebooks = [];
  if(!G.state.lastActiveNoteBySpace || typeof G.state.lastActiveNoteBySpace !== 'object') G.state.lastActiveNoteBySpace = {};
  G.state.categories.forEach(cat => {
    const hasNotebook = G.state.notebooks.some(nb => nb.categoryId === cat.id);
    const hasNotes = G.state.notes.some(n => n.categoryId === cat.id);
    if(!hasNotebook && hasNotes){
      const nb = { id: uid('nb'), name: 'Notas', categoryId: cat.id, createdAt: Date.now() };
      G.state.notebooks.push(nb);
      G.state.notes.forEach(n => { if(n.categoryId === cat.id && !n.notebookId) n.notebookId = nb.id; });
    }
  });
  G.state.notes.forEach(n => {
    if(n.notebookId === undefined) n.notebookId = null;
    if(n.notebookId){
      const nb = G.state.notebooks.find(x => x.id === n.notebookId);
      if(!nb || nb.categoryId !== n.categoryId) n.notebookId = null;
    }
    if(!n.notebookId){
      let nb = G.state.notebooks.find(x => x.categoryId === n.categoryId);
      if(!nb){
        nb = { id: uid('nb'), name: 'Notas', categoryId: n.categoryId, createdAt: Date.now() };
        G.state.notebooks.push(nb);
      }
      n.notebookId = nb.id;
    }
  });
  if(!G.state.tagOrder) G.state.tagOrder = 'creation';
  if(G.state.showCompletedTasks === undefined) G.state.showCompletedTasks = false;
  if(!G.state.notebooksColWidth) G.state.notebooksColWidth = 260;
  G.state.tags.forEach(tg => { if(tg.categoryId === undefined) tg.categoryId = null; });
  G.state.notes.forEach(n => {
    if(n.attachments === undefined) n.attachments = [];
    if(n.tagIds === undefined) n.tagIds = [];
    if(n.linkedTaskId === undefined) n.linkedTaskId = null;
    if(n.pinnedAt === undefined) n.pinnedAt = n.pinned ? (n.updatedAt || Date.now()) : null;
  });
  G.state.tasks.forEach(t => {
    if(t.description === undefined) t.description = '';
    if(t.dueTime === undefined) t.dueTime = null;
    if(t.tagIds === undefined) t.tagIds = [];
    if(t.recurrence === undefined) t.recurrence = 'none';
    if(t.subtasks === undefined) t.subtasks = [];
    if(t.comments === undefined) t.comments = [];
    if(t.attachments === undefined) t.attachments = [];
    if(t.status === undefined) t.status = t.done ? 'concluida' : 'nao_iniciado';
    if(t.pinnedAt === undefined) t.pinnedAt = t.pinned ? Date.now() : null;
    if(t.completedAt === undefined) t.completedAt = t.done ? (t.updatedAt || t.createdAt || null) : null;
    if(t.recurrenceInterval === undefined) t.recurrenceInterval = 1;
    if(t.recurrenceTime === undefined) t.recurrenceTime = (t.recurrence && t.recurrence !== 'none') ? (t.dueTime || null) : null;
    if(t.recurrenceBaseDate === undefined) t.recurrenceBaseDate = (t.recurrence && t.recurrence !== 'none') ? (t.dueDate || null) : null;
    if(t.recurrenceEndDate === undefined) t.recurrenceEndDate = null;
    if(t.remindBefore === undefined) t.remindBefore = 0;
  });
  if(G.state.taskIdCounter === undefined) G.state.taskIdCounter = 0;
  G.state.tasks.forEach(t => { if(t.shortId && /^t\d+$/.test(t.shortId)) t.shortId = t.shortId.slice(1); });
  const tasksNeedingId = G.state.tasks.filter(t => !t.shortId).sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  tasksNeedingId.forEach(t => {
    G.state.taskIdCounter++;
    t.shortId = String(G.state.taskIdCounter).padStart(4, '0');
  });
}

