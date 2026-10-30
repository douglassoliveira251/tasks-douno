/* ===================== ROTAS (um endereço por tela) =====================
   A aplicação mora em /app, e o Resumo é a página inicial dela. As outras telas têm caminho próprio:
   /app/tarefas, /app/notas, /app/calendario, /app/projetos, /app/configuracoes. A tela vive em
   currentView; o endereço só acompanha: render() chama syncRouteToView() e o botão voltar/avançar do
   navegador volta aqui. Qualquer outro endereço (/, /app/xyz, /app/resumo) vira /app. Fora de um servidor
   que devolva o index.html para esses caminhos (arquivo aberto direto do disco, ou hospedado numa
   subpasta), usa #/tarefas e, no Resumo, nada depois do endereço. */
const VIEW_ROUTES = { dashboard: '', tasks: 'tarefas', notes: 'notas', calendar: 'calendario', projects: 'projetos', settings: 'configuracoes' };
const ROUTE_VIEWS = Object.fromEntries(Object.entries(VIEW_ROUTES).filter(([, route]) => route).map(([view, route]) => [route, view]));

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
  return ROUTE_VIEWS[String(name || '').toLowerCase()] || 'dashboard';
}
// o endereço já está no formato exato da tela (ex.: /app/resumo e /app/xyz não estão: viram /app)
function routeIsCanonical(){
  const route = VIEW_ROUTES[currentView];
  if(ROUTE_MODE === 'path') return location.pathname.replace(/\/+$/, '') === APP_BASE + (route ? '/' + route : '');
  return location.hash === (route ? '#/' + route : '');
}

let routeSynced = false;
function syncRouteToView(){
  const route = VIEW_ROUTES[currentView];
  if(route === undefined) return;
  document.title = (currentView === 'dashboard' ? '' : (VIEW_TITLES[currentView] || '') + ' · ') + 'DOUNO Tasks';
  if(routeFromLocation() === currentView && routeIsCanonical()){ routeSynced = true; return; }
  const url = ROUTE_MODE === 'path'
    ? APP_BASE + (route ? '/' + route : '') + location.search
    : location.pathname + location.search + (route ? '#/' + route : '');
  // a primeira acomodação (/ vira /app, /app/xyz vira /app) troca o endereço; as seguintes entram no histórico
  try{ history[routeSynced ? 'pushState' : 'replaceState'](null, '', url); }catch(e){}
  routeSynced = true;
}

function onRouteChange(){
  const view = routeFromLocation();
  if(view === currentView) return;
  currentView = view;
  activeTaskId = null;
  creatingNewTask = false;
  creatingNewNote = false;
  pendingNoteNotebookId = null;
  closeMobileSidebar();
  render();
}
window.addEventListener(ROUTE_MODE === 'path' ? 'popstate' : 'hashchange', onRouteChange);

// a tela inicial vem do endereço (sem tela no endereço, é o Resumo)
currentView = routeFromLocation();
