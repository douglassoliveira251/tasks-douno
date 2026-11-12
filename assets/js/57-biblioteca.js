import { G } from './globais.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, uid } from './10-helpers.js';
import { closeAllTaskMenus, ensureTaskMenuPortal, openConfirmPortal } from './13-portais-de-tarefa.js';
import { ensureProjectOverlay } from './31-projetos.js';
import { showToast } from './42-nuvem-persistencia.js';
import { icon } from './icones.js';

/* ===================== BIBLIOTECA =====================
   Central de recursos. Cada item tem um tipo (por ora só "link"); as COLEÇÕES são pastas (até 3 níveis), cada espaço com a sua.
   Dados em G.state.libFolders ({id,name,parentId,categoryId,createdAt}) e G.state.libItems
   ({id,type,title,url,description,folderId,categoryId,favorite,createdAt,updatedAt}). Um item fica em uma coleção só.
   Com o seletor de espaço em "Todos", os espaços aparecem como grupos no topo da árvore. */
export const LIB_MAX_DEPTH = 3;

const S16 = (p) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const LINK_SVG = S16('<path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.7.7"/><path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.7-.7"/>');
const STAR_ON = '<svg viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1 4.6 12.9l.7-3.8L2.5 6.5l3.8-.5z"/></svg>';
const CODE_SVG = S16('<path d="M5.5 5L2.5 8l3 3M10.5 5l3 3-3 3"/>');

/* Tipos previstos; só os "ready" já funcionam (os outros aparecem apagados, como "em breve"). */
export const LIB_TYPES = [
  { key: 'link', label: 'Links', ico: LINK_SVG, ready: true },
  { key: 'task', label: 'Modelos de tarefa', ico: icon('check-square') },
  { key: 'skill', label: 'Skills', ico: icon('file-text') },
  { key: 'snippet', label: 'Snippets e comandos', ico: CODE_SVG },
  { key: 'text', label: 'Modelos de texto', ico: icon('note') },
  { key: 'ref', label: 'Referências', ico: icon('book') },
  { key: 'check', label: 'Checklists', ico: icon('list-numbers') },
];

const LIB = { sel: { kind: 'all', id: null }, type: null, q: '', open: new Set(), sheetOpen: false };

/* ---------- dados ---------- */
const folders = () => (Array.isArray(G.state.libFolders) ? G.state.libFolders : (G.state.libFolders = []));
const items = () => (Array.isArray(G.state.libItems) ? G.state.libItems : (G.state.libItems = []));
const folderById = (id) => folders().find(f => f.id === id) || null;
const inSpace = (x) => !G.activeCategoryFilter || x.categoryId === G.activeCategoryFilter;
const scopeFolders = () => folders().filter(inSpace);
const scopeItems = () => items().filter(inSpace);
const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR');

export function folderDepth(f){
  let d = 1, cur = f, guard = 0;
  while(cur && cur.parentId && guard++ < 10){ cur = folderById(cur.parentId); if(cur) d++; }
  return d;
}
function childrenOf(parentId, list){ return list.filter(f => (f.parentId || null) === (parentId || null)).sort(byName); }
function subtreeIds(id){
  const out = [id];
  folders().filter(f => f.parentId === id).forEach(c => subtreeIds(c.id).forEach(x => out.push(x)));
  return out;
}
function folderPath(id){
  const names = []; let cur = folderById(id), guard = 0;
  while(cur && guard++ < 10){ names.unshift(cur.name); cur = cur.parentId ? folderById(cur.parentId) : null; }
  return names;
}
export function libCounts(){
  const nItems = scopeItems().length, nFolders = scopeFolders().length;
  return { items: nItems, folders: nFolders };
}

