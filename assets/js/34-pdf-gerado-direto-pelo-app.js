import { G } from './globais.js';
import { dateToStr, escapeHtml, fmtDate, todayStr } from './10-helpers.js';
import { PRIORITY_CONFIG } from './12-render-tasks.js';
import { MONTH_LABELS } from './25-calendario.js';
import { openProjectEditor, projectColor, projectIconSvg, taskProgress } from './31-projetos.js';
import { buildProjectReportData, projectCsv, projectReportHtml, taskStatusLabel } from './33-relatorio-do-projeto.js';
import { effectiveStart } from './35-templates-de-tarefa.js';

/* ===== PDF gerado direto pelo app (jsPDF + autoTable, carregados só quando necessário) ===== */
export function loadScriptOnce(url){
  return new Promise((resolve, reject) => {
    if(document.querySelector('script[data-lib="' + url + '"]')) return resolve();
    const sc = document.createElement('script');
    sc.src = url; sc.dataset.lib = url;
    sc.onload = () => resolve();
    sc.onerror = () => reject(new Error('Não foi possível carregar ' + url));
    document.head.appendChild(sc);
  });
}
export async function ensurePdfLibs(){
  if(window.jspdf && window.jspdf.jsPDF && window.__autoTableReady) return;
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  window.__autoTableReady = true;
}
export function hexToRgb(hex){
  const h = String(hex || '#3B82F6').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixWhite(rgb, a){ return rgb.map(v => Math.round(v * a + 255 * (1 - a))); }
export function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function reportFileName(p, ext){ return 'relatorio-' + (p.name || 'projeto').trim().replace(/[^\w\-]+/g, '_').slice(0, 60) + '.' + ext; }
export function downloadProjectCsv(p){
  downloadBlob(new Blob([projectCsv(buildProjectReportData(p))], { type: 'text/csv;charset=utf-8' }), reportFileName(p, 'csv'));
}
/* ícone do projeto como imagem (o jsPDF não desenha SVG): SVG colorido -> canvas -> PNG */
export function projectIconPng(name, colorHex){
  return new Promise(resolve => {
    try{
      const svg = projectIconSvg(name).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" ').replace(/currentColor/g, colorHex);
      const img = new Image();
      img.onload = () => {
        try{
          const c = document.createElement('canvas'); c.width = c.height = 192;
          c.getContext('2d').drawImage(img, 0, 0, 192, 192);
          resolve(c.toDataURL('image/png'));
        }catch(e){ resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }catch(e){ resolve(null); }
  });
}
export async function downloadProjectPdf(p){
  await ensurePdfLibs();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const data = buildProjectReportData(p);
  const { st, stageBlocks, loose, cat, today } = data;
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;
  const color = hexToRgb(projectColor(p));
  const ink = [27, 33, 48], soft = [100, 116, 139], line = [226, 232, 240];
  const stColor = { 'Concluída': [47, 125, 91], 'Em andamento': color, 'Atrasada': [229, 72, 77], 'Não iniciada': [148, 163, 184] };
  const ensure = (h) => { if(y + h > H - 50){ doc.addPage(); y = M; } };

  // cabeçalho
  doc.setFillColor(...mixWhite(color, .18)); doc.circle(M + 22, y + 22, 22, 'F');
  const iconPng = await projectIconPng(p.icon || 'briefcase', projectColor(p));
  if(iconPng) doc.addImage(iconPng, 'PNG', M + 10, y + 10, 24, 24);
  else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...color);
    doc.text(((p.name || 'P').trim().charAt(0) || 'P').toUpperCase(), M + 22, y + 28, { align: 'center' });
  }
  doc.setTextColor(...ink); doc.setFontSize(21); doc.text(doc.splitTextToSize(p.name || 'Projeto', W - 2 * M - 60)[0], M + 58, y + 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...soft);
  doc.text((cat ? cat.name + '  ·  ' : '') + 'Relatório gerado em ' + new Date().toLocaleString('pt-BR'), M + 58, y + 38);
  y += 60;
  if(p.description){
    doc.setFontSize(10.5); doc.setTextColor(...ink);
    const lines = doc.splitTextToSize(p.description, W - 2 * M);
    doc.text(lines, M, y + 4); y += lines.length * 14 + 8;
  }
  // indicadores
  const kw = (W - 2 * M - 30) / 4;
  const kpis = [
    ['PROGRESSO', st.pct + '%'],
    ['ETAPAS', st.done + ' de ' + st.total],
    ['PRÓXIMA ENTREGA', st.next ? st.next.name + ' · ' + fmtDate(st.next.end) : '—'],
    ['ENTREGA PREVISTA', p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—')],
  ];
  kpis.forEach((k, i) => {
    const x = M + i * (kw + 10);
    doc.setDrawColor(...line); doc.roundedRect(x, y, kw, 54, 8, 8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...soft); doc.text(k[0], x + 10, y + 16);
    doc.setFontSize(i < 2 ? 15 : 9.5); doc.setTextColor(...ink);
    doc.text(doc.splitTextToSize(k[1], kw - 20)[0], x + 10, y + 36);
  });
  doc.setFillColor(238, 242, 247); doc.roundedRect(M + 10, y + 43, kw - 20, 5, 2.5, 2.5, 'F');
  if(st.pct > 0){ doc.setFillColor(...color); doc.roundedRect(M + 10, y + 43, Math.max(5, (kw - 20) * st.pct / 100), 5, 2.5, 2.5, 'F'); }
  y += 54 + 26;

  // linha do tempo
  const dates = [today];
  stageBlocks.forEach(b => { if(b.sg.start) dates.push(b.sg.start); if(b.sg.end) dates.push(b.sg.end); b.tasks.forEach(t => { if(t.startDate) dates.push(t.startDate); if(t.dueDate) dates.push(t.dueDate); }); });
  if(p.endDate) dates.push(p.endDate);
  dates.sort();
  const f0 = new Date(dates[0] + 'T00:00:00'), l0 = new Date(dates[dates.length - 1] + 'T00:00:00');
  const r0 = new Date(f0.getFullYear(), f0.getMonth(), 1), r1 = new Date(l0.getFullYear(), l0.getMonth() + 1, 1);
  const total = Math.max(1, Math.round((r1 - r0) / 86400000));
  const frac = d => Math.max(0, Math.min(1, Math.round((new Date(d + 'T00:00:00') - r0) / 86400000) / total));
  const labelW = 190, trackX = M + labelW, trackW = W - M - trackX;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...soft); doc.text('LINHA DO TEMPO', M, y); y += 12;
  ensure(30);
  for(let d = new Date(r0); d < r1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)){
    const x = trackX + frac(dateToStr(d)) * trackW;
    doc.setDrawColor(...line); doc.line(x, y - 2, x, y + 8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...soft);
    doc.text(MONTH_LABELS[d.getMonth()].slice(0, 3).toUpperCase() + ' ' + String(d.getFullYear()).slice(2), x + 3, y + 6);
  }
  y += 14; doc.setDrawColor(...line); doc.line(M, y, W - M, y);
  const todayX = trackX + frac(today) * trackW;
  const row = (label, sub, a, b, pct, col, indent) => {
    const rh = indent ? 17 : 21;
    ensure(rh + 4);
    doc.setFont('helvetica', indent ? 'normal' : 'bold'); doc.setFontSize(indent ? 8 : 8.5); doc.setTextColor(...ink);
    const txt = doc.splitTextToSize(label || 'Sem título', labelW - 14 - (indent ? 14 : 0))[0];
    doc.text(txt, M + 4 + (indent ? 14 : 0), y + (sub ? rh / 2 - 1 : rh / 2 + 3));
    if(sub){ doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...soft); doc.text(sub, M + 4 + (indent ? 14 : 0), y + rh / 2 + 7); }
    if(a !== null){
      const x0 = trackX + a * trackW, w = Math.max(5, (b - a) * trackW);
      doc.setFillColor(...mixWhite(col, .22)); doc.setDrawColor(...col); doc.roundedRect(x0, y + rh / 2 - 4, w, 8, 4, 4, 'FD');
      if(pct > 0){ doc.setFillColor(...col); doc.roundedRect(x0, y + rh / 2 - 4, Math.max(4, w * pct / 100), 8, 4, 4, 'F'); }
    }
    doc.setDrawColor(229, 72, 77); doc.setLineWidth(1); doc.line(todayX, y, todayX, y + rh); doc.setLineWidth(.6);
    doc.setDrawColor(...line); doc.line(M, y + rh, W - M, y + rh);
    y += rh;
  };
  stageBlocks.forEach(b => {
    const a = (b.sg.start || b.sg.end) ? frac(b.sg.start || b.sg.end) : null, e = (b.sg.end || b.sg.start) ? frac(b.sg.end || b.sg.start) : null;
    row(b.sg.name, b.state + ' · ' + b.pct + '%', a, e, b.pct, stColor[b.state] || color, false);
    b.tasks.forEach(t => {
      const lbl = taskStatusLabel(t);
      const ta = t.startDate ? frac(t.startDate) : (t.dueDate ? frac(t.dueDate) : null), tb = t.dueDate ? frac(t.dueDate) : ta;
      row(t.title, lbl, ta, tb, Math.round(taskProgress(t) * 100), stColor[lbl] || color, true);
    });
  });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...soft);
  ensure(18); doc.text('A linha vermelha marca hoje. Barras sólidas mostram o progresso.', M, y + 12); y += 30;

  // tarefas por etapa, linha a linha
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...soft);
  ensure(40); doc.text('TAREFAS POR ETAPA', M, y); y += 8;
  const body = list => list.map(t => {
    const subs = t.subtasks || [];
    return [t.title || 'Sem título', taskStatusLabel(t), (PRIORITY_CONFIG.find(x => x.key === t.priority) || {}).label || '', t.startDate ? fmtDate(t.startDate) : '—', t.dueDate ? fmtDate(t.dueDate) : '—', Math.round(taskProgress(t) * 100) + '%' + (subs.length ? ' (' + subs.filter(x => x.done).length + '/' + subs.length + ')' : '')];
  });
  const table = (title, list) => {
    ensure(70);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...ink); doc.text(title, M, y + 14);
    doc.autoTable({
      startY: y + 20, margin: { left: M, right: M },
      head: [['Tarefa', 'Status', 'Prioridade', 'Início', 'Prazo', 'Progresso']],
      body: list.length ? body(list) : [[{ content: 'Nenhuma tarefa nesta etapa.', colSpan: 6, styles: { textColor: soft } }]],
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, lineColor: line, textColor: ink },
      headStyles: { fillColor: [238, 242, 247], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7.5 },
      theme: 'grid',
      columnStyles: { 0: { cellWidth: 190 }, 1: { cellWidth: 70 } },
    });
    y = doc.lastAutoTable.finalY + 14;
  };
  stageBlocks.forEach(b => table(b.sg.name + '  —  ' + b.state + ' · ' + b.pct + '%', b.tasks));
  if(loose.length) table('Sem etapa', loose);

  // rodapé com numeração
  const pages = doc.getNumberOfPages();
  for(let i = 1; i <= pages; i++){
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...soft);
    doc.text('DOUNO Tasks  ·  ' + (p.name || ''), M, H - 24);
    doc.text('Página ' + i + ' de ' + pages, W - M, H - 24, { align: 'right' });
  }
  doc.save(reportFileName(p, 'pdf'));
}
/* Menu do botão "⋮" do projeto: editar e relatório (PDF direto, planilha ou versão para imprimir) */
export function openProjectMenu(anchor, p){
  closeReportMenu();
  const menu = document.createElement('div');
  menu.className = 'report-menu';
  menu.id = 'reportMenu';
  const ic = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  menu.innerHTML = `
    <button type="button" id="prjEdit">${ic('<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/>')}<span><b>Editar projeto</b><small>Nome, ícone, cor, espaço e datas</small></span></button>
    <div class="report-sep"></div>
    <div class="report-head">Relatório</div>
    <button type="button" data-report="pdf">${ic('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/>')}<span><b>Baixar PDF</b><small>Gerado aqui mesmo, pronto para enviar</small></span></button>
    <button type="button" data-report="csv">${ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>')}<span><b>Baixar planilha (CSV)</b><small>Abre no Excel, uma linha por tarefa</small></span></button>
    <button type="button" data-report="print">${ic('<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>')}<span><b>Ver e imprimir</b><small>Abre a página do relatório</small></span></button>`;
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top = Math.round(r.bottom + 6) + 'px';
  menu.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + 'px';
  menu.onclick = (e) => e.stopPropagation();
  menu.querySelector('#prjEdit').onclick = () => { closeReportMenu(); openProjectEditor(p); };
  menu.querySelector('[data-report="csv"]').onclick = () => { closeReportMenu(); downloadProjectCsv(p); };
  menu.querySelector('[data-report="print"]').onclick = () => { closeReportMenu(); exportProjectReport(p); };
  const pdfBtn = menu.querySelector('[data-report="pdf"]');
  pdfBtn.onclick = async () => {
    const label = pdfBtn.querySelector('b');
    pdfBtn.disabled = true; label.textContent = 'Gerando PDF…';
    try{ await downloadProjectPdf(p); closeReportMenu(); }
    catch(err){ console.error(err); label.textContent = 'Não foi possível gerar. Tente "Ver e imprimir".'; pdfBtn.disabled = false; }
  };
  setTimeout(() => document.addEventListener('click', closeReportMenu, { once: true }), 0);
}
export function closeReportMenu(){ const m = document.getElementById('reportMenu'); if(m) m.remove(); }
export function exportProjectReport(p){
  const win = window.open('', '_blank');
  if(!win) return;
  win.document.write(projectReportHtml(buildProjectReportData(p)));
  win.document.close();
  win.focus();
}
/* linha de tarefa dentro da etapa: a barrinha marca o prazo da tarefa */
export function ganttTaskRow(t, stageStateKey, pos){
  const today = todayStr();
  /* estado visual da barra: concluída = chapada, em andamento = listrada, não iniciada = tom claro */
  const vis = t.done ? 'done' : ((t.status === 'em_andamento' || taskProgress(t) > 0) ? 'prog' : 'todo');
  let mark = '', endPx = 0;
  const es = effectiveStart(t);
  const startLbl = (es.source === 'own' ? 'Início ' : 'Criada em ') + fmtDate(es.date);
  const check = t.done ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '';
  if(t.dueDate){
    const end = pos(t.dueDate);
    const from = es.date <= t.dueDate ? pos(es.date) : Math.max(end - 12, 0);
    const w = Math.max(end - from, 12);
    endPx = from + w;
    mark = `<div class="gantt-task-mark ${vis}" style="left:${from}px; width:${w}px;" title="${startLbl} · Prazo ${fmtDate(t.dueDate)}">${check}</div>`;
  } else {
    /* sem prazo: a barra vai do início (ou criação) até hoje */
    const from = pos(es.date);
    const to = es.date < today ? pos(today) : from;
    const w = Math.max(to - from, 12);
    endPx = from + w;
    mark = `<div class="gantt-task-mark ${vis}" style="left:${from}px; width:${w}px;" title="${startLbl} · sem prazo">${check}</div>`;
  }
  /* alerta de prazo (só tarefa aberta): atrasada em vermelho, hoje ou até 3 dias em laranja */
  let pill = '';
  const pillAt = G.ganttFit ? ` style="left:${Math.min(endPx + 6, pos('9999-12-31') - 64)}px"` : '';
  if(!t.done && t.dueDate){
    const diff = Math.round((new Date(t.dueDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    const clock = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    if(diff < 0) pill = `<span class="gantt-pill late"${pillAt} title="Atrasada há ${-diff} dia${diff === -1 ? '' : 's'}">${clock}+${-diff}d</span>`;
    else if(diff <= 3) pill = `<span class="gantt-pill"${pillAt} title="${diff === 0 ? 'Vence hoje' : 'Vence em ' + diff + ' dia' + (diff === 1 ? '' : 's')}">${clock}${diff === 0 ? 'hoje' : diff + 'd'}</span>`;
  }
  const prCfg = PRIORITY_CONFIG.find(x => x.key === t.priority);
  return `<div class="gantt-task" data-task-id="${t.id}" data-stage="${t.stageId || ''}" draggable="true" style="--pr:${prCfg ? prCfg.color : 'transparent'}" title="Arraste para outra etapa para mover a tarefa">
    <div class="gl"><span class="gantt-task-name ${t.done ? 'done' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/>${t.done ? '<path d="M8.5 12l2.5 2.5 4.5-5"/>' : ''}</svg>${escapeHtml(t.title || 'Sem título')}</span></div>
    <div class="gantt-track">${mark}${pill}</div>
  </div>`;
}

