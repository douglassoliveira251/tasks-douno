import { G } from './globais.js';
import { setSeenVersion } from './05-novidades-painel.js';
import { WHATS_NEW } from './04-novidades.js';
import { markDirty } from './08-persistencia.js';
import { DEFAULT_DUE_TIME, escapeHtml, todayStr, uid } from './10-helpers.js';
import { openNewTaskPanel } from './16-painel-lateral-de-tarefa.js';
import { render } from './48-render-principal.js';
import { icon } from './icones.js';

/* ===================== PRIMEIRO USO =====================
   Conta nova (sem nenhum dado) abre um assistente de 3 passos: como vai usar (cria os espaços), modelos
   prontos (opcional) e a primeira tarefa. Depois, o Resumo mostra o cartão "Comece por aqui" com um checklist
   que se marca sozinho. O estado fica em state.onboarding ({ done, dismissed, pinned }); contas que já têm
   dados nunca passam por aqui (state.onboarding indefinido = não mostra nada). */
export const ONBOARDING_SEEN_KEY = 'dounoOnboardingSeen';

const USOS = [
  { key: 'trabalho', nome: 'Trabalho', desc: 'Projetos, reuniões, entregas', icone: 'briefcase', cor: '#4A6FA5' },
  { key: 'estudos', nome: 'Estudos', desc: 'Disciplinas, provas, leituras', icone: 'graduation-cap', cor: '#9B5DE5' },
  { key: 'pessoal', nome: 'Casa e vida pessoal', desc: 'Contas, compras, rotina', icone: 'house', cor: '#2F6F5E' },
];
const MODELOS = {
  trabalho: [
    { key: 'reuniao', name: 'Reunião semanal', priority: 'media', dueTime: '10:00', recurrence: 'weekly', subtasks: ['Definir a pauta', 'Enviar o convite', 'Registrar as decisões'] },
    { key: 'fechamento', name: 'Fechamento do mês', priority: 'alta', dueTime: '', recurrence: 'monthly', subtasks: ['Conciliar os pagamentos', 'Enviar o relatório', 'Arquivar os documentos'] },
  ],
  estudos: [
    { key: 'prova', name: 'Estudar para a prova', priority: 'alta', dueTime: '', recurrence: 'none', subtasks: ['Revisar as anotações', 'Resolver exercícios', 'Fazer um resumo'] },
    { key: 'trabalho', name: 'Entrega de trabalho', priority: 'media', dueTime: '', recurrence: 'none', subtasks: ['Pesquisar referências', 'Escrever o rascunho', 'Revisar e enviar'] },
  ],
  pessoal: [
    { key: 'compras', name: 'Compras da semana', priority: 'media', dueTime: '', recurrence: 'weekly', subtasks: ['Montar a lista', 'Conferir a despensa', 'Fazer a compra'] },
    { key: 'contas', name: 'Pagar as contas do mês', priority: 'alta', dueTime: '', recurrence: 'monthly', subtasks: ['Conferir os vencimentos', 'Pagar', 'Guardar os comprovantes'] },
  ],
};

let onbChecked = false;
const wiz = { step: 0, usos: new Set(), modelos: new Set(), titulo: '', hoje: true, espaco: null };

function getSeen(){ try{ return !!localStorage.getItem(ONBOARDING_SEEN_KEY); }catch(e){ return false; } }
function setSeen(){ try{ localStorage.setItem(ONBOARDING_SEEN_KEY, '1'); }catch(e){} }
function stateIsEmpty(){
  const s = G.state;
  return !s.onboarding && !(s.tasks || []).length && !(s.notes || []).length && !(s.events || []).length
    && !(s.projects || []).length && !(s.completedLog || []).length && (s.categories || []).length <= 1;
}

