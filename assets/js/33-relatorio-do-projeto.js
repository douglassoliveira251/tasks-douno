import { G } from './globais.js';
import { catById, escapeHtml, fmtDate, todayStr } from './10-helpers.js';
import { PRIORITY_CONFIG } from './12-render-tasks.js';
import { MONTH_LABELS } from './25-calendario.js';
import { STAGE_STATE_LABELS, projectColor, projectIconSvg, projectStatus, sortByStart, stagePercent, stageState, stageTasks, taskProgress } from './31-projetos.js';

/* ===== Relatório do projeto (impressão/PDF e planilha CSV) ===== */
export function taskStatusLabel(t){
  if(t.done) return 'Concluída';
  if(t.dueDate && t.dueDate < todayStr()) return 'Atrasada';
  if(t.status === 'em_andamento' || taskProgress(t) > 0) return 'Em andamento';
  return 'Não iniciada';
}
export function buildProjectReportData(p){
  const today = todayStr();
  const st = projectStatus(p);
  const stages = (p.stages || []).slice().sort((a, b) => (a.start || a.end || '9999').localeCompare(b.start || b.end || '9999'));
  const cat = catById(p.categoryId);
  const rows = [];
  const stageBlocks = stages.map(sg => {
    const tasks = sortByStart(stageTasks(p, sg));
    tasks.forEach(t => rows.push({ stage: sg.name, t }));
    return { sg, pct: stagePercent(p, sg), state: STAGE_STATE_LABELS[stageState(p, sg)], tasks };
  });
  const loose = sortByStart(G.state.tasks.filter(t => t.projectId === p.id && !t.stageId));
  loose.forEach(t => rows.push({ stage: '(sem etapa)', t }));
  return { p, st, stageBlocks, loose, rows, cat, today };
}
export function projectCsv(data){
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['Projeto','Etapa','Tarefa','Status','Prioridade','Início','Prazo','Progresso','Subtarefas'];
  const lines = [head.map(q).join(';')];
  data.rows.forEach(({ stage, t }) => {
    const subs = t.subtasks || [];
    lines.push([data.p.name, stage, t.title || 'Sem título', taskStatusLabel(t), (PRIORITY_CONFIG.find(x => x.key === t.priority) || {}).label || '', t.startDate ? fmtDate(t.startDate) : '', t.dueDate ? fmtDate(t.dueDate) : '', Math.round(taskProgress(t) * 100) + '%', subs.length ? subs.filter(x => x.done).length + '/' + subs.length : ''].map(q).join(';'));
  });
  return '\ufeff' + lines.join('\r\n');
}
export function projectReportHtml(data){
  const { p, st, stageBlocks, loose, cat, today } = data;
  const color = projectColor(p);
  // escala da linha do tempo
  const dates = [today];
  stageBlocks.forEach(b => { if(b.sg.start) dates.push(b.sg.start); if(b.sg.end) dates.push(b.sg.end); b.tasks.forEach(t => { if(t.startDate) dates.push(t.startDate); if(t.dueDate) dates.push(t.dueDate); }); });
  if(p.endDate) dates.push(p.endDate);
  dates.sort();
  const first = new Date(dates[0] + 'T00:00:00'), last = new Date(dates[dates.length - 1] + 'T00:00:00');
  const r0 = new Date(first.getFullYear(), first.getMonth(), 1), r1 = new Date(last.getFullYear(), last.getMonth() + 1, 1);
  const total = Math.max(1, Math.round((r1 - r0) / 86400000));
  const pos = d => Math.max(0, Math.min(100, Math.round((new Date(d + 'T00:00:00') - r0) / 86400000) / total * 100));
  const months = [];
  for(let d = new Date(r0); d < r1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)){
    const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({ l: MONTH_LABELS[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2), w: (nx - d) / 86400000 / total * 100 });
  }
  const todayPos = pos(today);
  const stColor = { 'Concluída': '#2F7D5B', 'Em andamento': color, 'Atrasada': '#E5484D', 'Não iniciada': '#94A3B8', 'Atrasada ': '#E5484D' };
  const tlRow = (label, sub, a, b, pct, col, indent) => `<tr><td class="tl-l${indent ? ' ind' : ''}"><b>${escapeHtml(label)}</b>${sub ? '<small>' + escapeHtml(sub) + '</small>' : ''}</td><td class="tl-t"><div class="tl-track">${a !== null ? `<div class="tl-bar" style="left:${a}%; width:${Math.max(b - a, 1.2)}%; background:${col}33; border:1px solid ${col}"><i style="width:${pct}%; background:${col}"></i></div>` : ''}<div class="tl-today" style="left:${todayPos}%"></div></div></td></tr>`;
  let tl = '';
  stageBlocks.forEach(b => {
    const a = b.sg.start || b.sg.end ? pos(b.sg.start || b.sg.end) : null, e = b.sg.end || b.sg.start ? pos(b.sg.end || b.sg.start) : null;
    tl += tlRow(b.sg.name, b.state + ' · ' + b.pct + '%', a, e, b.pct, stColor[b.state] || color, false);
    b.tasks.forEach(t => {
      const lbl = taskStatusLabel(t);
      const ta = t.startDate ? pos(t.startDate) : (t.dueDate ? pos(t.dueDate) : null), tb = t.dueDate ? pos(t.dueDate) : ta;
      tl += tlRow(t.title || 'Sem título', lbl, ta, tb, Math.round(taskProgress(t) * 100), stColor[lbl] || color, true);
    });
  });
  const taskLines = (list, stageName) => list.map(t => {
    const subs = t.subtasks || [];
    const lbl = taskStatusLabel(t);
    return `<tr><td>${escapeHtml(t.title || 'Sem título')}</td><td><span class="pill" style="background:${(stColor[lbl] || color)}22; color:${stColor[lbl] || color}">${lbl}</span></td><td>${(PRIORITY_CONFIG.find(x => x.key === t.priority) || {}).label || ''}</td><td>${t.startDate ? fmtDate(t.startDate) : '—'}</td><td>${t.dueDate ? fmtDate(t.dueDate) : '—'}</td><td>${Math.round(taskProgress(t) * 100)}%${subs.length ? ' (' + subs.filter(x => x.done).length + '/' + subs.length + ' sub.)' : ''}</td></tr>`;
  }).join('');
  const tables = stageBlocks.map(b => `<h3>${escapeHtml(b.sg.name)} <span>${b.state} · ${b.pct}% · ${b.sg.start ? fmtDate(b.sg.start) : '—'} a ${b.sg.end ? fmtDate(b.sg.end) : '—'}</span></h3>
    ${b.tasks.length ? `<table class="grid"><thead><tr><th>Tarefa</th><th>Status</th><th>Prioridade</th><th>Início</th><th>Prazo</th><th>Progresso</th></tr></thead><tbody>${taskLines(b.tasks)}</tbody></table>` : '<p class="muted">Nenhuma tarefa nesta etapa.</p>'}`).join('') +
    (loose.length ? `<h3>Sem etapa</h3><table class="grid"><thead><tr><th>Tarefa</th><th>Status</th><th>Prioridade</th><th>Início</th><th>Prazo</th><th>Progresso</th></tr></thead><tbody>${taskLines(loose)}</tbody></table>` : '');
  const gen = new Date().toLocaleString('pt-BR');
  const csv = projectCsv(data);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório · ${escapeHtml(p.name)}</title>
