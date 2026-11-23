/* ===================== DEFESA CONTRA DADO CONTAMINADO =====================
   O estado inteiro é um JSON. Ele chega por importação de backup, pela nuvem e pelo arquivo vinculado. Vários campos vão ao HTML
   sem escape (cores em style, horas, imagens, o corpo rico das notas) porque se presume que só este app os grava. Um backup
   adulterado quebraria essa suposição e rodaria código na origem do app. Por isso tudo passa por aqui em normalizeState():
   valores válidos ficam exatamente como estão (nada muda para quem usa); só o que é inválido é trocado ou removido. */

const COR_OK = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(\s*[\d.,%\s/-]+\)|var\(--[\w-]+\)|[a-z]{3,20})$/i;
export const corSegura = (c, padrao) => (typeof c === 'string' && COR_OK.test(c.trim()) ? c : padrao);

const HORA_OK = /^([01]?\d|2[0-3]):[0-5]\d$/;
export const horaSegura = (h) => (typeof h === 'string' && HORA_OK.test(h) ? h : (h == null ? h : ''));

/* ---- HTML rico das notas: lista de permitidos ---- */
const TAGS_OK = new Set(['A','B','BLOCKQUOTE','BR','CODE','DEL','DIV','EM','FONT','H1','H2','H3','H4','H5','H6','HR','I','IMG','LI','MARK','OL','P','PRE','S','SPAN','STRIKE','STRONG','SUB','SUP','TABLE','TBODY','TD','TH','THEAD','TR','U','UL']);
const TAGS_REMOVER = new Set(['SCRIPT','STYLE','IFRAME','FRAME','FRAMESET','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','SELECT','LINK','META','BASE','TEMPLATE','NOSCRIPT','APPLET','AUDIO','VIDEO','SOURCE','CANVAS','DIALOG']);
const ATTR_OK = new Set(['class','style','title','alt','color','size','face','align','width','height','colspan','rowspan','dir','lang','href','src','target','rel']);
const HREF_OK = /^(https?:|mailto:|tel:|#)/i;
const SRC_OK = /^(https?:|data:image\/(png|jpe?g|gif|webp|bmp|avif);base64,)/i;

function estiloSeguro(css){
  const partes = String(css).split(';');
  const ok = partes.filter(d => !/url\s*\(|expression|javascript|@import|behavior|-moz-binding|[<>\\]/i.test(d));
  return ok.length === partes.length ? css : ok.join(';');
}

/* devolve o próprio texto se não havia nada a tirar (assim o texto limpo nunca é reescrito pelo navegador) */
export function sanitizarHtml(html){
  if(typeof html !== 'string' || !html) return html;
  if(!/[<&]/.test(html)) return html;
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  let mudou = false;
  (function limpar(no){
    Array.from(no.childNodes).forEach(f => {
      if(f.nodeType === 8){ f.remove(); mudou = true; return; }          // comentário
      if(f.nodeType !== 1) return;
      const tag = f.tagName;
      if(TAGS_REMOVER.has(tag)){ f.remove(); mudou = true; return; }
      if(!TAGS_OK.has(tag)){                                              // desconhecida: fica só o conteúdo
        limpar(f);
        while(f.firstChild) no.insertBefore(f.firstChild, f);
        f.remove(); mudou = true; return;
      }
      Array.from(f.attributes).forEach(a => {
        const n = a.name.toLowerCase();
        let ok = ATTR_OK.has(n) || /^data-[\w-]+$/.test(n);
        if(ok && n === 'href' && !HREF_OK.test(a.value.trim())) ok = false;
        if(ok && n === 'src' && !(tag === 'IMG' && SRC_OK.test(a.value.trim()))) ok = false;
        if(ok && n === 'style'){ const s = estiloSeguro(a.value); if(s !== a.value){ f.setAttribute('style', s); mudou = true; } }
        if(!ok){ f.removeAttribute(a.name); mudou = true; }
      });
      limpar(f);
    });
  })(doc.body);
  return mudou ? doc.body.innerHTML : html;
}

/* aplica as regras acima ao estado inteiro (no lugar). Chamado por normalizeState(). */
export function sanitizarEstado(st){
  if(!st || typeof st !== 'object') return;
  const lista = (v) => (Array.isArray(v) ? v : []);
  const cor = (o, padrao) => { if(o && o.color !== undefined) o.color = corSegura(o.color, padrao); };
  lista(st.categories).forEach(o => cor(o, '#4A6FA5'));
  lista(st.tags).forEach(o => cor(o, '#4A6FA5'));
  lista(st.projects).forEach(p => { cor(p, '#4A6FA5'); lista(p.stages).forEach(s => cor(s, '#4A6FA5')); });
  lista(st.events).forEach(ev => {
    ['startTime', 'endTime'].forEach(k => { if(ev[k] !== undefined) ev[k] = horaSegura(ev[k]); });
  });
  lista(st.tasks).forEach(t => {
    if(t.dueTime !== undefined) t.dueTime = horaSegura(t.dueTime);
    lista(t.attachments).forEach(a => { if(a && typeof a.dataUrl === 'string' && !/^data:/i.test(a.dataUrl)) a.dataUrl = ''; });
  });
  lista(st.notes).forEach(n => {
    if(typeof n.body === 'string') n.body = sanitizarHtml(n.body);
    lista(n.attachments).forEach(a => { if(a && a.dataUrl !== undefined && !/^data:/i.test(String(a.dataUrl))) a.dataUrl = ''; });
  });
}
