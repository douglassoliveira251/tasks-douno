import { addDaysStr } from './25-calendario.js';

/* ===================== Gráfico de linha do Resumo: concluídas × criadas ===================== */
/* Os pontos são dias (Semana, Mês, 30 dias) ou semanas (Trimestre). A linha cheia é o que foi concluído, a tracejada o que foi
   criado e a pontilhada o período anterior, do mesmo tamanho. O desenho é refeito quando a largura do cartão muda. */

const dayKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/* Conta por data (AAAA-MM-DD) quantas tarefas têm aquele campo de data/hora. */
function countByDay(list, field){
  const map = {};
  list.forEach(t => { const v = t[field]; if(!v) return; const k = dayKey(v); map[k] = (map[k] || 0) + 1; });
  return map;
}
function sumRange(map, a, b){
  let n = 0;
  for(let d = a; d <= b; d = addDaysStr(d, 1)) n += map[d] || 0;
  return n;
}

/* Monta os pontos do período escolhido: lista de trechos {a, b, label} atual e anterior (mesmo número de pontos). */
export function buildBuckets(todayS, key){
  const [y, m] = todayS.split('-').map(Number);
  const cur = [], prev = [];
  let xCount, labelEvery;
  if(key === 'semana'){
    for(let i = 6; i >= 0; i--){ const d = addDaysStr(todayS, -i); cur.push({ a: d, b: d, label: WD[new Date(d + 'T12:00:00').getDay()] }); const p = addDaysStr(d, -7); prev.push({ a: p, b: p }); }
    xCount = 7; labelEvery = 1;
  } else if(key === 'mes'){
    const dim = new Date(y, m, 0).getDate();
    const pm = new Date(y, m - 1, 0), pDim = pm.getDate();
    const pBase = pm.getFullYear() + '-' + String(pm.getMonth() + 1).padStart(2, '0') + '-';
    const base = todayS.slice(0, 8);
    const hoje = Number(todayS.slice(8));
    for(let d = 1; d <= dim; d++){
      const ds = base + String(d).padStart(2, '0');
      if(d <= hoje) cur.push({ a: ds, b: ds, label: String(d) }); else cur.push(null);
      if(d <= pDim){ const ps = pBase + String(d).padStart(2, '0'); prev.push({ a: ps, b: ps }); } else prev.push(null);
    }
    xCount = dim; labelEvery = 5;
  } else if(key === '90'){
    const start = addDaysStr(todayS, -89);
    for(let i = 0; i < 13; i++){
      const a = addDaysStr(start, i * 7), b = i === 12 ? todayS : addDaysStr(a, 6);
      cur.push({ a, b, label: a.slice(8) + '/' + a.slice(5, 7) });
      const pa = addDaysStr(a, -90), pb = addDaysStr(b, -90);
      prev.push({ a: pa, b: pb });
    }
    xCount = 13; labelEvery = 3;
  } else { /* 30 dias */
    for(let i = 29; i >= 0; i--){ const d = addDaysStr(todayS, -i); cur.push({ a: d, b: d, label: d.slice(8) }); const p = addDaysStr(d, -30); prev.push({ a: p, b: p }); }
    xCount = 30; labelEvery = 5;
  }
  return { cur, prev, xCount, labelEvery };
}

/* Séries do gráfico a partir das tarefas (concluídas e do histórico) e das datas de criação. */
export function buildSeries(todayS, key, completed, created){
  const bk = buildBuckets(todayS, key);
  const doneMap = countByDay(completed, 'completedAt');
  const newMap = countByDay(created, 'createdAt');
  const pick = (arr, map) => arr.map(b => b ? sumRange(map, b.a, b.b) : null);
  return {
    xCount: bk.xCount,
    labels: bk.cur.map((b, i) => {
      if(key === 'mes') return (i === 0 || (i + 1) % bk.labelEvery === 0) ? String(i + 1) : '';
      return (key === 'semana' || i % bk.labelEvery === 0) ? b.label : '';
    }),
    done: pick(bk.cur, doneMap),
    created: pick(bk.cur, newMap),
    prev: pick(bk.prev, doneMap),
  };
}

/* Teto do eixo com 4 divisões em números inteiros (4, 8, 12, 20, 40, 100...). */
function niceMax(v){
  const q = Math.max(1, v) / 4;
  const steps = [1, 2, 3, 5, 10, 15, 25, 50, 100, 250, 500, 1000];
  return 4 * (steps.find(x => x >= q) || Math.ceil(q));
}

