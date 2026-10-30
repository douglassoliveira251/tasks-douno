/* ===================== PROJETOS ===================== */
let activeProjectId = null;
let projectTab = 'timeline';
let ganttFit = false, ganttZoom = 'fit', ganttFilter = 'all', ganttScroll = 0, ganttCenterToday = true, ganttLastProject = null;
function defaultProjectTab(){ return window.matchMedia && window.matchMedia('(max-width:768px)').matches ? 'lista' : 'timeline'; }
let selectedStageId = null;

/* Ícones do projeto: conjunto do Lucide (https://lucide.dev, licença ISC), embutido no arquivo. */
const PROJECT_ICONS = {"house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />","building-2":"<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\" /> <path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\" /> <path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\" /> <path d=\"M10 6h4\" /> <path d=\"M10 10h4\" /> <path d=\"M10 14h4\" /> <path d=\"M10 18h4\" />","hammer":"<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\" /> <path d=\"m18 15 4-4\" /> <path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\" />","wrench":"<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\" />","briefcase":"<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\" /> <rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\" />","rocket":"<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\" /> <path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\" /> <path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\" /> <path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\" />","target":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <circle cx=\"12\" cy=\"12\" r=\"6\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" />","flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\" /> <line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","palette":"<circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /> <path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\" />","code":"<polyline points=\"16 18 22 12 16 6\" /> <polyline points=\"8 6 2 12 8 18\" />","laptop":"<path d=\"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16\" />","smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\" /> <path d=\"M12 18h.01\" />","shopping-cart":"<circle cx=\"8\" cy=\"21\" r=\"1\" /> <circle cx=\"19\" cy=\"21\" r=\"1\" /> <path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\" />","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /> <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />","banknote":"<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"M6 12h.01M18 12h.01\" />","graduation-cap":"<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\" /> <path d=\"M22 10v6\" /> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\" />","book-open":"<path d=\"M12 7v14\" /> <path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\" />","heart":"<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />","plane":"<path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\" />","car":"<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\" /> <circle cx=\"7\" cy=\"17\" r=\"2\" /> <path d=\"M9 17h6\" /> <circle cx=\"17\" cy=\"17\" r=\"2\" />","truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /> <path d=\"M15 18H9\" /> <path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\" /> <circle cx=\"17\" cy=\"18\" r=\"2\" /> <circle cx=\"7\" cy=\"18\" r=\"2\" />","camera":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\" /> <circle cx=\"12\" cy=\"13\" r=\"3\" />","music":"<path d=\"M9 18V5l12-2v13\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <circle cx=\"18\" cy=\"16\" r=\"3\" />","megaphone":"<path d=\"m3 11 18-5v12L3 14v-3z\" /> <path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\" />","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />","calendar":"<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" />","chart-line":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"m19 9-5 5-4-4-3 3\" />","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /> <path d=\"M12 22V12\" /> <path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /> <path d=\"m7.5 4.27 9 5.15\" />","leaf":"<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\" /> <path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />","shield":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" />","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />","store":"<path d=\"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7\" /> <path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\" /> <path d=\"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4\" /> <path d=\"M2 7h20\" /> <path d=\"M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7\" />","utensils":"<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\" /> <path d=\"M7 2v20\" /> <path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\" />","dumbbell":"<path d=\"M14.4 14.4 9.6 9.6\" /> <path d=\"M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z\" /> <path d=\"m21.5 21.5-1.4-1.4\" /> <path d=\"M3.9 3.9 2.5 2.5\" /> <path d=\"M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z\" />","stethoscope":"<path d=\"M11 2v2\" /> <path d=\"M5 2v2\" /> <path d=\"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1\" /> <path d=\"M8 15a6 6 0 0 0 12 0v-3\" /> <circle cx=\"20\" cy=\"10\" r=\"2\" />","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" />","gift":"<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\" /> <path d=\"M12 8v13\" /> <path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\" /> <path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\" />","key":"<path d=\"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4\" /> <path d=\"m21 2-9.6 9.6\" /> <circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\" />","paintbrush":"<path d=\"m14.622 17.897-10.68-2.913\" /> <path d=\"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z\" /> <path d=\"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15\" />","scissors":"<circle cx=\"6\" cy=\"6\" r=\"3\" /> <path d=\"M8.12 8.12 12 12\" /> <path d=\"M20 4 8.12 15.88\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <path d=\"M14.8 14.8 20 20\" />","trophy":"<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\" /> <path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\" /> <path d=\"M4 22h16\" /> <path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\" /> <path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\" /> <path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\" />","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />","coffee":"<path d=\"M10 2v2\" /> <path d=\"M14 2v2\" /> <path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\" /> <path d=\"M6 2v2\" />"};
const PROJECT_COLORS = ['#3B82F6','#0EA5E9','#14B8A6','#2F7D5B','#84CC16','#F59E0B','#E5484D','#EC4899','#8B5CF6','#64748B'];
function projectColor(p){ return p.color || ((catById(p.categoryId) || {}).color) || '#3B82F6'; }
function projectIconSvg(name){
  const inner = PROJECT_ICONS[name] || PROJECT_ICONS.briefcase;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
/* círculo com o ícone, na cor do projeto */
function projectBadgeHtml(p, size){
  const c = projectColor(p);
  return `<span class="prj-badge" style="--pc:${c}; width:${size}px; height:${size}px;">${projectIconSvg(p.icon || 'briefcase')}</span>`;
}
/* tarefas de uma etapa em ordem de início: quem começa antes sobe; sem datas vai para o fim */
function taskStartKey(t){ return (t.startDate || t.dueDate || '9999-99-99'); }
function sortByStart(list){
  return list.slice().sort((a, b) => taskStartKey(a).localeCompare(taskStartKey(b)) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (a.createdAt || 0) - (b.createdAt || 0));
}

function projectById(id){ return id ? (state.projects || []).find(p => p.id === id) : null; }
function projectsInScope(){
  return (state.projects || []).filter(p => !activeCategoryFilter || p.categoryId === activeCategoryFilter);
}
/* Progresso da tarefa: concluída = 100%; senão, proporção das subtarefas concluídas. */
function taskProgress(t){
  if(t.done) return 1;
  const subs = t.subtasks || [];
  return subs.length ? subs.filter(x => x.done).length / subs.length : 0;
}
/* A tarefa de uma etapa só pode ter prazo/início dentro das datas da etapa. */
function stageRange(t){
  return null; // o período da etapa é calculado a partir das tarefas, então não limita as datas delas
  // eslint-disable-next-line no-unreachable
  if(!t || !t.projectId || !t.stageId) return null;
  const pr = projectById(t.projectId);
  const sg = pr && (pr.stages || []).find(x => x.id === t.stageId);
  if(!sg || (!sg.start && !sg.end)) return null;
  return { start: sg.start || '', end: sg.end || '', name: sg.name };
}
/* Aviso curto, só quando a pessoa digita uma data fora do período da etapa */
function flashStageRangeWarning(t){
  const r = stageRange(t); if(!r) return;
  const box = document.querySelector('.tp-due-box'); if(!box) return;
  const old = box.querySelector('.tp-range-note'); if(old) old.remove();
  const n = document.createElement('div');
  n.className = 'tp-range-note bad';
  n.textContent = 'Use uma data entre ' + (r.start ? fmtDate(r.start) : '…') + ' e ' + (r.end ? fmtDate(r.end) : '…') + ' (período da etapa).';
  box.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}
function dateInStageRange(t, d){
  const r = stageRange(t);
  if(!r || !d) return true;
  return !(r.start && d < r.start) && !(r.end && d > r.end);
}
function clampToStage(t){
  const r = stageRange(t); if(!r) return;
  if(t.dueDate){
    if(r.end && t.dueDate > r.end) t.dueDate = r.end;
    else if(r.start && t.dueDate < r.start) t.dueDate = r.start;
  }
  if(t.startDate && ((r.start && t.startDate < r.start) || (r.end && t.startDate > r.end))) t.startDate = null;
}
/* Datas da etapa = das tarefas: fim = maior prazo; início = menor início/prazo.
   Etapa sem tarefas com data mantém as datas antigas (se houver). Roda a cada desenho da tela. */
function syncStageDates(){
  (state.projects || []).forEach(p => {
    (p.stages || []).forEach(sg => {
      const tks = state.tasks.filter(t => t.projectId === p.id && t.stageId === sg.id);
      if(!tks.length) return;
      const dues = tks.map(t => t.dueDate).filter(Boolean).sort();
      /* início da etapa = menor início das tarefas (sem início próprio vale a data de criação) */
      const starts = tks.map(t => effectiveStart(t).date).concat(dues).sort();
      sg.start = starts[0];
      /* sem nenhum prazo, a etapa vai até hoje (em aberto), como a barra das tarefas */
      sg.end = dues.length ? dues[dues.length - 1] : (starts[0] < todayStr() ? todayStr() : starts[0]);
    });
  });
}
function stageTasks(project, stage){
  return state.tasks.filter(t => t.projectId === project.id && t.stageId === stage.id);
}
/* % da etapa: tarefas concluídas / tarefas da etapa. Sem tarefas, 0% (ou 100% se
   a etapa foi marcada como concluída manualmente). */
function stagePercent(project, stage){
  const tasks = stageTasks(project, stage);
  if(tasks.length) return Math.round(tasks.reduce((a, t) => a + taskProgress(t), 0) / tasks.length * 100);
  return stage.manualDone ? 100 : 0;
}
function stageState(project, stage){
  const pct = stagePercent(project, stage);
  const today = todayStr();
  if(pct >= 100) return 'concluida';
  if(stage.end && stage.end < today) return 'atrasada';
  if(pct > 0 || (stage.start && stage.start <= today)) return 'andamento';
  return 'nao_iniciada';
}
const STAGE_STATE_LABELS = { concluida:'Concluída', andamento:'Em andamento', atrasada:'Atrasada', nao_iniciada:'Não iniciada' };
function projectStatus(project){
  const stages = project.stages || [];
  const pcts = stages.map(st => stagePercent(project, st));
  const pct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  const lateStages = stages.filter(st => stageState(project, st) === 'atrasada');
  const ends = stages.map(st => st.end).filter(Boolean).concat(project.endDate ? [project.endDate] : []).sort();
  const end = ends.length ? ends[ends.length - 1] : null;
  const next = stages.filter(st => stageState(project, st) !== 'concluida' && st.end).sort((a, b) => a.end.localeCompare(b.end))[0] || null;
  const done = stages.filter(st => stageState(project, st) === 'concluida').length;
  return { pct, late: lateStages.length > 0, lateCount: lateStages.length, end, next, done, total: stages.length };
}

function ensureProjectOverlay(id){
  let ov = document.getElementById(id);
  if(!ov){
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.id = id;
    ov.innerHTML = '<div class="modal tpl-overlay-modal"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', e => { ov._downOnBackdrop = (e.target === ov); });
    ov.addEventListener('click', e => { if(e.target === ov && ov._downOnBackdrop) ov.classList.remove('show'); });
  }
  return ov;
}