export function maybeShowOnboarding(){
  if(onbChecked || !G.appUnlocked) return;
  if(document.getElementById('loginOverlay').classList.contains('show')) return;
  if(document.getElementById('linkOverlay').classList.contains('show')) return;
  onbChecked = true;
  if(getSeen() || !stateIsEmpty()) return;
  // quem chega agora já recebe o assistente: não abre as Novidades por cima
  setSeenVersion(WHATS_NEW[0].version);
  openOnboarding();
}

export function openOnboarding(){
  wiz.step = 0; wiz.usos = new Set(); wiz.modelos = new Set(); wiz.titulo = ''; wiz.hoje = true; wiz.espaco = null;
  document.getElementById('onboardingOverlay').classList.add('show');
  renderOnboarding();
}
function closeOnboarding(){
  document.getElementById('onboardingOverlay').classList.remove('show');
}
function finishOnboarding(){
  G.state.onboarding = { done: true, dismissed: false, pinned: false };
  setSeen();
  markDirty();
  closeOnboarding();
  G.currentView = 'dashboard';
  render();
}

/* Espaços escolhidos no passo 1: o "Geral" (ainda vazio) vira o primeiro; os demais são criados. */
function applySpaces(){
  const chosen = USOS.filter(u => wiz.usos.has(u.key));
  if(!chosen.length) return;
  chosen.forEach((u, i) => {
    let cat;
    if(i === 0) cat = G.state.categories[0];
    else { cat = { id: uid('cat'), name: u.nome, color: u.cor }; G.state.categories.push(cat); }
    cat.name = u.nome; cat.color = u.cor;
    u.catId = cat.id;
  });
}
function applyTemplates(){
  const todos = Object.entries(MODELOS).flatMap(([uso, lista]) => lista.map(m => ({ ...m, uso })));
  todos.filter(m => wiz.modelos.has(m.uso + ':' + m.key)).forEach(m => {
    const u = USOS.find(x => x.key === m.uso);
    G.state.taskTemplates.push({
      id: uid('tpl'), name: m.name, title: m.name, categoryIds: u && u.catId ? [u.catId] : [], description: '',
      priority: m.priority, tagIds: [], dueTime: m.dueTime || '', recurrence: m.recurrence, recurrenceInterval: 1,
      subtasks: m.subtasks.map(t => ({ title: t })), events: [],
    });
  });
}
function createFirstTask(){
  const title = wiz.titulo.trim();
  if(!title) return;
  const today = todayStr();
  G.state.taskIdCounter = (G.state.taskIdCounter || 0) + 1;
  G.state.tasks.push({
    id: uid('task'), shortId: String(G.state.taskIdCounter).padStart(4, '0'),
    title, categoryId: wiz.espaco || G.state.categories[0].id, done: false, status: 'nao_iniciado',
    dueDate: wiz.hoje ? today : null, startDate: today, followUpDate: today, dueTime: wiz.hoje ? DEFAULT_DUE_TIME : '', priority: 'media',
    description: '', tagIds: [], recurrence: 'none', subtasks: [], comments: [], attachments: [], createdAt: Date.now(),
  });
}

