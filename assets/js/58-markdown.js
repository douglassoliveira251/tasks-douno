import { escapeHtml } from './10-helpers.js';

/* ===================== MARKDOWN → HTML (seguro) =====================
   Conversor pequeno, sem biblioteca. O texto SEMPRE passa por escapeHtml: HTML cru dentro do Markdown aparece como texto
   (nada é executado). Links só viram link com http://, https:// ou mailto: (sempre em outra aba, com noopener); imagens não
   são carregadas (viram link com o texto alternativo), para não avisar sites externos ao abrir a skill.
   Suporta: títulos (#…######), negrito, itálico, tachado, código em linha, blocos de código (``` ou ~~~), listas (com marcadores,
   numeradas e aninhadas), citações, linha separadora, tabelas simples e links. */

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function link(text, url){
  return SAFE_URL.test(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
}

/* texto em linha (negrito, itálico, código, links) */
function inline(raw){
  const codes = [];
  let s = String(raw).replace(/`([^`\n]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = escapeHtml(s);
  // imagem: não carrega; mostra como link com o texto alternativo
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*?&quot;)?\)/g, (m, alt, url) => link(alt || url, url));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*?&quot;)?\)/g, (m, t, url) => link(t, url));
  s = s.replace(/\*\*([^*\n]+?)\*\*|__([^_\n]+?)__/g, (m, a, b) => '<strong>' + (a || b) + '</strong>');
  s = s.replace(/(^|[\s(>])\*([^*\s][^*\n]*?)\*(?=[\s).,;:!?<]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(>])_([^_\s][^_\n]*?)_(?=[\s).,;:!?<]|$)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + escapeHtml(codes[Number(i)]) + '</code>');
  return s;
}

const RE_FENCE = /^\s*(```|~~~)\s*[\w+-]*\s*$/;
const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const RE_QUOTE = /^\s{0,3}>/;
const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const isBlockStart = (l) => RE_FENCE.test(l) || RE_HEADING.test(l) || RE_HR.test(l) || RE_QUOTE.test(l) || RE_LIST.test(l);

function parseList(lines, start){
  const its = []; let i = start;
  while(i < lines.length){
    const l = lines[i];
    const m = l.match(RE_LIST);
    if(m && !RE_HR.test(l)){ its.push({ indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] }); i++; continue; }
    if(!l.trim()){
      if(i + 1 < lines.length && RE_LIST.test(lines[i + 1]) && !RE_HR.test(lines[i + 1])){ i++; continue; }
      break;
    }
    if(/^\s{2,}\S/.test(l) && its.length){ its[its.length - 1].text += ' ' + l.trim(); i++; continue; }
    break;
  }
  return { its, next: i };
}
function listHtml(its){
  let pos = 0;
  function level(indent){
    const ordered = its[pos].ordered;
    const tag = ordered ? 'ol' : 'ul';
    let html = '<' + tag + '>';
    // no mesmo nível, trocar de marcador para numeração (ou o contrário) começa outra lista
    while(pos < its.length && its[pos].indent >= indent && (its[pos].indent > indent || its[pos].ordered === ordered)){
      const it = its[pos++];
      let li = inline(it.text);
      if(pos < its.length && its[pos].indent > indent) li += level(its[pos].indent);
      html += '<li>' + li + '</li>';
    }
    return html + '</' + tag + '>';
  }
  let out = '';
  while(pos < its.length) out += level(its[pos].indent);
  return out;
}
const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

export function renderMarkdown(src){
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while(i < lines.length){
    const line = lines[i];
    if(!line.trim()){ i++; continue; }
    let m = line.match(RE_FENCE);
    if(m){
      const fence = m[1], buf = [];
      i++;
      while(i < lines.length && !lines[i].trim().startsWith(fence)){ buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }
    m = line.match(RE_HEADING);
    if(m){ out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
    if(RE_HR.test(line)){ out.push('<hr>'); i++; continue; }
    if(RE_QUOTE.test(line)){
      const buf = [];
      while(i < lines.length && RE_QUOTE.test(lines[i])){ buf.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i++; }
      out.push('<blockquote>' + renderMarkdown(buf.join('\n')) + '</blockquote>');
      continue;
    }
    if(line.includes('|') && i + 1 < lines.length && RE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')){
      const head = cells(line), seps = cells(lines[i + 1]);
      const al = seps.map(c => (/^:-+:$/.test(c) ? 'center' : (/-+:$/.test(c) ? 'right' : (/^:-+/.test(c) ? 'left' : ''))));
      const th = head.map((c, k) => '<th' + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + inline(c) + '</th>').join('');
      i += 2;
      const rows = [];
      while(i < lines.length && lines[i].trim() && lines[i].includes('|')){
        const r = cells(lines[i]);
        rows.push('<tr>' + head.map((_, k) => '<td' + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + inline(r[k] || '') + '</td>').join('') + '</tr>');
        i++;
      }
      out.push('<div class="lib-md-t"><table><thead><tr>' + th + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>');
      continue;
    }
    if(RE_LIST.test(line)){
      const { its, next } = parseList(lines, i);
      out.push(listHtml(its));
      i = next;
      continue;
    }
    // parágrafo: junta as linhas seguidas (duas espaços no fim = quebra de linha)
    const buf = [line];
    i++;
    while(i < lines.length && lines[i].trim() && !isBlockStart(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && RE_SEP.test(lines[i + 1]))){ buf.push(lines[i]); i++; }
    out.push('<p>' + buf.map((l, k) => inline(l.replace(/\s+$/, '')) + (k < buf.length - 1 ? (/ {2,}$/.test(buf[k]) ? '<br>' : ' ') : '')).join('') + '</p>');
  }
  return out.join('\n');
}
