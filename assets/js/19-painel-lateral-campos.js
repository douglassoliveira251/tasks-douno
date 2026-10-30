/* Nome, concluir e status. */
function bindTpHeader(panel, task){
  const tpNameEl = document.getElementById('tpName');
  tpNameEl.addEventListener('click', () => {
    if(tpNameEl.hasAttribute('readonly')){
      tpNameEl.removeAttribute('readonly');
      tpNameEl.focus();
    }
  });
  tpNameEl.addEventListener('blur', e => {
    const v = e.target.value.trim();
    if(!v && creatingNewTask) return; // nada digitado ainda, não cria
    const t = getOrCreateActiveTask();
    if(!t) return;
    t.title = v;
    if(!creatingNewTask) tpNameEl.setAttribute('readonly', '');
    markDirty();
  });
  tpNameEl.addEventListener('keydown', e => { if(e.key==='Enter') e.target.blur(); });

  document.getElementById('tpDoneCheck').onclick = () => {
    const t = getOrCreateActiveTask(); if(!t) return;
    const wasDone = t.done;
    t.done = !t.done;
    t.status = t.done ? 'concluida' : 'nao_iniciado';
    t.completedAt = t.done ? Date.now() : null;
    if(!wasDone && t.done && t.recurrence && t.recurrence !== 'none'){
      const next = spawnNextRecurrence(t);
      if(next){
        state.tasks = state.tasks.filter(x => x.id !== t.id);
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
      t.status = s;
      t.done = (s === 'concluida');
      t.completedAt = t.done ? Date.now() : null;
      tpStatusDropdown.style.display = 'none';
      if(t.done && t.recurrence && t.recurrence !== 'none'){
        const next = spawnNextRecurrence(t);
        if(next){
          state.tasks = state.tasks.filter(x => x.id !== t.id);
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
function bindTpSpaceAndLinks(panel, task){
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
        const tg = state.tags.find(x => x.id === id);
        return tg && (!tg.categoryId || tg.categoryId === t.categoryId);
      });
      renderTpGroupChip();
      markDirty();
    });
  };

  let tpShowPastAgendas = false;
  function agendaIsPast(ev){
    const today = todayStr();
    if(ev.recurrence && ev.recurrence !== 'none') return !!ev.recurrenceEndDate && ev.recurrenceEndDate < today;
    return (ev.endDate || ev.date || '9999') < today;
  }
  function renderTpAgendaList(){
    const box = document.getElementById('tpAgendaList');
    if(!box) return;
    const all = state.events.filter(ev => ev.linkedTaskId === task.id)
      .sort((a,b) => (a.date||'').localeCompare(b.date||''));
    const past = all.filter(agendaIsPast);
    const linked = tpShowPastAgendas ? all : all.filter(ev => !agendaIsPast(ev));
    if(all.length === 0){
      box.innerHTML = '';
      return;
    }
    const pastToggle = past.length
      ? `<button type="button" class="tp-past-toggle" id="tpPastAgendasBtn">${tpShowPastAgendas ? 'Ocultar anteriores' : 'Mostrar ' + past.length + ' anterior' + (past.length > 1 ? 'es' : '')}</button>`
      : '';
    box.innerHTML = linked.map(ev => `
      <div class="tp-task-agenda-row" data-event-id="${ev.id}">
        <span class="dot" style="background:${eventColor(ev)}"></span>
        <div class="tp-task-agenda-body">
          <div class="tp-task-agenda-date">${fmtDate(ev.date)}${ev.startTime?' '+ev.startTime:''}</div>
          <div class="tp-task-agenda-title">${escapeHtml(ev.title||'Sem título')}</div>
        </div>
      </div>
    `).join('') + pastToggle;
    const pastBtn = box.querySelector('#tpPastAgendasBtn');
    if(pastBtn) pastBtn.onclick = (e) => { e.stopPropagation(); tpShowPastAgendas = !tpShowPastAgendas; renderTpAgendaList(); };
    box.querySelectorAll('.tp-task-agenda-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        const ev = state.events.find(x => x.id === row.dataset.eventId);
        if(ev) openEventComposer(ev);
      };
    });
  }
  renderTpAgendaList();
  document.getElementById('tpAddAgendaBtn').onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    openEventComposer(null, t.dueDate || todayStr(), t.id);
  };

  function renderTpNotesList(){
    const box = document.getElementById('tpNotesList');
    if(!box) return;
    const linked = state.notes.filter(n => n.linkedTaskId === task.id)
      .sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    if(linked.length === 0){
      box.innerHTML = '';
      return;
    }
    box.innerHTML = linked.map(n => `
      <div class="tp-task-agenda-row" data-note-id="${n.id}">
        <span class="dot" style="background:var(--ink-faint)"></span>
        <span class="tp-task-agenda-date">${fmtUpdatedAt(n.updatedAt)}</span>
        <span class="tp-task-agenda-title">${escapeHtml(n.title||'Sem título')}</span>
      </div>
    `).join('');
    box.querySelectorAll('.tp-task-agenda-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        const n = state.notes.find(x => x.id === row.dataset.noteId);
        if(n){ currentView = 'notes'; render(); openNoteComposer(n); }
      };
    });
  }
  renderTpNotesList();
  document.getElementById('tpAddNoteBtn').onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    currentView = 'notes';
    render();
    openNoteComposer(null, t.id);
  };

  const tpProjChipX = document.getElementById('tpProjChipX');
  if(tpProjChipX) tpProjChipX.onclick = (e) => {
    e.stopPropagation();
    const t = getOrCreateActiveTask(); if(!t) return;
    t.projectId = null; t.stageId = null;
    markDirty();
  };
}

/* Descrição e anexos. */
function bindTpDescriptionAndAttachments(panel, task){
  const descEl = document.getElementById('tpDesc');
  const growDesc = () => { if(descEl.scrollHeight > descEl.clientHeight) descEl.style.height = Math.min(descEl.scrollHeight + 2, Math.round(window.innerHeight * 0.6)) + 'px'; };
  descEl.addEventListener('input', growDesc);
  growDesc();
  document.getElementById('tpDesc').addEventListener('blur', e => {
    const t = getOrCreateActiveTask(); if(!t) return;
    t.description = e.target.value; markDirty();
  });

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
        ${isImage ? `<img src="${att.dataUrl}" alt="" class="tp-attach-thumb-img">` : `<span class="tp-attach-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></span>`}
        <span class="tp-attach-name" title="${escapeHtml(att.name||'')}">${escapeHtml(att.name||'Arquivo')}</span>
        <button type="button" class="tp-attach-dl" title="Baixar anexo" aria-label="Baixar anexo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></button>
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
      reader.onload = ev => {
        tpAttachments.push({ id: uid('att'), name: file.name, type: file.type || '', dataUrl: ev.target.result });
        const t = getOrCreateActiveTask(); if(t) { t.attachments = tpAttachments; markDirty(); }
        renderTpAttachments();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });
}