function renderOnboarding(){
  const body = document.getElementById('onboardingBody');
  const dots = `<div class="onb-dots">${[0, 1, 2].map(i => `<i class="${i === wiz.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let main = '', foot = '';
  if(wiz.step === 0){
    main = `
      <div class="onb-eyebrow">Bem-vindo ao DOUNO Tasks</div>
      <h3 class="onb-title">Para que você vai usar?</h3>
      <p class="onb-sub">Vamos criar seus espaços já organizados. Dá para mudar depois.</p>
      ${USOS.map(u => `
        <button type="button" class="onb-opt${wiz.usos.has(u.key) ? ' sel' : ''}" data-uso="${u.key}" aria-pressed="${wiz.usos.has(u.key)}">
          <span class="onb-ico">${icon(u.icone)}</span>
          <span class="onb-txt"><b>${u.nome}</b><small>${u.desc}</small></span>
          <span class="onb-tick">${icon('check')}</span>
        </button>`).join('')}`;
    foot = `<button type="button" class="onb-skip" id="onbSkip">Pular por agora</button>
      <button type="button" class="btn" id="onbNext">Continuar ${icon('arrow-right')}</button>`;
  } else if(wiz.step === 1){
    const usos = wiz.usos.size ? USOS.filter(u => wiz.usos.has(u.key)) : USOS;
    const lista = usos.flatMap(u => MODELOS[u.key].map(m => ({ ...m, uso: u.key })));
    main = `
      <div class="onb-eyebrow">Passo 2 de 3 · opcional</div>
      <h3 class="onb-title">Quer começar com modelos prontos?</h3>
      <p class="onb-sub">Templates que criam a tarefa já com as subtarefas. Marque os que quiser.</p>
      ${lista.map(m => { const k = m.uso + ':' + m.key, sel = wiz.modelos.has(k); return `
        <button type="button" class="onb-opt${sel ? ' sel' : ''}" data-modelo="${k}" aria-pressed="${sel}">
          <span class="onb-ico">${icon('copy')}</span>
          <span class="onb-txt"><b>${escapeHtml(m.name)}</b><small>${m.subtasks.length} subtarefas${m.recurrence === 'weekly' ? ' · repete toda semana' : m.recurrence === 'monthly' ? ' · repete todo mês' : ''}</small></span>
          <span class="onb-tick">${icon('check')}</span>
        </button>`; }).join('')}`;
    foot = `<button type="button" class="onb-skip" id="onbBack">Voltar</button>
      <button type="button" class="btn" id="onbNext">Continuar ${icon('arrow-right')}</button>`;
  } else {
    const cats = G.state.categories;
    if(!wiz.espaco) wiz.espaco = cats[0].id;
    main = `
      <div class="onb-eyebrow">Passo 3 de 3</div>
      <h3 class="onb-title">Qual é a sua primeira tarefa?</h3>
      <p class="onb-sub">Pode ser qualquer coisa que você precisa fazer agora. Dá para editar depois.</p>
      <input type="text" class="onb-input" id="onbTitulo" placeholder="Ex.: Enviar a proposta ao cliente" value="${escapeHtml(wiz.titulo)}" maxlength="140">
      ${cats.length > 1 ? `<select class="onb-input" id="onbEspaco">${cats.map(c => `<option value="${c.id}" ${c.id === wiz.espaco ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>` : ''}
      <label class="onb-check"><input type="checkbox" id="onbHoje" ${wiz.hoje ? 'checked' : ''}> Para hoje</label>`;
    foot = `<button type="button" class="onb-skip" id="onbBack">Voltar</button>
      <button type="button" class="btn" id="onbFinish">Concluir ${icon('check')}</button>`;
  }
  body.innerHTML = `${dots}${main}<div class="onb-foot">${foot}</div>`;

  body.querySelectorAll('[data-uso]').forEach(b => b.onclick = () => {
    const k = b.dataset.uso;
    if(wiz.usos.has(k)) wiz.usos.delete(k); else wiz.usos.add(k);
    renderOnboarding();
  });
  body.querySelectorAll('[data-modelo]').forEach(b => b.onclick = () => {
    const k = b.dataset.modelo;
    if(wiz.modelos.has(k)) wiz.modelos.delete(k); else wiz.modelos.add(k);
    renderOnboarding();
  });
  const next = body.querySelector('#onbNext'), back = body.querySelector('#onbBack'), skip = body.querySelector('#onbSkip'), fin = body.querySelector('#onbFinish');
  if(next) next.onclick = () => {
    if(wiz.step === 0) applySpaces();
    if(wiz.step === 1) applyTemplates();
    wiz.step++;
    renderOnboarding();
  };
  if(back) back.onclick = () => { wiz.step--; renderOnboarding(); };
  if(skip) skip.onclick = finishOnboarding;
  if(fin) fin.onclick = () => { createFirstTask(); finishOnboarding(); };
  const titulo = body.querySelector('#onbTitulo');
  if(titulo){
    titulo.focus();
    titulo.oninput = () => { wiz.titulo = titulo.value; };
    titulo.onkeydown = (e) => { if(e.key === 'Enter'){ wiz.titulo = titulo.value; createFirstTask(); finishOnboarding(); } };
  }
  const esp = body.querySelector('#onbEspaco'); if(esp) esp.onchange = () => { wiz.espaco = esp.value; };
  const hoje = body.querySelector('#onbHoje'); if(hoje) hoje.onchange = () => { wiz.hoje = hoje.checked; };
}
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('onboardingOverlay').classList.contains('show')) finishOnboarding();
});

/* ---------- Cartão "Comece por aqui" (Resumo) ---------- */
function onboardingSteps(){
  const s = G.state;
  const outlook = !!(G.outlookStatusCache && G.outlookStatusCache.connected);
  return [
    { key: 'conta', titulo: 'Criar sua conta', dica: '', feito: true },
    { key: 'tarefa', titulo: 'Criar sua primeira tarefa', dica: 'Toque no + ou use "Criar de template"', feito: s.tasks.length > 0 || (s.completedLog || []).length > 0, acao: 'Criar' },
    { key: 'espacos', titulo: 'Organizar em espaços', dica: 'Trabalho, estudos, casa…', feito: s.categories.length > 1, acao: 'Abrir' },
    { key: 'fixar', titulo: 'Fixar uma tarefa importante', dica: 'Ela fica sempre no topo da lista', feito: !!(s.onboarding && s.onboarding.pinned) || s.tasks.some(t => t.pinned), acao: 'Ver tarefas' },
    { key: 'outlook', titulo: 'Conectar o Outlook', dica: 'Opcional: agenda e e-mails sincronizados', feito: outlook, acao: 'Abrir' },
  ];
}
export function onboardingCardVisible(){
  const o = G.state.onboarding;
  if(!o || o.dismissed) return false;
  return !onboardingSteps().every(p => p.feito);
}
export function onboardingCardHtml(){
  if(!onboardingCardVisible()) return '';
  const passos = onboardingSteps();
  const feitos = passos.filter(p => p.feito).length;
  return `
    <div class="dv-card onb-card" id="onbCard">
      <div class="onb-card-head">
        <div><b>Comece por aqui</b><small>${feitos} de ${passos.length} passos concluídos</small></div>
        <button type="button" class="onb-dismiss" id="onbDismiss">Dispensar</button>
      </div>
      <div class="onb-prog"><i style="width:${Math.round(feitos / passos.length * 100)}%"></i></div>
      ${passos.map(p => `
        <div class="onb-step${p.feito ? ' ok' : ''}">
          <span class="onb-chk">${p.feito ? icon('check') : ''}</span>
          <span class="onb-step-txt"><b>${p.titulo}</b>${p.dica && !p.feito ? `<small>${p.dica}</small>` : ''}</span>
          ${!p.feito && p.acao ? `<button type="button" class="onb-go" data-onb="${p.key}">${p.acao} ${icon('arrow-right')}</button>` : ''}
        </div>`).join('')}
    </div>`;
}
export function bindOnboardingCard(view){
  const dismiss = view.querySelector('#onbDismiss');
  if(dismiss) dismiss.onclick = () => { G.state.onboarding.dismissed = true; markDirty(); };
  view.querySelectorAll('[data-onb]').forEach(b => b.onclick = () => {
    const k = b.dataset.onb;
    if(k === 'tarefa'){ G.currentView = 'tasks'; openNewTaskPanel(); return; }
    if(k === 'espacos'){ G.settingsTab = 'categorias'; G.currentView = 'settings'; }
    else if(k === 'fixar'){ G.currentView = 'tasks'; }
    else if(k === 'outlook'){ G.settingsTab = 'integracoes'; G.currentView = 'settings'; }
    render();
  });
}
