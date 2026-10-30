import { G } from './globais.js';
import { closeMobileSidebar } from './45-nav-view-switch.js';
import { VIEW_TITLES, render } from './48-render-principal.js';

/* ===================== ROTAS (um endereço por tela) =====================
   A aplicação mora em /app, e o Resumo é a página inicial dela. As outras telas têm caminho próprio:
   /app/tarefas, /app/notas, /app/calendario, /app/projetos, /app/configuracoes. A tela vive em
   currentView; o endereço só acompanha: render() chama syncRouteToView() e o botão voltar/avançar do
   navegador volta aqui. Qualquer outro endereço (/, /app/xyz, /app/resumo) vira /app. Hospedado numa subpasta (onde o servidor
   não devolve o index.html para esses caminhos), usa #/tarefas e, no Resumo, nada depois do endereço. */
export const VIEW_ROUTES = { dashboard: '', tasks: 'tarefas', notes: 'notas', calendar: 'calendario', projects: 'projetos', settings: 'configuracoes' };
export const ROUTE_VIEWS = Object.fromEntries(Object.entries(VIEW_ROUTES).filter(([, route]) => route).map(([view, route]) => [route, view]));

export const APP_BASE = '/app';
export const pathSegments = () => location.pathname.split('/').filter(Boolean);

export const ROUTE_MODE = (() => {
  if(location.protocol !== 'http:' && location.protocol !== 'https:') return 'hash';
  const segs = pathSegments();
  return (!segs.length || (segs.length === 1 && segs[0] === 'index.html') || segs[0] === 'app') ? 'path' : 'hash';
})();

export function routeFromLocation(){
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
export function routeIsCanonical(){
  const route = VIEW_ROUTES[G.currentView];
  if(ROUTE_MODE === 'path') return location.pathname.replace(/\/+$/, '') === APP_BASE + (route ? '/' + route : '');
  return location.hash === (route ? '#/' + route : '');
}

G.routeSynced = false;
export function syncRouteToView(){
  const route = VIEW_ROUTES[G.currentView];
  if(route === undefined) return;
  document.title = (G.currentView === 'dashboard' ? '' : (VIEW_TITLES[G.currentView] || '') + ' · ') + 'DOUNO Tasks';
  if(routeFromLocation() === G.currentView && routeIsCanonical()){ G.routeSynced = true; return; }
  const url = ROUTE_MODE === 'path'
    ? APP_BASE + (route ? '/' + route : '') + location.search
    : location.pathname + location.search + (route ? '#/' + route : '');
  // a primeira acomodação (/ vira /app, /app/xyz vira /app) troca o endereço; as seguintes entram no histórico
  try{ history[G.routeSynced ? 'pushState' : 'replaceState'](null, '', url); }catch(e){}
  G.routeSynced = true;
}

export function onRouteChange(){
  const view = routeFromLocation();
  if(view === G.currentView) return;
  G.currentView = view;
  G.activeTaskId = null;
  G.creatingNewTask = false;
  G.creatingNewNote = false;
  G.pendingNoteNotebookId = null;
  closeMobileSidebar();
  render();
}
window.addEventListener(ROUTE_MODE === 'path' ? 'popstate' : 'hashchange', onRouteChange);

// a tela inicial vem do endereço (sem tela no endereço, é o Resumo)
G.currentView = routeFromLocation();
