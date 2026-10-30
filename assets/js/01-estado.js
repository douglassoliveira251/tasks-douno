/* ===================== ESTADO ===================== */
const LS_KEY = 'tyvraTasksState';
const DEFAULT_COLORS = ['#E2A83D','#2F6F5E','#4A6FA5','#9B5DE5','#C0453A','#3D8B8B','#B5838D'];

function freshState(){
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
let state = freshState();

let currentView = 'dashboard';
let calendarView = 'month'; // 'month' | 'week' | 'day'
let calendarFocusDate = todayStr();
let activeEventId = null;
let creatingNewEvent = false;
let activeCategoryFilter = null;
/* Filtro de espaço só do Resumo: sempre começa em "Todos" e não mexe no espaço das demais telas */
let dashboardSpace = null;
function currentSpaceFilter(){ return currentView === 'dashboard' ? dashboardSpace : activeCategoryFilter; }
let activeTagFilters = [];
let taskProjectFilter = 'all'; // all | personal | project | <id do projeto>
let activeCriticalityFilters = [];
let criticalityFilterPopoverOpen = false;
let activeNoteId = null;
let creatingNewNote = false;
let pendingNotePrefillTaskId = null;
let pendingNoteNotebookId = null;
const expandedNotebookIds = new Set();
let notesDrawerOpen = false;
let notesFocusMode = false;
let draggedNoteId = null;
let draggedNotebookId = null;
let searchTerm = '';
let fileHandle = null;
let dirty = false;

