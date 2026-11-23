import { G } from './globais.js';
import { bindMencoes, bindMencaoClicks, hasMencao, linkNovasMencoes, renderMencoes } from './62-mencoes.js';
import { markDirty } from './08-persistencia.js';
import { catById, escapeHtml, fmtDate, completeRecurring, todayStr, togglePinned, uid } from './10-helpers.js';
import { downloadAttachment } from './12-render-tasks.js';
import { openMoveGroupPortal } from './15-portais-de-grupo-e-etiquetas.js';
import { getOrCreateActiveTask, openTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';
import { otimizarImagem } from './64-imagens.js';

/* Nome, concluir e status. */
export function bindTpHeader(panel, task){
  const tpNameEl = document.getElementById('tpName');
  tpNameEl.addEventListener('click', () => {
    if(tpNameEl.hasAttribute('readonly')){
      tpNameEl.removeAttribute('readonly');
      tpNameEl.focus();
    }
  });
  tpNameEl.addEventListener('blur', e => {
    const v = e.target.value.trim();
    if(!v && G.creatingNewTask) return; // nada digitado ainda, não cria
    const t = getOrCreateActiveTask();
    if(!t) return;
    t.title = v;
    if(!G.creatingNewTask) tpNameEl.setAttribute('readonly', '');
    markDirty();
  });
  tpNameEl.addEventListener('keydown', e => { if(e.key==='Enter') e.target.blur(); });

  const tpPinBtn = document.getElementById('tpPinBtn');
  if(tpPinBtn) tpPinBtn.onclick = () => {
    const t = getOrCreateActiveTask(); if(!t) return;
    togglePinned(t);
    markDirty();
  };

  document.getElementById('tpDoneCheck').onclick = () => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const wasDone = t.done;
    const prevStatus = t.status;
    t.done = !t.done;
    t.status = t.done ? 'concluida' : 'nao_iniciado';
    t.completedAt = t.done ? Date.now() : null;
    if(t.done) t.pinned = false;
    if(!wasDone && t.done && t.recurrence && t.recurrence !== 'none'){
      const next = completeRecurring(t, prevStatus);
      if(next){
        G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
        markDirty();
        openTaskPanel(next.id);
        return;
      }
    }
    markDirty();
  };

  const tpStatusTrigger = document.getElementById('tpStatusTrigger');
  const tpStatusDropdown = document.getElementById('tpStatusDropdown');
  tpStatusTrigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = tpStatusDropdown.style.display === 'block';
    tpStatusDropdown.style.display = isOpen ? 'none' : 'block';
  };
  tpStatusDropdown.addEventListener('click', e => e.stopPropagation());
  tpStatusDropdown.querySelectorAll('.tp-status-option').forEach(opt => {
    opt.onclick = () => {
      const t = getOrCreateActiveTask(); if(!t) return;
      const s = opt.dataset.s;
      const prevStatus = t.status;
      t.status = s;
      t.done = (s === 'concluida');
      t.completedAt = t.done ? Date.now() : null;
      tpStatusDropdown.style.display = 'none';
      if(t.done && t.recurrence && t.recurrence !== 'none'){
        const next = completeRecurring(t, prevStatus);
        if(next){
          G.state.tasks = G.state.tasks.filter(x => x.id !== t.id);
          markDirty();
          openTaskPanel(next.id);
          return;
        }
      }
      markDirty();
    };
  });
}

/* Espaço, agendas e notas ligadas, desvincular do projeto. */
export function bindTpSpaceAndLinks(panel, task){
  function renderTpGroupChip(){
    const cat = catById(task.categoryId);
    const chip = document.getElementById('tpGroupChip');
    chip.style.background = cat ? cat.color + '22' : 'var(--surface-2)';
    chip.style.color = cat ? cat.color : 'var(--ink-soft)';
    chip.innerHTML = `<span class="cat-swatch" style="background:${cat?cat.color:'var(--ink-faint)'}"></span>${escapeHtml(cat?cat.name:'Sem espaço')}`;
  }
  renderTpGroupChip();
  document.getElementById('tpGroupChip').onclick = (e) => {
    e.stopPropagation();
    openMoveGroupPortal(e.currentTarget, task.categoryId, (newCatId) => {
      const t = getOrCreateActiveTask(); if(!t) return;
      t.categoryId = newCatId;
      task.categoryId = newCatId;
      t.tagIds = (t.tagIds||[]).filter(id => {
        const tg = G.state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === t.categoryId);
      });
      renderTpGroupChip();
      markDirty();
    });
  };

}