<style>
  *{box-sizing:border-box} body{font-family:'Open Sans','Segoe UI',Arial,sans-serif; color:#1B2130; margin:0; padding:32px 40px 60px; max-width:980px; margin:0 auto; line-height:1.45;}
  .bar{position:sticky; top:0; background:#fff; padding:10px 0 14px; display:flex; gap:10px; justify-content:flex-end; border-bottom:1px solid #E2E8F0; margin-bottom:22px;}
  .bar button, .bar a{font:inherit; font-size:13px; font-weight:600; border:1px solid #CBD5E1; background:#fff; border-radius:10px; padding:8px 14px; cursor:pointer; text-decoration:none; color:#1B2130}
  .bar button.pri{background:#2F5F9E; color:#fff; border-color:#2F5F9E}
  header{display:flex; gap:16px; align-items:center; margin-bottom:6px}
  .badge{width:52px; height:52px; border-radius:50%; background:${color}22; color:${color}; display:grid; place-items:center; flex:none}
  .badge svg{width:28px; height:28px}
  h1{margin:0; font-size:26px; letter-spacing:-.01em} .sub{color:#64748B; font-size:13px}
  .desc{margin:14px 0 4px; font-size:14.5px; white-space:pre-wrap}
  .kpis{display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:18px 0 8px}
  .kpi{border:1px solid #E2E8F0; border-radius:12px; padding:12px 14px} .kpi small{display:block; color:#64748B; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700} .kpi b{font-size:20px}
  .prog{height:8px; background:#EEF2F7; border-radius:99px; overflow:hidden; margin-top:8px} .prog i{display:block; height:100%; background:${color}}
  h2{font-size:15px; margin:30px 0 10px; letter-spacing:.02em; text-transform:uppercase; color:#475569}
  h3{font-size:14px; margin:20px 0 6px} h3 span{font-weight:400; color:#64748B; font-size:12px; margin-left:6px}
  table{border-collapse:collapse; width:100%} .grid th{text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:#64748B; border-bottom:2px solid #E2E8F0; padding:6px 8px} .grid td{padding:7px 8px; border-bottom:1px solid #EEF2F7; font-size:12.5px; vertical-align:top}
  .pill{display:inline-block; border-radius:99px; padding:1px 9px; font-size:11px; font-weight:700; white-space:nowrap}
  .muted{color:#94A3B8; font-size:12.5px}
  .tl th{font-size:10px; text-transform:uppercase; color:#64748B; text-align:left; padding:4px 6px; border-bottom:2px solid #E2E8F0; font-weight:700}
  .tl-l{width:240px; padding:5px 8px; border-bottom:1px solid #EEF2F7; font-size:12px; vertical-align:middle} .tl-l.ind{padding-left:26px; font-size:11.5px; color:#475569} .tl-l b{display:block; font-weight:600} .tl-l small{color:#94A3B8; font-size:10.5px}
  .tl-t{padding:0; border-bottom:1px solid #EEF2F7}
  .tl-track{position:relative; height:28px} .tl-bar{position:absolute; top:7px; height:14px; border-radius:7px; overflow:hidden} .tl-bar i{display:block; height:100%} .tl-today{position:absolute; top:0; bottom:0; width:2px; background:#E5484D}
  .months{display:flex} .months span{font-size:10px; font-weight:700; color:#64748B; border-left:1px solid #E2E8F0; padding:3px 6px; overflow:hidden; white-space:nowrap}
  footer{margin-top:36px; color:#94A3B8; font-size:11px; border-top:1px solid #E2E8F0; padding-top:10px}
  @media print{ .bar{display:none} body{padding:0} h3, tr{break-inside:avoid} }
</style></head><body>
<div class="bar"><a download="relatorio-${escapeHtml((p.name || 'projeto').replace(/[^\\w\\-]+/g, '_'))}.csv" href="data:text/csv;charset=utf-8,${encodeURIComponent(csv)}">Baixar planilha (CSV)</a><button class="pri" onclick="window.print()">Imprimir / salvar em PDF</button></div>
<header><div class="badge">${projectIconSvg(p.icon || 'briefcase')}</div><div><h1>${escapeHtml(p.name)}</h1><div class="sub">${cat ? escapeHtml(cat.name) + ' · ' : ''}Relatório gerado em ${gen}</div></div></header>
${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ''}
<div class="kpis">
  <div class="kpi"><small>Progresso</small><b>${st.pct}%</b><div class="prog"><i style="width:${st.pct}%"></i></div></div>
  <div class="kpi"><small>Etapas</small><b>${st.done} de ${st.total}</b></div>
  <div class="kpi"><small>Próxima entrega</small><b style="font-size:14px">${st.next ? escapeHtml(st.next.name) + ' · ' + fmtDate(st.next.end) : '—'}</b></div>
  <div class="kpi"><small>Entrega prevista</small><b style="font-size:14px">${p.endDate ? fmtDate(p.endDate) : (st.end ? fmtDate(st.end) : '—')}</b></div>
</div>
<h2>Linha do tempo</h2>
<table class="tl"><thead><tr><th>Etapa / tarefa</th><th><div class="months">${months.map(m => `<span style="width:${m.w}%">${m.l}</span>`).join('')}</div></th></tr></thead><tbody>${tl}</tbody></table>
<p class="muted">A linha vermelha marca hoje. Barras sólidas mostram o progresso.</p>
<h2>Tarefas por etapa</h2>
${tables || '<p class="muted">Este projeto ainda não tem etapas.</p>'}
<footer>DOUNO Tasks · ${escapeHtml(p.name)} · ${gen}</footer>
</body></html>`;
}
