/* Reordenar por arrastar: o ícone de seis pontos na frente da linha puxa a linha para cima ou para baixo
   (mouse e toque). Teclado: com o ícone em foco, setas para cima/baixo movem a linha um lugar.
   Só linhas com a alça participam; as outras (ex.: subtarefas concluídas) ficam onde estão. */

export const GRIP_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="3.5" r="1.4"/><circle cx="10.5" cy="3.5" r="1.4"/><circle cx="5.5" cy="8" r="1.4"/><circle cx="10.5" cy="8" r="1.4"/><circle cx="5.5" cy="12.5" r="1.4"/><circle cx="10.5" cy="12.5" r="1.4"/></svg>';

/* HTML da alça. */
export function gripHtml(label = 'Arrastar para reordenar'){
  return `<button type="button" class="drag-grip" title="${label}" aria-label="${label}">${GRIP_SVG}</button>`;
}

/* container: elemento pai das linhas. rowSel: seletor das linhas. Cada linha tem data-id e (opcional) um .drag-grip.
   onReorder(ids): chamado ao soltar, com os ids das linhas arrastáveis na nova ordem (só se mudou). */
export function makeSortable(container, { rowSel, onReorder }){
  if(!container) return;
  const rowsOf = () => Array.from(container.querySelectorAll(rowSel)).filter(r => r.querySelector('.drag-grip'));
  const idsOf = () => rowsOf().map(r => r.dataset.id);

  container.querySelectorAll('.drag-grip').forEach(grip => {
    const row = grip.closest(rowSel);
    if(!row) return;

    grip.addEventListener('pointerdown', e => {
      if(e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const before = idsOf().join('|');
      row.classList.add('dragging');
      container.classList.add('sorting');
      const move = ev => {
        const rows = rowsOf().filter(r => r !== row);
        const y = ev.clientY;
        let placed = false;
        for(const r of rows){
          const b = r.getBoundingClientRect();
          if(y < b.top + b.height / 2){ if(r.previousElementSibling !== row) r.parentNode.insertBefore(row, r); placed = true; break; }
        }
        if(!placed && rows.length){
          const last = rows[rows.length - 1];
          if(last.nextElementSibling !== row) last.parentNode.insertBefore(row, last.nextSibling);
        }
      };
      const end = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', end);
        document.removeEventListener('pointercancel', end);
        row.classList.remove('dragging');
        container.classList.remove('sorting');
        const after = idsOf();
        if(after.join('|') !== before) onReorder(after);
      };
      /* ouvidos no documento (não na alça): ao mover a linha no DOM o navegador solta a captura do ponteiro */
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', end);
    });

    grip.addEventListener('keydown', e => {
      if(e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const rows = rowsOf();
      const i = rows.indexOf(row);
      const j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if(j < 0 || j >= rows.length) return;
      const ids = rows.map(r => r.dataset.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      onReorder(ids);
      /* a tela é redesenhada: devolve o foco à alça da linha movida */
      setTimeout(() => {
        const again = Array.from(document.querySelectorAll(rowSel)).find(r => r.dataset.id === row.dataset.id && r.querySelector('.drag-grip'));
        const g = again && again.querySelector('.drag-grip');
        if(g) g.focus();
      }, 0);
    });
  });
}