/* Descrição e anexos. */
export function bindTpDescriptionAndAttachments(panel, task){
  const descEl = document.getElementById('tpDesc');
  const growDesc = () => { if(descEl.scrollHeight > descEl.clientHeight) descEl.style.height = Math.min(descEl.scrollHeight + 2, Math.round(window.innerHeight * 0.6)) + 'px'; };
  descEl.addEventListener('input', growDesc);
  growDesc();
  document.getElementById('tpDesc').addEventListener('blur', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const antes = t.description || '';
    t.description = e.target.value;
    linkNovasMencoes(t, antes, t.description);
    markDirty();
  });

  /* @ cita outra tarefa. Parado (sem editar), o texto aparece com os chips clicáveis; clicar fora do chip volta a editar. */
  bindMencoes(descEl, () => task.id);
  const descView = document.createElement('div');
  descView.className = 'tp-textarea tp-desc-view'; descView.id = 'tpDescView'; descView.tabIndex = 0;
  descEl.insertAdjacentElement('afterend', descView);
  const syncDesc = (editando) => {
    const ver = !editando && hasMencao(descEl.value);
    descView.style.display = ver ? '' : 'none';
    descEl.style.display = ver ? 'none' : '';
    if(ver) descView.innerHTML = renderMencoes(descEl.value);
  };
  const editaDesc = () => { syncDesc(true); descEl.focus(); descEl.setSelectionRange(descEl.value.length, descEl.value.length); growDesc(); };
  bindMencaoClicks(descView);
  descView.addEventListener('click', (e) => { if(!e.target.closest('[data-men-task]')) editaDesc(); });
  descView.addEventListener('keydown', (e) => { if(e.target === descView && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); editaDesc(); } });
  descEl.addEventListener('blur', () => syncDesc(false));
  syncDesc(false);

  /* Mantido em memória local (não cria a tarefa nova no state só por abrir o
     painel) e só é commitado via getOrCreateActiveTask() quando o usuário de
     fato anexa ou remove algo — igual ao resto dos campos deste painel. */
  let tpAttachments = (task.attachments||[]).slice();
  function renderTpAttachments(){
    const list = document.getElementById('tpAttachList');
    if(!list) return;
    list.innerHTML = '';
    tpAttachments.forEach(att => {
      const isImage = (att.type||'').startsWith('image/');
      const row = document.createElement('div');
      row.className = 'tp-attach-row';
      row.innerHTML = `
        ${isImage ? `<img src="${att.dataUrl}" alt="" class="tp-attach-thumb-img">` : `<span class="tp-attach-file-icon">${icon('file')}</span>`}
        <span class="tp-attach-name" title="${escapeHtml(att.name||'')}">${escapeHtml(att.name||'Arquivo')}</span>
        <button type="button" class="tp-attach-dl" title="Baixar anexo" aria-label="Baixar anexo">${icon('download-simple')}</button>
        <button type="button" class="tp-attach-del" title="Remover">×</button>
      `;
      row.querySelector('.tp-attach-dl').onclick = () => downloadAttachment(att);
      row.querySelector(isImage ? '.tp-attach-thumb-img' : '.tp-attach-file-icon').onclick = () => window.open(att.dataUrl, '_blank');
      row.querySelector('.tp-attach-del').onclick = () => {
        tpAttachments = tpAttachments.filter(a => a.id !== att.id);
        const t = getOrCreateActiveTask(); if(t) { t.attachments = tpAttachments; markDirty(); }
        renderTpAttachments();
      };
      list.appendChild(row);
    });
  }
  renderTpAttachments();
  document.getElementById('tpAttachBtn').onclick = () => document.getElementById('tpAttachInput').click();
  document.getElementById('tpAttachInput').addEventListener('change', e => {
    const MAX_SIZE = 4 * 1024 * 1024;
    Array.from(e.target.files||[]).forEach(file => {
      if(file.size > MAX_SIZE){
        alert(`"${file.name}" tem mais de 4 MB e não foi anexado — arquivos muito grandes deixam a sincronização mais lenta.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = async ev => {
        const dataUrl = await otimizarImagem(ev.target.result);
        const virouJpeg = dataUrl.startsWith('data:image/jpeg') && file.type !== 'image/jpeg';
        tpAttachments.push({ id: uid('att'), name: virouJpeg ? file.name.replace(/.[^.]+$/, '') + '.jpg' : file.name, type: virouJpeg ? 'image/jpeg' : (file.type || ''), dataUrl });
        const t = getOrCreateActiveTask(); if(t) { t.attachments = tpAttachments; markDirty(); }
        renderTpAttachments();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });
}
