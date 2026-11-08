/* Estado de interface agrupado por assunto. Módulo "folha": não importa nada, então qualquer módulo pode usá-lo
   sem risco de importação circular. O que é verdadeiramente compartilhado por toda a app continua em G (globais.js). */

/* Filtros da lista de tarefas e seus menus abertos. */
export const FILTROS = {
  activeTagFilters: undefined,
  activeCriticalityFilters: undefined,
  criticalityFilterPopoverOpen: undefined,
  tagFilterPopoverOpen: undefined,
  activeProjectFilters: undefined,
  projectFilterPopoverOpen: undefined,
  tagsPopoverOpen: undefined,
};

/* Notas: arrastar, nota pendente de criar e botão de salvar do compositor. */
export const NOTAS_UI = {
  draggedNoteId: undefined,
  draggedNotebookId: undefined,
  pendingNoteNotebookId: undefined,
  pendingNotePrefillTaskId: undefined,
  currentNoteComposerCommit: undefined,
  creatingNewNote: undefined,
};

/* Painel da tarefa: seletores abertos e rascunhos de comentário. */
export const PAINEL_TAREFA = {
  tpFollowOpen: undefined,
  tpStartOpen: undefined,
  tpCommentDrafts: undefined,
};

/* Linha do tempo do projeto (rolagem, ajuste e centralizar no hoje). */
export const GANTT = {
  ganttCenterToday: undefined,
  ganttFit: undefined,
  ganttLastProject: undefined,
  ganttScroll: undefined,
};

/* Início (Visão geral): período escolhido no filtro do topo. */
export const PAINEL_INICIO = { periodo: 'mes', aba: 'hoje', mapaMes: null };
export const PERIODOS = [
  { key: 'semana', label: 'Últimos 7 dias', short: '7d' },
  { key: 'mes', label: 'Este mês', short: 'no mês' },
  { key: '30', label: 'Últimos 30 dias', short: '30d' },
  { key: '90', label: 'Últimos 90 dias', short: '90d' },
];
