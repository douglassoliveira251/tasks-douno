import { G } from './globais.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { DEFAULT_DUE_TIME, escapeHtml, todayStr } from './10-helpers.js';
import { renderUnifiedTagPicker } from './13-portais-de-tarefa.js';
import { closeTagsPortal, ensureTagsPortal, positionTagsPortalNear } from './15-portais-de-grupo-e-etiquetas.js';
import { getOrCreateActiveTask } from './16-painel-lateral-de-tarefa.js';
import { addDaysStr } from './25-calendario.js';
import { dateInStageRange, flashStageRangeWarning } from './31-projetos.js';
import { PAINEL_TAREFA } from './estado-ui.js';

/* Acompanhamento, início, prazo e hora. */
export function bindTpDates(panel, task){
  const tpFollowTrigger = document.getElementById('tpFollowTrigger');
  if(tpFollowTrigger){
    tpFollowTrigger.onclick = (e) => {
      e.stopPropagation();
      PAINEL_TAREFA.tpFollowOpen = !PAINEL_TAREFA.tpFollowOpen;
      document.getElementById('tpFollowMenu').hidden = !PAINEL_TAREFA.tpFollowOpen;
    };
    const fMenu = document.getElementById('tpFollowMenu');
    fMenu.onclick = (e) => e.stopPropagation();
    fMenu.querySelectorAll('.tp-follow-opt[data-days], .tp-follow-opt[data-clear]').forEach(b => {
      b.onclick = () => {
        const t = getOrCreateActiveTask(); if(!t) return;
        const days = b.dataset.clear ? null : parseInt(b.dataset.days, 10);
        t.followUpDate = days === null ? null : addDaysStr(todayStr(), days);
        PAINEL_TAREFA.tpFollowOpen = false;
        markDirty();
      };
    });
    document.getElementById('tpFollowCustom').onclick = () => {
      PAINEL_TAREFA.tpFollowOpen = false;
      fMenu.hidden = true;
      pickFollow(document.getElementById('tpFollowDate').value || '');
    };
    const tpFollowDate = document.getElementById('tpFollowDate');
    tpFollowDate.addEventListener('change', e => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.followUpDate = e.target.value || null;
      markDirty();
    });
  }
  if(!window._tpFollowOutside){
    window._tpFollowOutside = true;
    document.addEventListener('click', () => {
      if(!PAINEL_TAREFA.tpFollowOpen) return;
      PAINEL_TAREFA.tpFollowOpen = false;
      const m = document.getElementById('tpFollowMenu'); if(m) m.hidden = true;
    });
  }
  const tpStartLink = document.getElementById('tpStartLink');
  if(tpStartLink){
    const pop = document.getElementById('tpStartPop');
    tpStartLink.onclick = (e) => { e.stopPropagation(); PAINEL_TAREFA.tpStartOpen = !PAINEL_TAREFA.tpStartOpen; pop.hidden = !PAINEL_TAREFA.tpStartOpen; };
    pop.onclick = (e) => e.stopPropagation();
    const setStart = (v) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      if(v && !dateInStageRange(t, v)){
        flashStageRangeWarning(t);
        return;
      }
      t.startDate = v || null;
      PAINEL_TAREFA.tpStartOpen = false;
      markDirty();
    };
    pop.querySelectorAll('[data-start]').forEach(b => { b.onclick = () => setStart(b.dataset.start); });
    document.getElementById('tpStartDate').addEventListener('change', e => setStart(e.target.value));
    const rst = document.getElementById('tpStartReset');
    if(rst) rst.onclick = () => setStart(null);
  }
  if(!window._tpStartOutside){
    window._tpStartOutside = true;
    document.addEventListener('click', () => {
      if(!PAINEL_TAREFA.tpStartOpen) return;
      PAINEL_TAREFA.tpStartOpen = false;
      const m = document.getElementById('tpStartPop'); if(m) m.hidden = true;
    });
  }
  const dueInp = document.getElementById('tpDate');
  /* o calendário próprio substitui o nativo: o toque não abre o seletor do aparelho */
  dueInp.addEventListener('mousedown', e => e.preventDefault());
  dueInp.addEventListener('click', () => pickDue(dueInp.value || '', dueInp));
  dueInp.addEventListener('change', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const v = e.target.value || null;
    if(v && !dateInStageRange(t, v)){
      // tarefa de etapa: o prazo respeita as datas da etapa
      e.target.value = t.dueDate || '';
      flashStageRangeWarning(t);
      return;
    }
    t.dueDate = v;
    if(v && !t.dueTime){ t.dueTime = DEFAULT_DUE_TIME; document.getElementById('tpTime').value = DEFAULT_DUE_TIME; }
    markDirty();
  });
  document.getElementById('tpTime').addEventListener('change', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    t.dueTime = e.target.value || null; markDirty();
  });
}

