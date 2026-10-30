import { G } from './globais.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { DEFAULT_DUE_TIME, todayStr } from './10-helpers.js';
import { renderUnifiedTagPicker } from './13-portais-de-tarefa.js';
import { closeTagsPortal, ensureTagsPortal, positionTagsPortalNear } from './15-portais-de-grupo-e-etiquetas.js';
import { getOrCreateActiveTask } from './16-painel-lateral-de-tarefa.js';
import { addDaysStr } from './25-calendario.js';
import { dateInStageRange, flashStageRangeWarning } from './31-projetos.js';

/* Acompanhamento, início, prazo e hora. */
export function bindTpDates(panel, task){
  const tpFollowTrigger = document.getElementById('tpFollowTrigger');
  if(tpFollowTrigger){
    tpFollowTrigger.onclick = (e) => {
      e.stopPropagation();
      G.tpFollowOpen = !G.tpFollowOpen;
      document.getElementById('tpFollowMenu').hidden = !G.tpFollowOpen;
    };
    const fMenu = document.getElementById('tpFollowMenu');
    fMenu.onclick = (e) => e.stopPropagation();
    fMenu.querySelectorAll('.tp-follow-opt[data-days], .tp-follow-opt[data-clear]').forEach(b => {
      b.onclick = () => {
        const t = getOrCreateActiveTask(); if(!t) return;
        const days = b.dataset.clear ? null : parseInt(b.dataset.days, 10);
        t.followUpDate = days === null ? null : addDaysStr(todayStr(), days);
        G.tpFollowOpen = false;
        markDirty();
      };
    });
    document.getElementById('tpFollowCustom').onclick = () => {
      G.tpFollowOpen = false;
      fMenu.hidden = true;
      const inp = document.getElementById('tpFollowDate');
      try { inp.showPicker(); } catch(err) { inp.focus(); inp.click(); }
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
      if(!G.tpFollowOpen) return;
      G.tpFollowOpen = false;
      const m = document.getElementById('tpFollowMenu'); if(m) m.hidden = true;
    });
  }
  const tpStartLink = document.getElementById('tpStartLink');
  if(tpStartLink){
    const pop = document.getElementById('tpStartPop');
    tpStartLink.onclick = (e) => { e.stopPropagation(); G.tpStartOpen = !G.tpStartOpen; pop.hidden = !G.tpStartOpen; };
    pop.onclick = (e) => e.stopPropagation();
    const setStart = (v) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      if(v && !dateInStageRange(t, v)){
        flashStageRangeWarning(t);
        return;
      }
      t.startDate = v || null;
      G.tpStartOpen = false;
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
      if(!G.tpStartOpen) return;
      G.tpStartOpen = false;
      const m = document.getElementById('tpStartPop'); if(m) m.hidden = true;
    });
  }
  document.getElementById('tpDate').addEventListener('change', e => {
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

/* Prioridade e etiquetas. */
export function bindTpPriorityAndTags(panel, task){
  panel.querySelectorAll('.tp-priority-btn').forEach(btn => {
    btn.onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.priority = (t.priority === btn.dataset.p) ? null : btn.dataset.p;
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
      chip.style.background = tg.color;
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
