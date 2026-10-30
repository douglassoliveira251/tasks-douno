/* ===================== TEXTO RICO (negrito, itálico, listas etc.) ===================== */
const RT_ICONS = {
  alignLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>',
  alignCenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M5 18h14"/></svg>',
  alignRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M10 12h10M6 18h14"/></svg>',
  bulletList: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"/><path d="M9.5 6h10M9.5 12h10M9.5 18h10"/></svg>',
  numberList: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0.6" font-family="sans-serif"><text x="1.5" y="8.5" font-size="7">1</text><text x="1.5" y="14.5" font-size="7">2</text><text x="1.5" y="20.5" font-size="7">3</text><path d="M9.5 6h10M9.5 12h10M9.5 18h10" stroke-width="2" fill="none"/></svg>',
  clearFormat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H8l-6-6a2 2 0 010-3l9-9a2 2 0 013 0l7 7a2 2 0 010 3l-8 8"/><path d="M12.5 6.5l7 7"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
  indent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 6h8M13 12h8M13 18h8M3 6h4"/><path d="M3 12l4 3-4 3z" fill="currentColor" stroke="none"/></svg>'
};

function clearFormattingInSelection(targetEl){
  ensureSelectionInTarget(targetEl);
  const sel = window.getSelection();
  if(!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  function topLevelAncestor(node){
    if(!node) return null;
    while(node && node.parentNode !== targetEl) node = node.parentNode;
    return node;
  }
  function nodeToLines(node){
    let html = node.nodeType === 1 ? node.innerHTML : escapeHtml(node.textContent || '');
    html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li|h1|h2|h3)>/gi, '\n').replace(/<[^>]+>/g, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const lines = (tmp.textContent || '').split('\n');
    if(lines.length > 1 && lines[lines.length-1] === '') lines.pop();
    return lines;
  }
  function buildFragmentFromLines(lines){
    const frag = document.createDocumentFragment();
    lines.forEach(line => {
      const d = document.createElement('div');
      if(line === '') d.innerHTML = '<br>';
      else d.textContent = line;
      frag.appendChild(d);
    });
    return frag;
  }

  if(range.collapsed){
    let node = range.startContainer;
    let el = node.nodeType === 1 ? node : node.parentNode;
    while(el && el !== targetEl && !/^(DIV|P|H1|H2|H3|LI|UL|OL)$/.test(el.tagName)){
      el = el.parentNode;
    }
    if(!el || el === targetEl) return;
    const top = topLevelAncestor(el) || el;

    // Isola apenas a linha onde está o cursor (entre os <br> que a delimitam dentro do
    // bloco), sem tocar nas demais linhas do mesmo bloco nem recriar a estrutura dele.
    const childNodes = Array.from(top.childNodes);
    const isBr = n => n.nodeType === 1 && n.tagName === 'BR';
    let cursorChild = range.startContainer;
    while(cursorChild && cursorChild.parentNode !== top) cursorChild = cursorChild.parentNode;
    let cursorIndex = cursorChild ? childNodes.indexOf(cursorChild) : -1;
    if(cursorIndex === -1) cursorIndex = 0;

    let segStart = 0;
    for(let i = cursorIndex; i >= 0; i--){ if(isBr(childNodes[i])){ segStart = i+1; break; } }
    let segEnd = childNodes.length;
    for(let i = cursorIndex; i < childNodes.length; i++){ if(isBr(childNodes[i])){ segEnd = i; break; } }
    const segNodes = childNodes.slice(segStart, segEnd);
    const text = segNodes.map(n => n.textContent || '').join('');
    if(!text) return;

    const textNode = document.createTextNode(text);
    top.insertBefore(textNode, segNodes[0]);
    segNodes.forEach(n => { if(n.parentNode === top) top.removeChild(n); });

    const newRange = document.createRange();
    newRange.setStart(textNode, textNode.length);
    newRange.setEnd(textNode, textNode.length);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return;
  }

  function resolveEdgeNode(container, offset, isEnd){
    if(container.nodeType === 1){
      if(container === targetEl){
        const idx = isEnd ? Math.max(0, offset - 1) : Math.min(offset, container.childNodes.length - 1);
        return container.childNodes[idx] || (isEnd ? container.lastChild : container.firstChild);
      }
      return container;
    }
    return container.parentNode;
  }
  const startNode = resolveEdgeNode(range.startContainer, range.startOffset, false);
  const endNode = resolveEdgeNode(range.endContainer, range.endOffset, true);
  const startTop = topLevelAncestor(startNode);
  const endTop = topLevelAncestor(endNode);

  if(!startTop || !endTop || startTop === endTop){
    // Seleção contida num único bloco: usar o removeFormat nativo do navegador,
    // que divide corretamente as tags inline (negrito/itálico/sublinhado) nos
    // limites exatos da seleção, sem afetar o restante do parágrafo.
    try{ document.execCommand('removeFormat', false, null); }catch(e){}
    // removeFormat não desfaz título (H1/H2/H3) — o bloco pode conter várias
    // linhas (separadas por <br>) quando o formatBlock do navegador funde uma
    // seleção multi-linha num único título. Troca a tag do bloco por uma div
    // comum preservando o conteúdo inteiro (título é propriedade do bloco
    // todo, não de parte dele — igual já vale pra aplicar um título).
    if(startTop.nodeType === 1 && /^(H1|H2|H3)$/.test(startTop.tagName)){
      const div = document.createElement('div');
      div.innerHTML = startTop.innerHTML;
      startTop.parentNode.replaceChild(div, startTop);
      const newRange = document.createRange();
      newRange.selectNodeContents(div);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    return;
  }

  const nodesToReplace = [];
  let cur = startTop;
  while(cur){
    nodesToReplace.push(cur);
    if(cur === endTop) break;
    cur = cur.nextSibling;
  }
  const allLines = [];
  nodesToReplace.forEach(n => { allLines.push(...nodeToLines(n)); });
  const frag = buildFragmentFromLines(allLines);
  const lastNew = frag.lastChild;
  targetEl.insertBefore(frag, nodesToReplace[0]);
  nodesToReplace.forEach(n => { if(n.parentNode === targetEl) targetEl.removeChild(n); });

  if(lastNew){
    const newRange = document.createRange();
    newRange.selectNodeContents(lastNew);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

function ensureSelectionInTarget(targetEl){
  if(!targetEl) return;
  const sel = window.getSelection();
  let inTarget = false;
  if(sel && sel.rangeCount > 0){
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentNode;
    inTarget = !!(el && targetEl.contains(el));
  }
  if(!inTarget){
    targetEl.focus();
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    range.collapse(false);
    if(sel){ sel.removeAllRanges(); sel.addRange(range); }
  }
}

function makeRtButton({ label, style, icon, cmd, title }, targetEl, onAfter){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rt-btn';
  btn.title = title || cmd;
  if(icon) btn.innerHTML = RT_ICONS[icon];
  else { btn.textContent = label; if(style) btn.style.cssText = style; }
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    ensureSelectionInTarget(targetEl);
    document.execCommand(cmd, false, null);
    if(onAfter) onAfter();
  });
  return btn;
}

function makeRtFormatSelect(targetEl){
  const select = document.createElement('select');
  select.className = 'rt-format-select';
  select.title = 'Tamanho do texto';
  select.innerHTML = `
    <option value="P">Normal</option>
    <option value="H1">Título 1</option>
    <option value="H2">Título 2</option>
    <option value="H3">Título 3</option>
  `;
  let savedRange = null;
  select.addEventListener('mousedown', () => {
    ensureSelectionInTarget(targetEl);
    const sel = window.getSelection();
    if(sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
  });
  select.addEventListener('change', () => {
    /* captura o valor escolhido ANTES de focar de volta o editor: focar dispara o listener de
       'focus' do editor, que chama sync() e pode reescrever select.value com base na posição
       atual do cursor (ainda não restaurada nesse ponto), sobrescrevendo a escolha do usuário
       antes do execCommand abaixo ler o valor. */
    const chosen = select.value;
    if(targetEl) targetEl.focus();
    if(savedRange){
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } else {
      ensureSelectionInTarget(targetEl);
    }
    document.execCommand('formatBlock', false, chosen);
    select.value = chosen;
  });
  function sync(){
    if(!targetEl) return;
    const sel = window.getSelection();
    if(!sel || !sel.rangeCount) return;
    const node = sel.getRangeAt(0).startContainer;
    if(!targetEl.contains(node)) return;
    let el = node.nodeType === 1 ? node : node.parentNode;
    let tag = 'P';
    while(el && el !== targetEl){
      if(/^(H1|H2|H3)$/.test(el.tagName)){ tag = el.tagName; break; }
      el = el.parentNode;
    }
    select.value = tag;
  }
  return { element: select, sync };
}

function buildRichToolbar(targetEl){
  const bar = document.createElement('div');
  bar.className = 'rt-toolbar';
  const formatSelect = makeRtFormatSelect(targetEl);
  bar.appendChild(formatSelect.element);
  const sep0 = document.createElement('span'); sep0.className='rt-sep'; bar.appendChild(sep0);

  const tracked = [];
  function updateActiveStates(){
    tracked.forEach(({ cmd, btn }) => {
      let isActive = false;
      try{ isActive = document.queryCommandState(cmd); }catch(e){}
      btn.classList.toggle('active', isActive);
    });
    formatSelect.sync();
  }
  function addTracked(cmd, btn){ tracked.push({ cmd, btn }); bar.appendChild(btn); }

  addTracked('bold', makeRtButton({ label:'B', style:'font-weight:700;', cmd:'bold', title:'Negrito' }, targetEl, updateActiveStates));
  addTracked('italic', makeRtButton({ label:'I', style:'font-style:italic;', cmd:'italic', title:'Itálico' }, targetEl, updateActiveStates));
  addTracked('underline', makeRtButton({ label:'U', style:'text-decoration:underline;', cmd:'underline', title:'Sublinhado' }, targetEl, updateActiveStates));
  const sep1 = document.createElement('span'); sep1.className='rt-sep'; bar.appendChild(sep1);
  addTracked('justifyLeft', makeRtButton({ icon:'alignLeft', cmd:'justifyLeft', title:'Alinhar à esquerda' }, targetEl, updateActiveStates));
  addTracked('justifyCenter', makeRtButton({ icon:'alignCenter', cmd:'justifyCenter', title:'Centralizar' }, targetEl, updateActiveStates));
  addTracked('justifyRight', makeRtButton({ icon:'alignRight', cmd:'justifyRight', title:'Alinhar à direita' }, targetEl, updateActiveStates));
  const sep2 = document.createElement('span'); sep2.className='rt-sep'; bar.appendChild(sep2);
  addTracked('insertUnorderedList', makeRtButton({ icon:'bulletList', cmd:'insertUnorderedList', title:'Marcadores' }, targetEl, updateActiveStates));
  addTracked('insertOrderedList', makeRtButton({ icon:'numberList', cmd:'insertOrderedList', title:'Numeração' }, targetEl, updateActiveStates));
  bar.appendChild(makeRtButton({ icon:'indent', cmd:'indent', title:'Aumentar recuo (Tab)' }, targetEl, updateActiveStates));
  const sep3 = document.createElement('span'); sep3.className='rt-sep'; bar.appendChild(sep3);
  const clearFormatBtn = document.createElement('button');
  clearFormatBtn.type = 'button';
  clearFormatBtn.className = 'rt-btn';
  clearFormatBtn.title = 'Limpar formatação';
  clearFormatBtn.innerHTML = RT_ICONS.clearFormat;
  clearFormatBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    clearFormattingInSelection(targetEl);
    updateActiveStates();
  });
  bar.appendChild(clearFormatBtn);

  if(targetEl){
    targetEl.addEventListener('keyup', updateActiveStates);
    targetEl.addEventListener('mouseup', updateActiveStates);
    targetEl.addEventListener('focus', updateActiveStates);
    targetEl.addEventListener('click', updateActiveStates);
  }
  return bar;
}