/* Calendário próprio (sem o nativo): dia escolhido + Cancelar / OK. Usado em Retomar em (Personalizada) e no Prazo.
   opts: { title, min, max (AAAA-MM-DD ou ''), onPick(ymd|null), clearLabel (texto do botão de limpar, opcional) } */
const FCAL_MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
export function openFollowCal(current, opts = {}){
  let sel = current || todayStr();
  let view = sel.slice(0, 7);
  const min = opts.min || '', max = opts.max || '';
  let ov = document.getElementById('tpFcalOv');
  if(!ov){ ov = document.createElement('div'); ov.id = 'tpFcalOv'; ov.className = 'overlay'; ov.innerHTML = '<div class="modal tp-fcal" role="dialog"></div>'; document.body.appendChild(ov); }
  const modal = ov.firstElementChild;
  const close = () => ov.classList.remove('show');
  const paint = () => {
    const [y, m] = view.split('-').map(Number);
    const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
    const today = todayStr();
    let cells = '';
    for(let i = 0; i < first; i++) cells += '<span class="tp-fcal-pad"></span>';
    for(let d = 1; d <= days; d++){
      const ymd = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const off = (min && ymd < min) || (max && ymd > max);
      cells += '<button type="button" class="tp-fcal-day' + (ymd === sel ? ' sel' : '') + (ymd === today ? ' today' : '') + '" data-d="' + ymd + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (ymd === sel) + '">' + d + '</button>';
    }
    modal.innerHTML = '<div class="tp-fcal-t">' + escapeHtml(opts.title || 'Data') + '</div>' +
      '<div class="tp-fcal-h"><button type="button" class="tp-fcal-nav" data-nav="-1" aria-label="Mês anterior">‹</button><b>' + FCAL_MESES[m - 1].replace(/^./, c => c.toUpperCase()) + ' ' + y + '</b><button type="button" class="tp-fcal-nav" data-nav="1" aria-label="Próximo mês">›</button></div>' +
      '<div class="tp-fcal-w"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>' +
      '<div class="tp-fcal-g">' + cells + '</div>' +
      '<div class="tp-fcal-f">' + (opts.clearLabel ? '<button type="button" class="tp-fcal-clear" id="tpFcalClear">' + escapeHtml(opts.clearLabel) + '</button>' : '<span></span>') + '<span class="tp-fcal-btns"><button type="button" class="tp-fcal-cancel" id="tpFcalCancel">Cancelar</button><button type="button" class="tp-fcal-ok" id="tpFcalOk">OK</button></span></div>';
    modal.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => { const [yy, mm] = view.split('-').map(Number); const d = new Date(yy, mm - 1 + Number(b.dataset.nav), 1); view = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); paint(); }; });
    modal.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { sel = b.dataset.d; paint(); }; });
    modal.querySelector('#tpFcalCancel').onclick = close;
    const clr = modal.querySelector('#tpFcalClear');
    if(clr) clr.onclick = () => { opts.onPick && opts.onPick(null); close(); };
    modal.querySelector('#tpFcalOk').onclick = () => { opts.onPick && opts.onPick(sel); close(); };
  };
  ov.onclick = (e) => { if(e.target === ov) close(); };
  ov.onkeydown = (e) => { if(e.key === 'Escape') close(); };
  paint();
  ov.classList.add('show');
  setTimeout(() => { const b = modal.querySelector('.tp-fcal-day.sel') || modal.querySelector('.tp-fcal-day:not([disabled])'); if(b) b.focus(); }, 30);
}

