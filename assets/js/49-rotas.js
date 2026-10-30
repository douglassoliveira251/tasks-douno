/* ===================== ROTAS (um endereço por tela) =====================
   A aplicação mora em /app: /app/resumo, /app/tarefas, /app/notas, /app/calendario, /app/projetos,
   /app/configuracoes. A tela vive em currentView; o endereço só acompanha: render() chama
   syncRouteToView() e o botão voltar/avançar do navegador volta aqui. Em /app (ou em /), abre a última
   tela usada (Tarefas na primeira vez). Fora de um servidor que devolva o index.html para esses caminhos
   (arquivo aberto direto do disco, ou hospedado numa subpasta), usa #/tarefas. */
const VIEW_ROUTES = { dashboard: 'resumo', tasks: 'tarefas', notes: 'notas', calendar: 'calendario', projects: 'projetos', settings: 'configuracoes' };
const ROUTE_VIEWS = Object.fromEntries(Object.entries(VIEW_ROUTES).map(([view, route]) => [route, view]));
const LAST_VIEW_KEY = 'dounoLastView';

const APP_BASE = '/app';
const pathSegments = () => location.pathname.split('/').filter(Boolean);

const ROUTE_MODE = (() => {
  if(location.protocol !== 'http:' && location.protocol !== 'https:') return 'hash';
  const segs = pathSegments();
  return (!segs.length || (segs.length === 1 && segs[0] === 'index.html') || segs[0] === 'app') ? 'path' : 'hash';
})();

function routeFromLocation(){
  let name;
  if(ROUTE_MODE === 'path'){
    const segs = pathSegments();
    name = segs[0] === 'app' ? segs[1] : null;
  } else {
    name = location.hash.replace(/^#/, '').split('/').filter(Boolean)[0];
  }
  return ROUTE_VIEWS[String(name || '').toLowerCase()] || null;
}
function lastUsedView(){
  try{
    const v = localStorage.getItem(LAST_VIEW_KEY);
    if(VIEW_ROUTES[v]) return v;
  }catch(e){}
  return 'tasks';
}

let routeSynced = false;
function syncRouteToView(){
  const route = VIEW_ROUTES[currentView];
  if(!route) return;
  try{ localStorage.setItem(LAST_VIEW_KEY, currentView); }catch(e){}
  document.title = (VIEW_TITLES[currentView] || 'DOUNO Tasks') + ' · DOUNO Tasks';
  if(routeFromLocation() === currentView){ routeSynced = true; return; }
  const url = ROUTE_MODE === 'path'
    ? APP_BASE + '/' + route + location.search
    : location.pathname + location.search + '#/' + route;
  // a primeira acomodação (/ ou /app viram /app/tarefas) troca o endereço; as seguintes entram no histórico
  try{ history[routeSynced ? 'pushState' : 'replaceState'](null, '', url); }catch(e){}
  routeSynced = true;
}

function onRouteChange(){
  const view = routeFromLocation();
  if(!view || view === currentView) return;
  currentView = view;
  activeTaskId = null;
  creatingNewTask = false;
  creatingNewNote = false;
  pendingNoteNotebookId = null;
  closeMobileSidebar();
  render();
}
window.addEventListener(ROUTE_MODE === 'path' ? 'popstate' : 'hashchange', onRouteChange);

// a tela inicial vem do endereço; sem tela no endereço, da última usada
currentView = routeFromLocation() || lastUsedView();