function fmtUpdatedAt(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function fmtActivityTime(ts){
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

function tintSolid(hex, amount){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  const mix = (c) => Math.round(c + (255 - c) * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const PASTE_ALLOWED_TAGS = ['B','STRONG','I','EM','U','H1','H2','H3','UL','OL','LI','BR','P','DIV'];
function sanitizePastedHtml(html){
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

function attachFormattedPaste(targetEl){
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

function attachTabIndent(targetEl){
  targetEl.addEventListener('keydown', (e) => {
    if(e.key !== 'Tab') return;
    e.preventDefault();
    try{ document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }catch(err){}
  });
}

function stripHtml(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || '';
}

/* Converte o HTML do editor de notas (b/strong, i/em, u, h1-h3, ul/ol, br, img) pra markdown.
   O corpo da nota não usa <div>/<p> por linha - as linhas são separadas por <br> no nível raiz -
   então o percorrimento acumula texto/inline num buffer e só "quebra linha" em <br> ou blocos. */
function htmlToMarkdown(html){
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

function downloadTextFile(filename, content, mime){
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugifyFilename(title){
  return (title || 'nota').trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'nota';
}

function exportNoteAsMarkdown(note){
  const md = `# ${note.title || 'Sem título'}\n\n` + htmlToMarkdown(note.body);
  downloadTextFile(slugifyFilename(note.title) + '.md', md, 'text/markdown');
}

function exportNoteAsPdf(note){
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

function closeNoteExportMenu(){
  const m = document.getElementById('noteExportMenuPopover');
  if(m) m.remove();
}
function openNoteExportMenu(anchorBtn, note){
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