/* Data de retomar: o calendário fica no lugar do nativo; limpar está no menu do campo */
function pickFollow(current){
  openFollowCal(current, { title: 'Retomar em', onPick: (v) => { const t = getOrCreateActiveTask(); if(t){ t.followUpDate = v; markDirty(); } } });
}

/* Prazo: mesmo calendário; respeita as datas da etapa e a hora padrão, igual ao campo */
function pickDue(current, inp){
  openFollowCal(current, { title: 'Prazo', min: inp.min, max: inp.max, clearLabel: 'Remover prazo', onPick: (v) => applyDue(v, inp) });
}
function applyDue(v, inp){
  const t = getOrCreateActiveTask(); if(!t) return;
  if(v && !dateInStageRange(t, v)){ flashStageRangeWarning(t); return; }
  t.dueDate = v;
  if(v && !t.dueTime){ t.dueTime = DEFAULT_DUE_TIME; document.getElementById('tpTime').value = DEFAULT_DUE_TIME; }
  markDirty();
}

/* Prioridade e etiquetas. */
export function bindTpPriorityAndTags(panel, task){
  panel.querySelectorAll('.tp-priority-btn').forEach(btn => {
    btn.onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      /* a prioridade é obrigatória: clicar de novo na que já está marcada não desmarca */
      if(t.priority === btn.dataset.p) return;
      t.priority = btn.dataset.p;
      markDirty();
    };
  });

  document.getElementById('tpTagsToggleBtn').onclick = (e) => {
    e.stopPropagation();
    const portal = ensureTagsPortal();
    const wasOpen = portal.classList.contains('show');
    closeTagsPortal();
    if(wasOpen) return;
    portal.classList.add('show');
    positionTagsPortalNear(portal, e.currentTarget);
    portal.onclick = e2 => e2.stopPropagation();
    renderUnifiedTagPicker(portal, {
      categoryId: task.categoryId,
      isSelected: (tagId) => (task.tagIds||[]).includes(tagId),
      onToggle: (tagId) => {
        const t = getOrCreateActiveTask(); if(!t) return;
        t.tagIds = t.tagIds || [];
        if(t.tagIds.includes(tagId)) t.tagIds = t.tagIds.filter(id => id !== tagId);
        else t.tagIds.push(tagId);
        task.tagIds = t.tagIds;
        persistOnly();
        renderTpTagsSelected();
      },
      onChanged: () => { renderTpTagsSelected(); }
    });
  };

  function renderTpTagsSelected(){
    const box = document.getElementById('tpTagsSelected');
    if(!box) return;
    const addBtn = box.querySelector('#tpTagsToggleBtn');
    box.querySelectorAll('.tp-tag-chip').forEach(el => el.remove());
    (task.tagIds||[]).map(id => G.state.tags.find(tg=>tg.id===id)).filter(Boolean).forEach(tg => {
      const chip = document.createElement('span');
      chip.className = 'tp-tag-chip active';
      chip.style.setProperty('--tg', tg.color);
      chip.textContent = tg.name;
      chip.title = 'Clique para remover';
      chip.dataset.tagId = tg.id;
      chip.onclick = (e) => {
        e.stopPropagation();
        const t = getOrCreateActiveTask(); if(!t) return;
        t.tagIds = (t.tagIds||[]).filter(id => id !== tg.id);
        task.tagIds = t.tagIds;
        persistOnly();
        renderTpTagsSelected();
      };
      box.insertBefore(chip, addBtn);
    });
  }
  document.querySelectorAll('#tpTagsSelected .tp-tag-chip[data-tag-id]').forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      const t = getOrCreateActiveTask(); if(!t) return;
      const tagId = chip.dataset.tagId;
      t.tagIds = (t.tagIds||[]).filter(id => id !== tagId);
      task.tagIds = t.tagIds;
      persistOnly();
      renderTpTagsSelected();
    };
  });
}