/* Espaço em que um novo item/coleção nasce */
function currentSpaceId(){
  if(G.activeCategoryFilter && catById(G.activeCategoryFilter)) return G.activeCategoryFilter;
  if(LIB.sel.kind === 'space' && catById(LIB.sel.id)) return LIB.sel.id;
  if(LIB.sel.kind === 'folder'){ const f = folderById(LIB.sel.id); if(f && catById(f.categoryId)) return f.categoryId; }
  return (G.state.categories[0] || {}).id || null;
}

function normalizeUrl(raw){
  let u = String(raw || '').trim();
  if(!u) return null;
  const hadScheme = /^[a-z][a-z0-9+.-]*:/i.test(u);
  if(!hadScheme) u = 'https://' + u;
  try{
    const url = new URL(u);
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return null; // nada de javascript:, data:, file:…
    // sem http(s) digitado, exige um endereço com ponto (ou localhost); com http(s) aceita também nomes internos (http://intranet/)
    if(!url.hostname || (!hadScheme && !url.hostname.includes('.') && url.hostname !== 'localhost')) return null;
    return url.href;
  }catch(e){ return null; }
}
const hostOf = (u) => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return u; } };
const COLORS = ['#3B6FB6', '#C2562E', '#2F8A63', '#B8860B', '#8A5CC2', '#1F7A8C', '#B04A6F', '#5B6472'];
const colorOf = (host) => { let h = 0; for(const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };

/* itens que a seleção atual mostra */
function visibleItems(){
  let list = scopeItems();
  const { kind, id } = LIB.sel;
  if(kind === 'fav') list = list.filter(i => i.favorite);
  else if(kind === 'folder'){ const ids = new Set(subtreeIds(id)); list = list.filter(i => ids.has(i.folderId)); }
  else if(kind === 'space') list = list.filter(i => i.categoryId === id);
  if(LIB.type) list = list.filter(i => i.type === LIB.type);
  const q = LIB.q.trim().toLowerCase();
  if(q) list = list.filter(i => ((i.title || '') + ' ' + (i.url || '') + ' ' + (i.description || '')).toLowerCase().includes(q));
  return list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
}
/* itens da seleção (sem o filtro de tipo e busca), para contar por tipo */
function contextItems(){
  let list = scopeItems();
  const { kind, id } = LIB.sel;
  if(kind === 'fav') list = list.filter(i => i.favorite);
  else if(kind === 'folder'){ const ids = new Set(subtreeIds(id)); list = list.filter(i => ids.has(i.folderId)); }
  else if(kind === 'space') list = list.filter(i => i.categoryId === id);
  return list;
}

/* ---------- árvore ---------- */
function folderCount(id){ const ids = new Set(subtreeIds(id)); return scopeItems().filter(i => ids.has(i.folderId)).length; }
function folderRow(f, depth){
  const kids = childrenOf(f.id, scopeFolders());
  const open = LIB.open.has(f.id);
  const on = LIB.sel.kind === 'folder' && LIB.sel.id === f.id;
  const row = `<div class="lib-gi lib-d${depth}${on ? ' on' : ''}" data-folder="${f.id}">
      <button type="button" class="lib-car${kids.length ? '' : ' none'}" data-toggle="${f.id}" aria-label="${open ? 'Recolher' : 'Expandir'}">${kids.length ? icon(open ? 'caret-down' : 'caret-right') : ''}</button>
      <button type="button" class="lib-gname" data-pick="${f.id}">${icon('folder')}<span>${escapeHtml(f.name)}</span></button>
      <i>${folderCount(f.id)}</i>
      <button type="button" class="lib-fmenu" data-fmenu="${f.id}" title="Opções da coleção" aria-label="Opções da coleção">${icon('dots-three-vertical')}</button>
    </div>`;
  return row + (open ? kids.map(k => folderRow(k, depth + 1)).join('') : '');
}
function treeHtml(){
  const fs = scopeFolders();
  const allOn = LIB.sel.kind === 'all', favOn = LIB.sel.kind === 'fav';
  const head = `
    <div class="lib-gi${allOn ? ' on' : ''}" data-pickkind="all"><span class="lib-car none"></span><button type="button" class="lib-gname" data-kind="all">${icon('squares-four')}<span>Todos os itens</span></button><i>${scopeItems().length}</i></div>
    <div class="lib-gi${favOn ? ' on' : ''}" data-pickkind="fav"><span class="lib-car none"></span><button type="button" class="lib-gname" data-kind="fav">${icon('star')}<span>Favoritos</span></button><i>${scopeItems().filter(i => i.favorite).length}</i></div>
    <div class="lib-lh">COLEÇÕES</div>`;
  let body = '';
  if(G.activeCategoryFilter){
    body = childrenOf(null, fs).map(f => folderRow(f, 1)).join('');
  } else {
    body = G.state.categories.map(c => {
      const roots = childrenOf(null, fs.filter(f => f.categoryId === c.id));
      const on = LIB.sel.kind === 'space' && LIB.sel.id === c.id;
      return `<div class="lib-space${on ? ' on' : ''}" data-space="${c.id}"><button type="button" class="lib-gname" data-pickspace="${c.id}"><i class="lib-dot" style="background:${c.color || 'var(--ink-faint)'}"></i><span>${escapeHtml(c.name)}</span></button></div>${roots.map(f => folderRow(f, 1)).join('')}`;
    }).join('');
  }
  if(!fs.length) body += '<div class="lib-hint">Nenhuma coleção ainda. Crie uma para organizar os itens.</div>';
  return head + body + `<button type="button" class="lib-newcol" data-newcol>${icon('plus')}<span>Nova coleção</span></button>`;
}
function typesHtml(){
  const ctx = contextItems();
  return `<div class="lib-lh">TIPOS</div>` + LIB_TYPES.map(t => {
    const n = ctx.filter(i => i.type === t.key).length;
    return `<button type="button" class="lib-gi lib-type${LIB.type === t.key ? ' on' : ''}${t.ready ? '' : ' soon'}" data-type="${t.key}" ${t.ready ? '' : 'disabled title="Em breve"'}><span class="lib-tic">${t.ico}</span><span class="lib-tn">${t.label}</span>${t.ready ? `<i>${n}</i>` : '<i class="lib-soonb">em breve</i>'}</button>`;
  }).join('');
}

/* ---------- lista ---------- */
function crumbHtml(){
  const { kind, id } = LIB.sel;
  if(kind === 'folder'){
    const f = folderById(id);
    const sp = !G.activeCategoryFilter && f ? catById(f.categoryId) : null;
    return `<div class="lib-crumb">${sp ? escapeHtml(sp.name) + ' › ' : ''}${folderPath(id).map((n, i, a) => i === a.length - 1 ? `<b>${escapeHtml(n)}</b>` : escapeHtml(n)).join(' › ')}</div>`;
  }
  if(kind === 'space'){ const sp = catById(id); return `<div class="lib-crumb"><b>${sp ? escapeHtml(sp.name) : ''}</b></div>`; }
  return `<div class="lib-crumb"><b>${kind === 'fav' ? 'Favoritos' : 'Todos os itens'}</b>${LIB.type ? ' › ' + escapeHtml((LIB_TYPES.find(t => t.key === LIB.type) || {}).label || '') : ''}</div>`;
}
function itemRow(it){
  const host = hostOf(it.url);
  const f = it.folderId ? folderById(it.folderId) : null;
  const sp = !G.activeCategoryFilter ? catById(it.categoryId) : null;
  const where = [sp ? sp.name : '', f ? folderPath(f.id).join(' › ') : ''].filter(Boolean).join(' › ');
  return `<div class="lib-row" data-item="${it.id}">
    <div class="lib-av" style="background:${colorOf(host)}">${escapeHtml((it.title || host || '?').trim().charAt(0).toUpperCase())}</div>
    <div class="lib-mid">
      <a class="lib-tt" href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title || host)}</a>
      <div class="lib-dm">${escapeHtml(host)}${it.description ? ' · ' + escapeHtml(it.description) : ''}</div>
      ${where ? `<div class="lib-where">${escapeHtml(where)}</div>` : ''}
    </div>
    <button type="button" class="lib-star${it.favorite ? ' on' : ''}" data-fav="${it.id}" title="${it.favorite ? 'Tirar dos favoritos' : 'Favoritar'}" aria-label="${it.favorite ? 'Tirar dos favoritos' : 'Favoritar'}">${it.favorite ? STAR_ON : icon('star')}</button>
    <button type="button" class="lib-imenu" data-imenu="${it.id}" title="Opções" aria-label="Opções do item">${icon('dots-three-vertical')}</button>
  </div>`;
}
function listHtml(){
  const list = visibleItems();
  if(list.length) return `<div class="lib-list">${list.map(itemRow).join('')}</div>`;
  const total = scopeItems().length;
  const msg = total === 0
    ? 'Sua Biblioteca está vazia. Cole um link no campo acima e pressione Enter para guardar o primeiro.'
    : (LIB.q.trim() ? 'Nada encontrado para essa busca.' : 'Nenhum item aqui ainda.');
  return `<div class="lib-empty">${msg}</div>`;
}

/* ---------- menus e janelas ---------- */
function placeMenu(portal, btn){
  const r = btn.getBoundingClientRect();
  portal.style.top = Math.round(r.bottom + 6) + 'px';
  portal.style.right = Math.round(window.innerWidth - r.right) + 'px';
  portal.style.left = 'auto';
}
function openMenu(btn, html, handlers){
  const portal = ensureTaskMenuPortal();
  closeAllTaskMenus();
  portal.innerHTML = html;
  placeMenu(portal, btn);
  portal.classList.add('show');
  portal.querySelectorAll('[data-m]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); closeAllTaskMenus(); const fn = handlers[b.dataset.m]; if(fn) fn(); }; });
}
function openFolderMenu(btn, f){
  const canSub = folderDepth(f) < LIB_MAX_DEPTH;
  openMenu(btn, `${canSub ? '<button type="button" class="task-menu-item" data-m="sub">Nova subcoleção</button>' : ''}<button type="button" class="task-menu-item" data-m="ren">Renomear</button><button type="button" class="task-menu-item" data-m="del" style="color:var(--danger)">Excluir</button>`, {
    sub: () => openFolderModal({ parentId: f.id }),
    ren: () => openFolderModal({ folder: f }),
    del: () => deleteFolder(f, btn),
  });
}
function openItemMenu(btn, it){
  openMenu(btn, `<button type="button" class="task-menu-item" data-m="open">Abrir</button><button type="button" class="task-menu-item" data-m="edit">Editar</button><button type="button" class="task-menu-item" data-m="copy">Copiar endereço</button><button type="button" class="task-menu-item" data-m="del" style="color:var(--danger)">Excluir</button>`, {
    open: () => window.open(it.url, '_blank', 'noopener,noreferrer'),
    edit: () => openItemModal(it),
    copy: () => { try{ navigator.clipboard.writeText(it.url).then(() => showToast('Endereço copiado.')); }catch(e){} },
    del: () => openConfirmPortal(btn, 'Excluir este item da Biblioteca? Essa ação não pode ser desfeita.', () => { G.state.libItems = items().filter(x => x.id !== it.id); markDirty(); }),
  });
}
function deleteFolder(f, anchor){
  const ids = subtreeIds(f.id);
  const nKids = ids.length - 1;
  const nItems = items().filter(i => i.folderId === f.id).length;
  openConfirmPortal(anchor, `Excluir a coleção "${f.name}"? Os ${nItems} item(ns) e ${nKids} subcoleção(ões) dentro dela sobem para o nível de cima. Nada é apagado além da própria coleção.`, () => {
    items().forEach(i => { if(i.folderId === f.id) i.folderId = f.parentId || null; });
    folders().forEach(c => { if(c.parentId === f.id) c.parentId = f.parentId || null; });
    G.state.libFolders = folders().filter(x => x.id !== f.id);
    if(LIB.sel.kind === 'folder' && LIB.sel.id === f.id) LIB.sel = f.parentId ? { kind: 'folder', id: f.parentId } : { kind: 'all', id: null };
    markDirty();
  });
}

function closeOv(ov){ ov.classList.remove('show'); }
const spaceOptions = (sel) => G.state.categories.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
/* lista de coleções de um espaço, com recuo, para escolher onde guardar (maxDepth limita a profundidade) */
function folderOptions(spaceId, selId, maxDepth, excludeId){
  const fs = folders().filter(f => f.categoryId === spaceId);
  const out = [];
  const walk = (pid, d) => childrenOf(pid, fs).forEach(f => {
    if(f.id === excludeId) return;
    if(d <= maxDepth) out.push(`<option value="${f.id}" ${f.id === selId ? 'selected' : ''}>${'  '.repeat(d - 1)}${escapeHtml(f.name)}</option>`);
    walk(f.id, d + 1);
  });
  walk(null, 1);
  return out.join('');
}

function openFolderModal({ folder, parentId } = {}){
  const ov = ensureProjectOverlay('libFolderOverlay');
  const modal = ov.firstElementChild;
  const editing = !!folder;
  const parent = parentId ? folderById(parentId) : (folder && folder.parentId ? folderById(folder.parentId) : null);
  const spaceId = folder ? folder.categoryId : (parent ? parent.categoryId : currentSpaceId());
  modal.className = 'modal nm nm-560';
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="libFClose" aria-label="Fechar">${icon('x')}</button>
    <div class="nm-head"><div class="nm-kicker">${editing ? 'Renomear coleção' : (parent ? 'Nova subcoleção' : 'Nova coleção')}</div></div>
    <div class="nm-body prj-body">
      <div class="tp-field"><label class="tp-label" for="libFName">Nome</label><input type="text" class="tp-input" id="libFName" maxlength="60" placeholder="Ex.: Sistemas do trabalho" value="${editing ? escapeHtml(folder.name) : ''}"></div>
      ${editing ? '' : `<div class="prj-row3" style="grid-template-columns:1fr 1fr;">
        <div class="tp-field"><label class="tp-label" for="libFSpace">Espaço</label><select class="tp-select" id="libFSpace" ${parent ? 'disabled' : ''}>${spaceOptions(spaceId)}</select></div>
        <div class="tp-field"><label class="tp-label" for="libFParent">Dentro de</label><select class="tp-select" id="libFParent"><option value="">Raiz do espaço</option>${folderOptions(spaceId, parent ? parent.id : '', LIB_MAX_DEPTH - 1)}</select></div>
      </div>`}
      <p id="libFErr" style="display:none; color:var(--danger); font-size:12.5px; margin:4px 0 0;"></p>
    </div>
    <div class="modal-footer"><button type="button" class="btn ghost small" id="libFCancel">Cancelar</button><button type="button" class="btn small" id="libFSave">Salvar</button></div>`;
  ov.classList.add('show');
  const $ = (s) => modal.querySelector(s);
  $('#libFClose').onclick = $('#libFCancel').onclick = () => closeOv(ov);
  const spaceSel = $('#libFSpace'), parentSel = $('#libFParent');
  if(spaceSel && !parent) spaceSel.onchange = () => { parentSel.innerHTML = '<option value="">Raiz do espaço</option>' + folderOptions(spaceSel.value, '', LIB_MAX_DEPTH - 1); };
  const err = (m) => { const e = $('#libFErr'); e.textContent = m; e.style.display = m ? 'block' : 'none'; };
  const save = () => {
    const name = $('#libFName').value.trim();
    if(!name){ err('Dê um nome para a coleção.'); $('#libFName').focus(); return; }
    if(editing){ folder.name = name; }
    else {
      const pid = parentSel.value || null;
      const par = pid ? folderById(pid) : null;
      if(par && folderDepth(par) >= LIB_MAX_DEPTH){ err('O limite é de ' + LIB_MAX_DEPTH + ' níveis de coleções.'); return; }
      const f = { id: uid('lf'), name, parentId: pid, categoryId: par ? par.categoryId : (spaceSel ? spaceSel.value : spaceId), createdAt: Date.now() };
      folders().push(f);
      if(par) LIB.open.add(par.id);
      LIB.sel = { kind: 'folder', id: f.id };
    }
    closeOv(ov); markDirty();
  };
  $('#libFSave').onclick = save;
  $('#libFName').onkeydown = (e) => { if(e.key === 'Enter'){ e.preventDefault(); save(); } };
  setTimeout(() => $('#libFName').focus(), 30);
}

function openItemModal(item){
  const ov = ensureProjectOverlay('libItemOverlay');
  const modal = ov.firstElementChild;
  const editing = !!item;
  const spaceId = item ? item.categoryId : currentSpaceId();
  const selFolder = item ? item.folderId : (LIB.sel.kind === 'folder' ? LIB.sel.id : '');
  modal.className = 'modal nm nm-560';
  modal.innerHTML = `
    <div class="nm-flag"></div>
    <button type="button" class="nm-x" id="libIClose" aria-label="Fechar">${icon('x')}</button>
    <div class="nm-head"><div class="nm-kicker">${editing ? 'Editar link' : 'Novo link'}</div></div>
    <div class="nm-body prj-body">
      <div class="tp-field"><label class="tp-label" for="libIUrl">Endereço</label><input type="text" class="tp-input" id="libIUrl" inputmode="url" autocomplete="off" placeholder="Ex.: rh.empresa.com.br/portal" value="${editing ? escapeHtml(item.url) : ''}"></div>
      <div class="tp-field"><label class="tp-label" for="libITitle">Título <span style="font-weight:500; text-transform:none;">(opcional)</span></label><input type="text" class="tp-input" id="libITitle" maxlength="120" placeholder="Se vazio, usa o nome do site" value="${editing ? escapeHtml(item.title || '') : ''}"></div>
      <div class="tp-field"><label class="tp-label" for="libIDesc">Descrição <span style="font-weight:500; text-transform:none;">(opcional)</span></label><input type="text" class="tp-input" id="libIDesc" maxlength="200" value="${editing ? escapeHtml(item.description || '') : ''}"></div>
      <div class="prj-row3" style="grid-template-columns:1fr 1fr;">
        <div class="tp-field"><label class="tp-label" for="libISpace">Espaço</label><select class="tp-select" id="libISpace">${spaceOptions(spaceId)}</select></div>
        <div class="tp-field"><label class="tp-label" for="libIFolder">Coleção</label><select class="tp-select" id="libIFolder"><option value="">Sem coleção</option>${folderOptions(spaceId, selFolder, LIB_MAX_DEPTH)}</select></div>
      </div>
      <p id="libIErr" style="display:none; color:var(--danger); font-size:12.5px; margin:4px 0 0;"></p>
    </div>
    <div class="modal-footer"><button type="button" class="btn ghost small" id="libICancel">Cancelar</button><button type="button" class="btn small" id="libISave">Salvar</button></div>`;
  ov.classList.add('show');
  const $ = (s) => modal.querySelector(s);
  $('#libIClose').onclick = $('#libICancel').onclick = () => closeOv(ov);
  $('#libISpace').onchange = () => { $('#libIFolder').innerHTML = '<option value="">Sem coleção</option>' + folderOptions($('#libISpace').value, '', LIB_MAX_DEPTH); };
  const err = (m) => { const e = $('#libIErr'); e.textContent = m; e.style.display = m ? 'block' : 'none'; };
  const save = () => {
    const url = normalizeUrl($('#libIUrl').value);
    if(!url){ err('Endereço inválido. Use um site começando por http:// ou https:// (ou só o endereço, como rh.empresa.com.br).'); $('#libIUrl').focus(); return; }
    const data = { url, title: $('#libITitle').value.trim(), description: $('#libIDesc').value.trim(), categoryId: $('#libISpace').value, folderId: $('#libIFolder').value || null, updatedAt: Date.now() };
    if(editing) Object.assign(item, data);
    else items().push(Object.assign({ id: uid('li'), type: 'link', favorite: false, createdAt: Date.now() }, data));
    closeOv(ov); markDirty();
  };
  $('#libISave').onclick = save;
  modal.onkeydown = (e) => { if(e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); save(); } };
  setTimeout(() => $('#libIUrl').focus(), 30);
}

/* usado pelo botão "+" do topo (menu contextual) */
export function openNewLibraryItem(){ openItemModal(null); }

/* celular: a árvore de coleções abre numa janela, uma escolha por vez */
function openTreeSheet(){
  const ov = ensureProjectOverlay('libSheetOverlay');
  const modal = ov.firstElementChild;
  modal.className = 'modal nm nm-560 lib-sheet';
  const paint = () => {
    modal.innerHTML = `<div class="nm-flag"></div><button type="button" class="nm-x" id="libSClose" aria-label="Fechar">${icon('x')}</button><div class="nm-head"><div class="nm-kicker">Coleções</div></div><div class="nm-body lib-side-m">${treeHtml()}</div>`;
    modal.querySelector('#libSClose').onclick = () => closeOv(ov);
    bindTree(modal, () => { closeOv(ov); renderLibrary(); }, paint);
  };
  paint();
  ov.classList.add('show');
}

/* ---------- ligações ---------- */
function bindTree(root, onPick, repaint){
  root.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { LIB.sel = { kind: 'folder', id: b.dataset.pick }; LIB.type = null; onPick(); }; });
  root.querySelectorAll('[data-pickspace]').forEach(b => { b.onclick = () => { LIB.sel = { kind: 'space', id: b.dataset.pickspace }; LIB.type = null; onPick(); }; });
  root.querySelectorAll('[data-kind]').forEach(b => { b.onclick = () => { LIB.sel = { kind: b.dataset.kind, id: null }; LIB.type = null; onPick(); }; });
  root.querySelectorAll('[data-toggle]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); const id = b.dataset.toggle; if(LIB.open.has(id)) LIB.open.delete(id); else LIB.open.add(id); repaint(); }; });
  root.querySelectorAll('[data-fmenu]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); const f = folderById(b.dataset.fmenu); if(f) openFolderMenu(b, f); }; });
  root.querySelectorAll('[data-newcol]').forEach(b => { b.onclick = () => openFolderModal({}); });
}

function addQuickLink(raw){
  const url = normalizeUrl(raw);
  if(!url){ showToast('Endereço inválido. Cole um link começando por http:// ou https://.'); return false; }
  const folderId = LIB.sel.kind === 'folder' ? LIB.sel.id : null;
  const f = folderId ? folderById(folderId) : null;
  items().push({ id: uid('li'), type: 'link', title: '', url, description: '', folderId, categoryId: f ? f.categoryId : currentSpaceId(), favorite: false, createdAt: Date.now(), updatedAt: Date.now() });
  markDirty();
  return true;
}

function paintMain(view){
  const host = view.querySelector('#libMain');
  if(!host) return;
  host.innerHTML = crumbHtml() + listHtml();
  host.querySelectorAll('[data-fav]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); const it = items().find(x => x.id === b.dataset.fav); if(it){ it.favorite = !it.favorite; markDirty(); } }; });
  host.querySelectorAll('[data-imenu]').forEach(b => { b.onclick = (e) => { e.stopPropagation(); const it = items().find(x => x.id === b.dataset.imenu); if(it) openItemMenu(b, it); }; });
  host.querySelectorAll('.lib-row').forEach(r => { r.onclick = (e) => { if(e.target.closest('a,button')) return; const it = items().find(x => x.id === r.dataset.item); if(it) window.open(it.url, '_blank', 'noopener,noreferrer'); }; });
}

export function renderLibrary(){
  const view = document.getElementById('libraryView');
  if(!view) return;
  // seleção que deixou de existir (coleção apagada, espaço trocado)
  if(LIB.sel.kind === 'folder' && !scopeFolders().some(f => f.id === LIB.sel.id)) LIB.sel = { kind: 'all', id: null };
  if(LIB.sel.kind === 'space' && (G.activeCategoryFilter || !catById(LIB.sel.id))) LIB.sel = { kind: 'all', id: null };
  // abre os pais da coleção escolhida
  if(LIB.sel.kind === 'folder'){ let f = folderById(LIB.sel.id), g = 0; while(f && f.parentId && g++ < 10){ LIB.open.add(f.parentId); f = folderById(f.parentId); } }
  const where = LIB.sel.kind === 'folder' ? folderPath(LIB.sel.id).join(' › ') : (LIB.sel.kind === 'fav' ? 'Favoritos' : (LIB.sel.kind === 'space' ? ((catById(LIB.sel.id) || {}).name || '') : 'Todos os itens'));
  view.innerHTML = `
    <div class="lib">
      <div class="lib-bar">
        <div class="lib-paste">${LINK_SVG}<input type="text" id="libQuick" inputmode="url" autocomplete="off" placeholder="Cole um link aqui e pressione Enter…" aria-label="Guardar um link"></div>
        <div class="lib-search">${icon('magnifying-glass')}<input type="search" id="libSearch" placeholder="Buscar na biblioteca…" aria-label="Buscar na biblioteca" value="${escapeHtml(LIB.q)}"></div>
      </div>
      <button type="button" class="lib-mfolder" id="libMFolder">${icon('folder')}<span>${escapeHtml(where)}</span>${icon('caret-down')}</button>
      <div class="lib-mtypes">${LIB_TYPES.map(t => `<button type="button" class="lib-chip${LIB.type === t.key ? ' on' : ''}${t.ready ? '' : ' soon'}" data-type="${t.key}" ${t.ready ? '' : 'disabled'}>${t.label}</button>`).join('')}</div>
      <div class="lib-lay">
        <aside class="lib-side"><div class="lib-tree" id="libTree">${treeHtml()}</div><div class="lib-types" id="libTypes">${typesHtml()}</div></aside>
        <section class="lib-main" id="libMain"></section>
      </div>
    </div>`;
  const repaintTree = () => { view.querySelector('#libTree').innerHTML = treeHtml(); bindTree(view.querySelector('#libTree'), () => renderLibrary(), repaintTree); };
  bindTree(view.querySelector('#libTree'), () => renderLibrary(), repaintTree);
  view.querySelectorAll('[data-type]').forEach(b => { if(b.disabled) return; b.onclick = () => { LIB.type = LIB.type === b.dataset.type ? null : b.dataset.type; renderLibrary(); }; });
  view.querySelector('#libMFolder').onclick = () => openTreeSheet();
  const quick = view.querySelector('#libQuick');
  quick.onkeydown = (e) => { if(e.key === 'Enter' && quick.value.trim()){ e.preventDefault(); if(addQuickLink(quick.value)) setTimeout(() => { const q = document.getElementById('libQuick'); if(q) q.focus(); }, 30); } };
  const search = view.querySelector('#libSearch');
  search.oninput = () => { LIB.q = search.value; paintMain(view); };
  paintMain(view);
}