function openProjectEditor(project){
  const ov = ensureProjectOverlay('projectOverlay');
  const modal = ov.firstElementChild;
  const p = project || { id: uid('proj'), name: '', categoryId: activeCategoryFilter || state.categories[0].id, description: '', startDate: todayStr(), endDate: '', stages: [], createdAt: Date.now() };
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="prjClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="nm-head">
      <div class="nm-kicker">${project ? 'Editar projeto' : 'Novo projeto'}</div>
      <div class="prj-headrow big">
        <span class="prj-badge" id="prjIconPreview" style="--pc:${projectColor(p)}; width:68px; height:68px;">${projectIconSvg(p.icon || 'briefcase')}</span>
        <div class="prj-namefld"><label for="prjName">Nome do projeto</label>
          <div class="prj-namebox">
            <input type="text" class="nm-title-input" id="prjName" placeholder="Ex.: Reforma da casa" value="${escapeHtml(p.name || '')}">
            <button type="button" class="prj-ctl" id="prjColorDot" title="Cor" aria-label="Escolher a cor do projeto"><i class="prj-colordot" style="background:${projectColor(p)}"></i></button>
            <button type="button" class="prj-ctl" id="prjIconBtn" title="Ícone" aria-label="Escolher o ícone do projeto">${projectIconSvg(p.icon || 'briefcase')}</button>
            <div class="prj-pop prj-colorpop" id="prjColorPop" hidden>${PROJECT_COLORS.map(c => `<button type="button" class="prj-swatch" data-color="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join('')}</div>
            <div class="prj-pop prj-iconpop" id="prjIconPop" hidden><div class="prj-icons">${Object.keys(PROJECT_ICONS).map(n => `<button type="button" class="prj-icon-btn" data-icon="${n}" title="${n}">${projectIconSvg(n)}</button>`).join('')}</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="nm-body prj-body">
    <div class="prj-row3">
      <div class="tp-field"><label class="tp-label">Espaço</label>
        <select class="tp-select" id="prjCategory">${state.categories.map(c => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="tp-field"><label class="tp-label">Início</label><input type="date" class="tp-input" id="prjStart" value="${p.startDate || ''}"></div>
      <div class="tp-field"><label class="tp-label">Entrega prevista</label><input type="date" class="tp-input" id="prjEnd" value="${p.endDate || ''}"></div>
    </div>
    <div class="tp-field"><label class="tp-label">Descrição</label>
      <textarea class="tp-textarea" id="prjDesc" rows="2" placeholder="Breve descrição do projeto...">${escapeHtml(p.description || '')}</textarea></div>
    <p id="prjError" style="display:none; color:var(--danger); font-size:12.5px; margin:4px 0 0;"></p>
    </div>
    <div class="modal-footer">
      ${project ? '<button type="button" class="btn ghost small" id="prjDelete" style="margin-right:auto; color:var(--danger); border-color:var(--danger-light);">Excluir</button>' : ''}
      <button type="button" class="btn ghost small" id="prjCancel">Cancelar</button>
      <button type="button" class="btn small" id="prjSave">Salvar</button>
    </div>`;
  modal.className = 'modal nm nm-560';
  modal.querySelector('#prjCancel').onclick = () => ov.classList.remove('show');
  modal.querySelector('#prjClose').onclick = () => ov.classList.remove('show');
  let selIcon = p.icon || 'briefcase', selColor = projectColor(p);
  const prjPreview = modal.querySelector('#prjIconPreview');
  function paintProjectPicker(){
    prjPreview.style.setProperty('--pc', selColor);
    prjPreview.innerHTML = projectIconSvg(selIcon);
    modal.querySelectorAll('[data-icon]').forEach(b => b.classList.toggle('on', b.dataset.icon === selIcon));
    modal.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('on', b.dataset.color === selColor));
    modal.querySelectorAll('.prj-icon-btn').forEach(b => { b.style.setProperty('--pc', selColor); });
    modal.querySelector('.prj-colordot').style.background = selColor;
    modal.querySelector('#prjIconBtn').innerHTML = projectIconSvg(selIcon);
    modal.querySelector('.nm-flag').style.background = selColor;
  }
  const colorPop = modal.querySelector('#prjColorPop'), iconPop = modal.querySelector('#prjIconPop');
  const colorBtn = modal.querySelector('#prjColorDot'), iconBtn = modal.querySelector('#prjIconBtn');
  function closePrjPops(){ colorPop.hidden = true; iconPop.hidden = true; colorBtn.classList.remove('open'); iconBtn.classList.remove('open'); }
  function togglePrjPop(pop, btn){ const open = pop.hidden; closePrjPops(); pop.hidden = !open; btn.classList.toggle('open', open); }
  colorBtn.onclick = (e) => { e.stopPropagation(); togglePrjPop(colorPop, colorBtn); };
  iconBtn.onclick = (e) => { e.stopPropagation(); togglePrjPop(iconPop, iconBtn); };
  colorPop.onclick = iconPop.onclick = (e) => e.stopPropagation();
  modal.addEventListener('click', closePrjPops);
  modal.querySelectorAll('[data-icon]').forEach(b => { b.onclick = () => { selIcon = b.dataset.icon; paintProjectPicker(); closePrjPops(); }; });
  modal.querySelectorAll('[data-color]').forEach(b => { b.onclick = () => { selColor = b.dataset.color; paintProjectPicker(); closePrjPops(); }; });
  paintProjectPicker();
  if(project){
    modal.querySelector('#prjDelete').onclick = () => {
      const n = state.tasks.filter(t => t.projectId === p.id).length;
      if(!confirm(`Excluir o projeto "${p.name}"? ${n ? n + ' tarefa(s) continuam, viram tarefas pessoais.' : ''}`)) return;
      state.tasks.forEach(t => { if(t.projectId === p.id){ t.projectId = null; t.stageId = null; } });
      state.projects = state.projects.filter(x => x.id !== p.id);
      if(activeProjectId === p.id) activeProjectId = null;
      ov.classList.remove('show');
      markDirty();
    };
  }
  modal.querySelector('#prjSave').onclick = () => {
    const name = modal.querySelector('#prjName').value.trim();
    const err = modal.querySelector('#prjError');
    if(!name){ err.textContent = 'Dê um nome ao projeto.'; err.style.display = 'block'; return; }
    p.name = name;
    p.icon = selIcon; p.color = selColor;
    p.categoryId = modal.querySelector('#prjCategory').value;
    p.description = modal.querySelector('#prjDesc').value;
    p.startDate = modal.querySelector('#prjStart').value;
    p.endDate = modal.querySelector('#prjEnd').value;
    if(!project){ state.projects.push(p); activeProjectId = p.id; }
    ov.classList.remove('show');
    markDirty();
  };
  ov.classList.add('show');
  setTimeout(() => modal.querySelector('#prjName').focus(), 0);
}

function openStageEditor(project, stage){
  const ov = ensureProjectOverlay('stageOverlay');
  const modal = ov.firstElementChild;
  const st = stage || { id: uid('stage'), name: '', start: '', end: '', manualDone: false };
  const tasks = stage ? stageTasks(project, stage) : [];
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="stgClose" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="nm-head">
      <div class="nm-kicker">${stage ? 'Editar etapa' : 'Nova etapa'} · ${escapeHtml(project.name)}</div>
      <input type="text" class="nm-title-input" id="stgName" placeholder="Nome da etapa" value="${escapeHtml(st.name || '')}">
    </div>
    <div class="nm-body">
    ${stage ? `
    <div class="tp-field"><label class="tp-label">Tarefas da etapa <span style="font-weight:400; color:var(--ink-faint);">(${tasks.filter(t => t.done).length}/${tasks.length} concluídas)</span></label>
      <div id="stgTasks">${tasks.length ? tasks.map(t => `<div class="stage-task ${t.done ? 'done' : ''}" data-id="${t.id}"><span>${escapeHtml(t.title || 'Sem título')}</span><span style="margin-left:auto; color:var(--ink-faint); font-size:11.5px;">${t.dueDate ? fmtDate(t.dueDate) : ''}</span></div>`).join('') : '<p style="font-size:12px; color:var(--ink-faint);">Nenhuma tarefa ainda.</p>'}</div>
      <button type="button" class="btn ghost small" id="stgNewTask" style="margin-top:6px;">+ Nova tarefa nesta etapa</button>
      ${tasks.length ? '' : `<label class="completed-toggle" style="margin:10px 0 0;"><span>Marcar etapa como concluída</span><input type="checkbox" id="stgManual" ${st.manualDone ? 'checked' : ''}><span class="completed-toggle-track"><span class="completed-toggle-thumb"></span></span></label>`}
    </div>` : '<p style="font-size:12px; color:var(--ink-faint);">Depois de salvar, você poderá criar tarefas dentro da etapa.</p>'}
    <p id="stgError" style="display:none; color:var(--danger); font-size:12.5px; margin:4px 0 0;"></p>
    </div>
    <div class="modal-footer">
      ${stage ? '<button type="button" class="btn ghost small" id="stgDelete" style="margin-right:auto; color:var(--danger); border-color:var(--danger-light);">Excluir</button>' : ''}
      <button type="button" class="btn ghost small" id="stgCancel">Cancelar</button>
      <button type="button" class="btn small" id="stgSave">Salvar</button>
    </div>`;
  modal.className = 'modal nm nm-560';
  modal.querySelector('#stgCancel').onclick = () => ov.classList.remove('show');
  modal.querySelector('#stgClose').onclick = () => ov.classList.remove('show');
  function commitFields(){
    st.name = modal.querySelector('#stgName').value.trim();
    const manual = modal.querySelector('#stgManual');
    if(manual) st.manualDone = manual.checked;
  }
  function validate(){
    const err = modal.querySelector('#stgError');
    const name = modal.querySelector('#stgName').value.trim();
    if(!name){ err.textContent = 'Dê um nome à etapa.'; err.style.display = 'block'; return false; }
    err.style.display = 'none';
    return true;
  }
  modal.querySelector('#stgSave').onclick = () => {
    if(!validate()) return;
    commitFields();
    if(!stage) project.stages.push(st);
    // as tarefas da etapa passam a respeitar as novas datas
    state.tasks.forEach(t => { if(t.projectId === project.id && t.stageId === st.id) clampToStage(t); });
    ov.classList.remove('show');
    markDirty();
  };
  if(stage){
    modal.querySelector('#stgDelete').onclick = () => {
      if(!confirm(`Excluir a etapa "${st.name}"? As tarefas dela ficam no projeto, sem etapa.`)) return;
      state.tasks.forEach(t => { if(t.stageId === st.id){ t.stageId = null; } });
      project.stages = project.stages.filter(x => x.id !== st.id);
      ov.classList.remove('show');
      markDirty();
    };
    modal.querySelector('#stgNewTask').onclick = () => {
      if(!validate()) return;
      commitFields();
      state.taskIdCounter = (state.taskIdCounter || 0) + 1;
      const t = {
        id: uid('task'), shortId: String(state.taskIdCounter).padStart(4, '0'), title: '', categoryId: project.categoryId,
        done: false, status: 'nao_iniciado', dueDate: null, startDate: todayStr(), followUpDate: todayStr(), dueTime: '', priority: 'media',
        description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
        projectId: project.id, stageId: st.id,
      };
      state.tasks.push(t);
      ov.classList.remove('show');
      currentView = 'tasks';
      activeTaskId = t.id;
      creatingNewTask = false;
      markDirty();
    };
    modal.querySelectorAll('.stage-task').forEach(el => {
      el.onclick = () => { ov.classList.remove('show'); currentView = 'tasks'; activeTaskId = el.dataset.id; creatingNewTask = false; render(); };
    });
  }
  ov.classList.add('show');
  setTimeout(() => modal.querySelector('#stgName').focus(), 0);
}

