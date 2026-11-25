import { G } from './globais.js';
import { escapeHtml, fold, fmtDate } from './10-helpers.js';
import { openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { addRelatedTask } from './63-relacionados.js';

/* ===================== CITAR TAREFAS COM @ =====================
   Na descrição e nos comentários da tarefa: digitar @ abre uma lista simples (sem título) que filtra a cada letra, pelo nome ou
   pelo número da tarefa. Escolher (clique, Enter ou Tab) coloca no texto  @[#0042 Nome da tarefa]  e, fora da edição, isso aparece
   como um chip clicável que abre a tarefa citada. O texto guardado continua legível mesmo sem o chip. */
const MENCAO_RE = /@\[#(\d{1,8})(?: ([^\]\n]*))?\]/g;
const MAX_ITENS = 6;

export const hasMencao = (text) => /@\[#\d/.test(String(text || ''));
const idsCitados = (text) => { const out = []; let m; MENCAO_RE.lastIndex = 0; while((m = MENCAO_RE.exec(String(text || '')))) out.push(m[1]); return out; };

/* Ao salvar um texto, as tarefas citadas agora (e não antes) viram tarefas relacionadas desta. */
export function linkNovasMencoes(task, antes, depois){
  if(!task) return;
  const jaTinha = new Set(idsCitados(antes));
  idsCitados(depois).filter(id => !jaTinha.has(id)).forEach(id => { const o = taskByShort(id); if(o) addRelatedTask(task, o.id); });
}
const taskByShort = (id) => G.state.tasks.find(t => t.shortId === id) || null;
const limpaTitulo = (s) => String(s || '').replace(/[\]\[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

/* Endereços (http://, https:// ou www.) viram link que abre em outra aba. A pontuação final da frase não entra no link. */
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
export const hasLink = (text) => { URL_RE.lastIndex = 0; return URL_RE.test(String(text || '')); };
function comLinks(raw){
  let out = '', last = 0, m;
  URL_RE.lastIndex = 0;
  while((m = URL_RE.exec(raw))){
    let url = m[0];
    const fecha = { ')': '(', ']': '[' };
    for(;;){
      const c = url.slice(-1);
      if(/[.,;:!?'"]/.test(c)) url = url.slice(0, -1);
      else if(fecha[c] && url.split(c).length > url.split(fecha[c]).length) url = url.slice(0, -1);
      else break;
    }
    if(!/^(?:https?:\/\/|www\.)[^\s]+/i.test(url) || /^(?:https?:\/\/|www\.)$/i.test(url)){ continue; }
    const href = /^www\./i.test(url) ? 'https://' + url : url;
    out += escapeHtml(raw.slice(last, m.index)) + `<a class="auto-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    last = m.index + url.length;
    URL_RE.lastIndex = last;
  }
  return out + escapeHtml(raw.slice(last));
}

/* HTML (já escapado) do texto, com cada @[#id Nome] virando um chip e cada endereço virando link. O nome mostrado é o atual da tarefa. */
export function renderMencoes(text){
  const s = String(text == null ? '' : text);
  let out = '', last = 0, m;
  MENCAO_RE.lastIndex = 0;
  while((m = MENCAO_RE.exec(s))){
    out += comLinks(s.slice(last, m.index));
    const t = taskByShort(m[1]);
    if(t){
      out += `<span class="men${t.done ? ' done' : ''}" role="button" tabindex="0" data-men-task="${escapeHtml(t.id)}" title="Abrir tarefa">@${escapeHtml(t.title || 'Sem título')}</span>`;
    } else {
      out += `<span class="men gone" title="Tarefa removida">@${escapeHtml(m[2] || 'Tarefa removida')}</span>`;
    }
    last = m.index + m[0].length;
  }
  return out + comLinks(s.slice(last));
}

/* Clique (ou Enter) num chip abre a tarefa citada. */
export function bindMencaoClicks(root){
  const abre = (e) => {
    const c = e.target.closest && e.target.closest('[data-men-task]');
    if(!c || !root.contains(c)) return false;
    e.preventDefault(); e.stopPropagation();
    openTaskPanel(c.dataset.menTask);
    return true;
  };
  root.addEventListener('click', abre);
  root.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') abre(e); });
}

function buscar(q, selfId){
  const term = fold(q.trim().replace(/^#/, ''));
  const all = G.state.tasks.filter(t => t.id !== selfId);
  let list;
  if(!term){
    list = all.filter(t => !t.done).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } else {
    const pts = (t) => {
      const ti = fold(t.title), sid = String(t.shortId || '');
      if(sid === term || sid === term.padStart(4, '0')) return 0;
      if(ti.startsWith(term)) return 1;
      if(sid.includes(term)) return 2;
      if(ti.includes(term)) return 3;
      return -1;
    };
    list = all.map(t => [t, pts(t)]).filter(x => x[1] >= 0)
      .sort((a, b) => (a[0].done - b[0].done) || (a[1] - b[1]) || ((a[0].dueDate || '9') < (b[0].dueDate || '9') ? -1 : 1))
      .map(x => x[0]);
  }
  return list.slice(0, MAX_ITENS);
}

const PRIO_COR = { critica: 'var(--priority-critica)', alta: 'var(--priority-alta)', media: 'var(--priority-media)', baixa: 'var(--priority-baixa)' };

/* Liga o @ a um campo de texto (textarea). getSelfId: id da tarefa aberta, que não aparece na lista. */
export function bindMencoes(ta, getSelfId){
  let pop = null, itens = [], idx = 0;
  const host = ta.parentElement;
  const fecha = () => { if(pop){ pop.remove(); pop = null; } itens = []; idx = 0; };
  const consulta = () => {
    const pos = ta.selectionStart;
    const antes = ta.value.slice(0, pos);
    const m = /(^|[\s(])@([^\n@\[\]]{0,40})$/.exec(antes);
    return m ? { q: m[2], de: pos - m[2].length - 1, ate: pos } : null;
  };
  const escolhe = (t) => {
    const c = consulta(); if(!c) return fecha();
    const token = '@[#' + t.shortId + ' ' + limpaTitulo(t.title) + '] ';
    ta.value = ta.value.slice(0, c.de) + token + ta.value.slice(c.ate);
    const p = c.de + token.length;
    ta.setSelectionRange(p, p);
    fecha();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  };
  const pinta = () => {
    if(!pop){
      if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
      pop = document.createElement('div'); pop.className = 'men-pop'; pop.setAttribute('role', 'listbox');
      pop.addEventListener('mousedown', (e) => e.preventDefault());
      host.appendChild(pop);
    }
    pop.style.top = (ta.offsetTop + ta.offsetHeight + 4) + 'px';
    pop.innerHTML = itens.map((t, i) => `<div class="men-r${i === idx ? ' on' : ''}" role="option" data-i="${i}">
      <span class="men-id">#${escapeHtml(t.shortId)}</span><span class="men-t">${escapeHtml(t.title || 'Sem título')}</span>
      <span class="men-dot" style="background:${t.done ? 'var(--ok)' : (PRIO_COR[t.priority] || 'var(--ink-faint)')}"></span>
      <small>${t.done ? 'concluída' : (t.dueDate ? fmtDate(t.dueDate) : '')}</small></div>`).join('');
    pop.querySelectorAll('.men-r').forEach(r => { r.onclick = () => escolhe(itens[Number(r.dataset.i)]); });
  };
  const atualiza = () => {
    const c = consulta();
    if(!c) return fecha();
    itens = buscar(c.q, getSelfId && getSelfId());
    if(!itens.length) return fecha();
    if(idx >= itens.length) idx = 0;
    pinta();
  };
  ta.addEventListener('input', atualiza);
  ta.addEventListener('click', atualiza);
  ta.addEventListener('blur', () => setTimeout(fecha, 120));
  ta.addEventListener('keydown', (e) => {
    if(!pop || !itens.length) return;
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length; pinta();
    } else if(e.key === 'Enter' || e.key === 'Tab'){
      e.preventDefault(); e.stopImmediatePropagation(); escolhe(itens[idx]);
    } else if(e.key === 'Escape'){
      e.preventDefault(); e.stopPropagation(); fecha();
    }
  });
}
