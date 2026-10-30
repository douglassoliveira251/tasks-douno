function renderPageHeaderMeta(){
  const statsEl = document.getElementById('pageHeaderStats');
  let stats = null;
  if(currentView === 'tasks'){
    const scope = state.tasks.filter(t => !activeCategoryFilter || t.categoryId === activeCategoryFilter);
    const pending = scope.filter(t => !t.done).length;
    const overdue = scope.filter(t => isOverdue(t.dueDate, t.done)).length;
    const doneToday = scope.filter(t => t.completedAt && dateToStr(new Date(t.completedAt)) === todayStr()).length;
    stats = [
      { n: pending, label: pending === 1 ? 'pendente' : 'pendentes' },
      { n: overdue, label: overdue === 1 ? 'vencida' : 'vencidas' },
      { n: doneToday, label: doneToday === 1 ? 'concluída hoje' : 'concluídas hoje' },
    ];
  } else if(currentView === 'notes'){
    const scope = state.notes.filter(n => !n.archived && (!activeCategoryFilter || n.categoryId === activeCategoryFilter));
    const updatedToday = scope.filter(n => n.updatedAt && dateToStr(new Date(n.updatedAt)) === todayStr()).length;
    stats = [
      { n: scope.length, label: scope.length === 1 ? 'nota' : 'notas' },
      { n: updatedToday, label: updatedToday === 1 ? 'atualizada hoje' : 'atualizadas hoje' },
    ];
  } else if(currentView === 'projects'){
    const list = projectsInScope();
    const late = list.filter(p => projectStatus(p).late).length;
    stats = [
      { n: list.length, label: list.length === 1 ? 'projeto' : 'projetos' },
      { n: late, label: late === 1 ? 'com atraso' : 'com atraso' },
    ];
  } else if(currentView === 'calendar'){
    const todayCount = getEventsForDate(todayStr()).length;
    const total = eventsInScope().length;
    stats = [
      { n: todayCount, label: todayCount === 1 ? 'agenda hoje' : 'agendas hoje' },
      { n: total, label: total === 1 ? 'agenda no total' : 'agendas no total' },
    ];
  }
  if(stats){
    statsEl.innerHTML = stats.map(s => `<div class="page-header-stat"><b>${s.n}</b> ${s.label}</div>`).join('');
    statsEl.style.display = 'flex';
  } else {
    statsEl.style.display = 'none';
  }
}

const HELP_CONTENT = {
  dashboard: [
    { q: 'O que esse painel mostra?', a: 'Um resumo do que está em aberto: tarefas pendentes, notas recentes, eventos do dia e indicadores gerais de conclusão.' },
    { q: 'Os números somem quando eu concluo uma tarefa?', a: 'Sim — os cards contam só o que está em aberto. Tarefas concluídas continuam no histórico, só saem da contagem.' },
  ],
  tasks: [
    { q: 'Como crio uma tarefa recorrente?', a: 'Ao criar ou editar uma tarefa, abra o campo Recorrência e escolha a frequência. Dá pra definir uma data final pra repetição parar.' },
    { q: 'Como agrupo as tarefas por outro critério?', a: 'Use o seletor "Agrupar por" no topo da lista pra trocar entre período, prioridade, tag ou espaço.' },
    { q: 'Para onde vão as tarefas concluídas?', a: 'Ficam ocultas por padrão. Ative "Mostrar concluídas" no canto superior direito da lista pra vê-las.' },
  ],
  notes: [
    { q: 'Posso organizar notas em cadernos?', a: 'Sim, cada espaço tem seus próprios cadernos. Crie um novo caderno pela lista de notas pra agrupar por assunto.' },
    { q: 'As notas têm formatação?', a: 'Sim, o editor aceita negrito, listas, títulos e outros elementos básicos de texto rico.' },
  ],
  calendar: [
    { q: 'Vincular uma agenda a uma tarefa muda a data da agenda?', a: 'Não quando a agenda já existia antes: a data que você definiu no calendário é mantida. Só quando a agenda nasce a partir de uma tarefa (pelo botão "criar agenda" nas tarefas) é que a data vem da tarefa.' },
    { q: 'Como duplico uma agenda para outro dia?', a: 'Abra a agenda existente e use o botão "Duplicar" — ele cria uma cópia na mesma data, já pronta pra você trocar a data no formulário.' },
  ],
  settings: [
    { q: 'Onde ficam meus dados?', a: 'Modo local: só no seu dispositivo, num arquivo que você escolhe. Modo nuvem: sincronizados com sua conta, acessíveis de qualquer aparelho logado.' },
  ],
};
function renderHelpPanelContent(){
  const items = HELP_CONTENT[currentView] || HELP_CONTENT.dashboard;
  document.getElementById('helpPanelBody').innerHTML = items.map((item, i) => `
    <div class="help-item${i === 0 ? ' open' : ''}">
      <button type="button" class="help-item-q">
        ${escapeHtml(item.q)}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="help-item-a">${escapeHtml(item.a)}</div>
    </div>
  `).join('');
  document.getElementById('helpPanelBody').querySelectorAll('.help-item-q').forEach(btn => {
    btn.onclick = () => btn.closest('.help-item').classList.toggle('open');
  });
}
function openHelpPanel(){
  document.getElementById('helpPanelVersion').textContent = APP_VERSION;
  renderHelpPanelContent();
  document.getElementById('helpPanel').classList.add('show');
  document.getElementById('helpPanelBackdrop').classList.add('show');
  document.getElementById('primaryAddBtn').classList.add('help-open');
}
function closeHelpPanel(){
  document.getElementById('helpPanel').classList.remove('show');
  document.getElementById('helpPanelBackdrop').classList.remove('show');
  document.getElementById('primaryAddBtn').classList.remove('help-open');
}
document.getElementById('helpBtn').onclick = openHelpPanel;
document.getElementById('saveErrorBadge').onclick = () => { if(cloudSession) triggerCloudWrite(); };
document.getElementById('helpCloseBtn').onclick = closeHelpPanel;
document.getElementById('helpPanelBackdrop').onclick = closeHelpPanel;

