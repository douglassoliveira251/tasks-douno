import { dateToStr, escapeHtml, todayStr } from './10-helpers.js';
import { addDaysStr } from './25-calendario.js';

export function fmtUpdatedAt(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

export function fmtActivityTime(ts){
  if(!ts) return '';
  const d = new Date(ts);
  const timeStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  const dStr = dateToStr(d);
  const todayS = todayStr();
  const yestS = addDaysStr(todayS, -1);
  if(dStr === todayS) return `Hoje, ${timeStr}`;
  if(dStr === yestS) return `Ontem, ${timeStr}`;
  return `${d.toLocaleDateString('pt-BR')}, ${timeStr}`;
}

export function tintSolid(hex, amount){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  const mix = (c) => Math.round(c + (255 - c) * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export const PASTE_ALLOWED_TAGS = ['B','STRONG','I','EM','U','H1','H2','H3','UL','OL','LI','BR','P','DIV'];
export function sanitizePastedHtml(html){
  const temp = document.createElement('div');
  temp.innerHTML = html;
  function clean(node){
    Array.from(node.childNodes).forEach(child => {
      if(child.nodeType === 1){
        clean(child);
        if(!PASTE_ALLOWED_TAGS.includes(child.tagName)){
          const parent = child.parentNode;
          while(child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        } else {
          Array.from(child.attributes).forEach(attr => child.removeAttribute(attr.name));
        }
      } else if(child.nodeType !== 3){
        child.parentNode.removeChild(child);
      }
    });
  }
  clean(temp);
  return temp.innerHTML;
}

export function attachFormattedPaste(targetEl){
  targetEl.addEventListener('paste', (e) => {
    const cd = e.clipboardData || window.clipboardData;
    const items = cd && cd.items ? Array.from(cd.items) : [];
    const imageItem = items.find(it => it.type && it.type.indexOf('image') === 0);
    if(imageItem){
      e.preventDefault();
      const file = imageItem.getAsFile();
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.execCommand('insertHTML', false, `<img src="${ev.target.result}" style="max-width:100%; border-radius:6px; margin:6px 0;">`);
      };
      reader.readAsDataURL(file);
      return;
    }
    e.preventDefault();
    const textData = cd.getData('text/plain');
    const insertHtml = escapeHtml(textData).replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, insertHtml);
  });
}

export function attachTabIndent(targetEl){
  targetEl.addEventListener('keydown', (e) => {
    if(e.key !== 'Tab') return;
    e.preventDefault();
    try{ document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }catch(err){}
  });
}

export function stripHtml(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
}

/* Converte o HTML do editor de notas (b/strong, i/em, u, h1-h3, ul/ol, br, img) pra markdown.
   O corpo da nota não usa <div>/<p> por linha - as linhas são separadas por <br> no nível raiz -
   então o percorrimento acumula texto/inline num buffer e só "quebra linha" em <br> ou blocos. */
export function htmlToMarkdown(html){
  const container = document.createElement('div');
  container.innerHTML = html || '';
  function inline(node){
    if(node.nodeType === 3) return node.textContent;
    if(node.nodeType !== 1) return '';
    const tag = node.tagName;
    const inner = Array.from(node.childNodes).map(inline).join('');
    if(tag === 'B' || tag === 'STRONG') return `**${inner}**`;
    if(tag === 'I' || tag === 'EM') return `*${inner}*`;
    if(tag === 'U') return `<u>${inner}</u>`;
    if(tag === 'BR') return '\n';
    if(tag === 'IMG') return `![](${node.getAttribute('src')||''})`;
    if(tag === 'A') return `[${inner}](${node.getAttribute('href')||''})`;
    return inner;
  }
  function listToLines(listEl, depth){
    const lines = [];
    let n = 1;
    Array.from(listEl.children).forEach(li => {
      if(li.tagName !== 'LI') return;
      const nested = li.querySelector(':scope > ul, :scope > ol');
      const ownText = Array.from(li.childNodes).filter(c => c !== nested).map(inline).join('').trim();
      const prefix = listEl.tagName === 'OL' ? `${n++}. ` : '- ';
      lines.push('  '.repeat(depth) + prefix + ownText);
      if(nested) lines.push(...listToLines(nested, depth + 1));
    });
    return lines;
  }
  const lines = [];
  let buf = '';
  function flush(){ lines.push(buf); buf = ''; }
  Array.from(container.childNodes).forEach(node => {
    if(node.nodeType === 3){ buf += node.textContent; return; }
    if(node.nodeType !== 1) return;
    const tag = node.tagName;
    if(tag === 'BR'){ flush(); return; }
    if(tag === 'H1'){ flush(); lines.push('# ' + inline(node).trim()); return; }
    if(tag === 'H2'){ flush(); lines.push('## ' + inline(node).trim()); return; }
    if(tag === 'H3'){ flush(); lines.push('### ' + inline(node).trim()); return; }
    if(tag === 'UL' || tag === 'OL'){ flush(); lines.push(...listToLines(node, 0)); return; }
    if(tag === 'DIV' || tag === 'P'){ flush(); lines.push(inline(node).trim()); return; }
    buf += inline(node);
  });
  flush();
  const out = [];
  lines.forEach(l => { if(l === '' && out[out.length - 1] === '') return; out.push(l); });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function downloadTextFile(filename, content, mime){
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugifyFilename(title){
  return (title || 'nota').trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'nota';
}

export function exportNoteAsMarkdown(note){
  const md = `# ${note.title || 'Sem título'}\n\n` + htmlToMarkdown(note.body);
  downloadTextFile(slugifyFilename(note.title) + '.md', md, 'text/markdown');
}

export function exportNoteAsPdf(note){
  const win = window.open('', '_blank');
  if(!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title || 'Nota')}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#1a1a1a; max-width:720px; margin:40px auto; padding:0 20px; line-height:1.55;}
      .note-title{font-size:26px; font-weight:700; margin:0 0 18px;}
      .note-body h1{font-size:22px; font-weight:700; color:#1a1a1a; margin:14px 0 6px;}
      .note-body h2{font-size:18px; font-weight:700; color:#1a1a1a; margin:12px 0 6px;}
      .note-body h3{font-size:15px; font-weight:700; color:#1a1a1a; margin:10px 0 6px;}
      .note-body ul, .note-body ol{padding-left:22px; margin:6px 0;}
      .note-body img{max-width:100%;}
      @media print{ body{margin:0; padding:20px;} }
    </style>
  </head><body>
    <div class="note-title">${escapeHtml(note.title || 'Sem título')}</div>
    <div class="note-body">${note.body || ''}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

export function closeNoteExportMenu(){
  const m = document.getElementById('noteExportMenuPopover');
  if(m) m.remove();
}
export function openNoteExportMenu(anchorBtn, note){
  const existing = document.getElementById('noteExportMenuPopover');
  closeNoteExportMenu();
  if(existing) return;
  const pop = document.createElement('div');
  pop.id = 'noteExportMenuPopover';
  pop.className = 'task-menu-portal show';
  pop.innerHTML = `
    <button type="button" class="task-menu-item" data-act="md"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Exportar como Markdown (.md)</button>
    <button type="button" class="task-menu-item" data-act="pdf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>Exportar como PDF</button>
  `;
  document.body.appendChild(pop);
  const r = anchorBtn.getBoundingClientRect();
  pop.style.left = Math.min(r.left, window.innerWidth - 240) + 'px';
  pop.style.top = (r.bottom + 4) + 'px';
  pop.onclick = e => e.stopPropagation();
  pop.querySelector('[data-act=md]').onclick = () => { closeNoteExportMenu(); exportNoteAsMarkdown(note); };
  pop.querySelector('[data-act=pdf]').onclick = () => { closeNoteExportMenu(); exportNoteAsPdf(note); };
}
document.addEventListener('click', (e) => {
  const pop = document.getElementById('noteExportMenuPopover');
  if(pop && !pop.contains(e.target) && !e.target.closest('#composerExportBtn')){
    closeNoteExportMenu();
  }
});