/* Curva suave (Catmull-Rom → Bézier) por uma lista de pontos [x, y]. */
function smooth(pts){
  if(pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  let p = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const k = 0.18;
  for(let i = 0; i < pts.length - 1; i++){
    const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
    p += ` C${(b[0] + (c[0] - a[0]) * k).toFixed(1)},${(b[1] + (c[1] - a[1]) * k).toFixed(1)} ${(c[0] - (e[0] - b[0]) * k).toFixed(1)},${(c[1] - (e[1] - b[1]) * k).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  }
  return p;
}

/* Desenha o gráfico dentro de `host` com a largura atual do elemento. */
export function drawLineChart(host, s, uid){
  const w = Math.max(240, Math.round(host.clientWidth));
  const h = w > 700 ? 200 : 160, padL = 26, padB = 22, padT = 16, padR = 8;
  const iw = w - padL - padR, ih = h - padB - padT;
  const all = [].concat(s.done, s.created, s.prev).filter(v => v !== null);
  const ymax = niceMax(Math.max(1, ...all));
  const X = i => padL + (s.xCount === 1 ? iw / 2 : i * iw / (s.xCount - 1));
  const Y = v => padT + ih - v / ymax * ih;
  const pointsOf = arr => arr.map((v, i) => v === null ? null : [X(i), Y(v)]).filter(Boolean);
  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Concluídas e criadas no período"><defs><linearGradient id="lcg${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lc-line)" stop-opacity=".42"/><stop offset="1" stop-color="var(--lc-line)" stop-opacity="0"/></linearGradient></defs>`;
  for(let g = 0; g <= 4; g++){
    const val = ymax * g / 4, y = Y(val);
    svg += `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}" stroke="var(--border)"${g ? ' stroke-dasharray="3 5" opacity=".75"' : ''}/><text x="${padL - 8}" y="${y + 3.5}" text-anchor="end">${val}</text>`;
  }
  s.labels.forEach((l, i) => { if(l) svg += `<text x="${X(i)}" y="${h - 5}" text-anchor="middle">${l}</text>`; });
  const prevPts = pointsOf(s.prev), newPts = pointsOf(s.created), donePts = pointsOf(s.done);
  if(prevPts.length > 1 && s.prev.some(v => v)) svg += `<path d="${smooth(prevPts)}" fill="none" stroke="var(--ink-faint)" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" opacity=".85"/>`;
  if(newPts.length > 1) svg += `<path d="${smooth(newPts)}" fill="none" stroke="var(--lc-new)" stroke-width="2.2" stroke-dasharray="6 5" stroke-linecap="round"/>`;
  if(donePts.length > 1){
    const d = smooth(donePts);
    svg += `<path d="${d} L${donePts[donePts.length - 1][0]},${Y(0)} L${donePts[0][0]},${Y(0)} Z" fill="url(#lcg${uid})"/><path d="${d}" fill="none" stroke="var(--lc-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lc-glow"/>`;
  }
  if(donePts.length){
    const [lx, ly] = donePts[donePts.length - 1], v = s.done.filter(x => x !== null).pop();
    const tipW = 46, tx = Math.min(Math.max(lx - tipW / 2, padL), w - tipW - 2);
    svg += `<circle cx="${lx}" cy="${ly}" r="9" fill="var(--lc-line)" opacity=".18"/><circle cx="${lx}" cy="${ly}" r="4.5" fill="var(--surface)" stroke="var(--lc-line)" stroke-width="2.5"/>`;
    svg += `<g class="lc-tip"><rect x="${tx}" y="${Math.max(ly - 34, 0)}" width="${tipW}" height="21" rx="7"/><text x="${tx + tipW / 2}" y="${Math.max(ly - 34, 0) + 14}" text-anchor="middle">${v}</text></g>`;
  }
  host.innerHTML = svg + '</svg>';
}

let ro = null;
/* Liga o redesenho ao tamanho do cartão; chamar depois de colocar o HTML do painel na tela. */
export function bindLineChart(host, series){
  if(ro){ ro.disconnect(); ro = null; }
  if(!host) return;
  let lastW = 0;
  const go = () => { const w = Math.round(host.clientWidth); if(w && w !== lastW){ lastW = w; drawLineChart(host, series, 'x'); } };
  go();
  if(typeof ResizeObserver !== 'undefined'){ ro = new ResizeObserver(go); ro.observe(host); }
}
