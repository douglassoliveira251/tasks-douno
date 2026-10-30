function normalizeState(){
  if(!state.profile) state.profile = { name:'', email:'', avatar:null };
  if(!state.tags) state.tags = [];
  if(!Array.isArray(state.emailHistory)) state.emailHistory = [];
  if(!Array.isArray(state.taskTemplates)) state.taskTemplates = [];
  if(!Array.isArray(state.projects)) state.projects = [];
  state.projects.forEach(p => { if(!Array.isArray(p.stages)) p.stages = []; });
  if(!state.tasks) state.tasks = [];
  if(!state.notes) state.notes = [];
  if(!state.events) state.events = [];
  state.events.forEach(ev => {
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
  if(!state.uiGroupCollapse) state.uiGroupCollapse = {};
  if(state.defaultCategoryFilter === undefined) state.defaultCategoryFilter = null;
  if(!state.categoryOrder) state.categoryOrder = 'creation';
  if(!state.categoryGroupModes) state.categoryGroupModes = {};
  lastGroupModeKey = null; // dados novos carregados: reaplica o agrupamento guardado no próximo render
  if(!state.categoryCalendarViews) state.categoryCalendarViews = {};
  if(!state.theme) state.theme = 'light';
  if(!state.calendarHourDensity) state.calendarHourDensity = 'normal';
  if(!state.calendarViewDefault) state.calendarViewDefault = 'month';
  if(state.weekStartDay === undefined) state.weekStartDay = 0;
  if(!Array.isArray(state.notebooks)) state.notebooks = [];
  if(!state.lastActiveNoteBySpace || typeof state.lastActiveNoteBySpace !== 'object') state.lastActiveNoteBySpace = {};
  state.categories.forEach(cat => {
    const hasNotebook = state.notebooks.some(nb => nb.categoryId === cat.id);
    const hasNotes = state.notes.some(n => n.categoryId === cat.id);
    if(!hasNotebook && hasNotes){
      const nb = { id: uid('nb'), name: 'Notas', categoryId: cat.id, createdAt: Date.now() };
      state.notebooks.push(nb);
      state.notes.forEach(n => { if(n.categoryId === cat.id && !n.notebookId) n.notebookId = nb.id; });
    }
  });
  state.notes.forEach(n => {
    if(n.notebookId === undefined) n.notebookId = null;
    if(n.notebookId){
      const nb = state.notebooks.find(x => x.id === n.notebookId);
      if(!nb || nb.categoryId !== n.categoryId) n.notebookId = null;
    }
    if(!n.notebookId){
      let nb = state.notebooks.find(x => x.categoryId === n.categoryId);
      if(!nb){
        nb = { id: uid('nb'), name: 'Notas', categoryId: n.categoryId, createdAt: Date.now() };
        state.notebooks.push(nb);
      }
      n.notebookId = nb.id;
    }
  });
  if(!state.tagOrder) state.tagOrder = 'creation';
  if(state.showCompletedTasks === undefined) state.showCompletedTasks = false;
  if(!state.notebooksColWidth) state.notebooksColWidth = 260;
  state.tags.forEach(tg => { if(tg.categoryId === undefined) tg.categoryId = null; });
  state.notes.forEach(n => {
    if(n.attachments === undefined) n.attachments = [];
    if(n.tagIds === undefined) n.tagIds = [];
    if(n.linkedTaskId === undefined) n.linkedTaskId = null;
    if(n.pinnedAt === undefined) n.pinnedAt = n.pinned ? (n.updatedAt || Date.now()) : null;
  });
  state.tasks.forEach(t => {
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
  if(state.taskIdCounter === undefined) state.taskIdCounter = 0;
  state.tasks.forEach(t => { if(t.shortId && /^t\d+$/.test(t.shortId)) t.shortId = t.shortId.slice(1); });
  const tasksNeedingId = state.tasks.filter(t => !t.shortId).sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  tasksNeedingId.forEach(t => {
    state.taskIdCounter++;
    t.shortId = String(state.taskIdCounter).padStart(4, '0');
  });
}

