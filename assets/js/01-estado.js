import { G } from './globais.js';
import { todayStr } from './10-helpers.js';

/* ===================== ESTADO ===================== */
export const LS_KEY = 'tyvraTasksState';
export const DEFAULT_COLORS = ['#E2A83D','#2F6F5E','#4A6FA5','#9B5DE5','#C0453A','#3D8B8B','#B5838D'];

export function freshState(){
  return {
    profile: { name: '', email: '', avatar: null },
    categories: [{ id: 'cat_geral', name: 'Geral', color: '#2F6F5E' }],
    tags: [],
    tasks: [],
    notes: [],
    events: [],
    uiGroupCollapse: {},
    showCompletedTasks: false,
    taskIdCounter: 0,
    theme: 'light'
  };
}
G.state = freshState();

G.currentView = 'dashboard';
G.calendarView = 'month'; // 'month' | 'week' | 'day'
G.calendarFocusDate = todayStr();
export let activeEventId = null;
export let creatingNewEvent = false;
G.activeCategoryFilter = null;
/* Filtro de espaço só do Resumo: sempre começa em "Todos" e não mexe no espaço das demais telas */
G.dashboardSpace = null;
export function currentSpaceFilter(){ return G.currentView === 'dashboard' ? G.dashboardSpace : G.activeCategoryFilter; }
G.activeTagFilters = [];
G.taskProjectFilter = 'all'; // all | personal | project | <id do projeto>
G.activeCriticalityFilters = [];
G.criticalityFilterPopoverOpen = false;
G.activeNoteId = null;
G.creatingNewNote = false;
G.pendingNotePrefillTaskId = null;
G.pendingNoteNotebookId = null;
export const expandedNotebookIds = new Set();
G.notesDrawerOpen = false;
G.notesFocusMode = false;
G.draggedNoteId = null;
G.draggedNotebookId = null;
G.searchTerm = '';
G.fileHandle = null;
G.dirty = false;

