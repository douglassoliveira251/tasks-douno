import { G } from './globais.js';
import { LS_KEY } from './01-estado.js';
import { sbClient } from './02-nuvem.js';
import { normalizeState } from './07-normalizacao-do-estado.js';
import { updateFileStatus } from './09-atualizacao-do-sistema.js';
import { currentCommentKey, saveCommentDrafts } from './16-painel-lateral-de-tarefa.js';
import { writeStateToFile } from './41-vinculo-de-arquivo-base.js';
import { adoptCloudRow } from './42-nuvem-persistencia.js';
import { render } from './48-render-principal.js';

/* ===================== PERSISTÊNCIA ===================== */
export function loadFromLocalStorage(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && parsed.categories){
        G.state = parsed;
      }
    }
  }catch(e){ console.error('Erro ao carregar localStorage', e); }
  normalizeState();
}

export function saveToLocalStorage(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(G.state)); }
  catch(e){ console.error('Erro ao salvar localStorage', e); }
}

G.autoSaveTimer = null;
export const AUTOSAVE_DEBOUNCE_MS = 250;

/* Único ponto que agenda a escrita atrasada, seja pra arquivo local ou pra nuvem -
   markDirty/persistOnly só chamam isto, sem saber qual backend está ativo. */
G.cloudWriteInFlight = null;
G.cloudWritePending = false;
G.cloudWriteFailed = false;
G.cloudWriteRetryTimer = null;
/* Sem debounce pra nuvem: um refresh (beforeunload/pagehide) nao espera uma
   escrita assincrona terminar, entao um commit adiado alguns ms podia nunca
   chegar ao Supabase e um refresh logo em seguida lia dados desatualizados.
   Escreve na hora, mas nunca mais de uma escrita em paralelo - um commit que
   chega enquanto outra escrita ja esta em voo so marca "pendente" e dispara
   de novo (com o estado mais atual) assim que a atual terminar, garantindo
   que a ultima escrita a chegar no banco sempre reflete a ultima edicao.

   Bug real corrigido aqui: antes, uma escrita que falhava (rede instavel,
   maquina dormindo no meio do envio, erro do Supabase) caia no .catch(), que so
   logava o erro no console e deixava o .then() seguinte rodar do mesmo jeito -
   e o .then() zerava `dirty` incondicionalmente, como se tivesse salvo com
   sucesso. Com `dirty` mentindo que estava tudo salvo, um refreshFromCloudIfSafe
   seguinte (ex. ao voltar o foco pra janela depois de um tempo) buscava o
   estado antigo do servidor e sobrescrevia a edicao que nunca chegou a ser
   salva, apagando-a silenciosamente. Agora, em caso de erro, `dirty` continua
   true (bloqueando o refresh) e a escrita e tentada de novo automaticamente. */
export function triggerCloudWrite(){
  if(G.cloudWriteInFlight){ G.cloudWritePending = true; return; }
  clearTimeout(G.cloudWriteRetryTimer);
  G.cloudWriteInFlight = G.writeStateToCloud()
    .then(() => {
      G.cloudWriteInFlight = null;
      G.cloudWriteFailed = false;
      G.dirty = false;
      updateFileStatus();
      if(G.cloudWritePending){ G.cloudWritePending = false; triggerCloudWrite(); }
    })
    .catch(e => {
      console.error('Auto-save na nuvem falhou', e);
      G.cloudWriteInFlight = null;
      G.cloudWriteFailed = true;
      updateFileStatus();
      G.cloudWriteRetryTimer = setTimeout(triggerCloudWrite, 8000);
    });
}

export function scheduleAutoSave(){
  if(G.fileHandle){
    clearTimeout(G.autoSaveTimer);
    G.autoSaveTimer = setTimeout(async () => {
      try{ await writeStateToFile(); G.dirty = false; updateFileStatus(); }
      catch(e){ console.error('Auto-save falhou', e); }
    }, AUTOSAVE_DEBOUNCE_MS);
  } else if(G.cloudSession){
    triggerCloudWrite();
  }
}

export async function flushAutoSave(){
  if(!G.dirty) return;
  if(G.fileHandle){
    clearTimeout(G.autoSaveTimer);
    try{ await writeStateToFile(); G.dirty = false; updateFileStatus(); }
    catch(e){ console.error('Auto-save falhou', e); }
  } else if(G.cloudSession){
    triggerCloudWrite();
    if(G.cloudWriteInFlight){ try{ await G.cloudWriteInFlight; }catch(e){} }
  }
}

export function markDirty(){
  G.dirty = true;
  saveToLocalStorage();
  updateFileStatus();
  render();
  scheduleAutoSave();
}

/* Salva sem re-renderizar a tela inteira — usado em blur de campos de texto para não
   destruir o elemento que o usuário acabou de clicar (ex: seletor de fonte/cor) no meio da interação. */
export function persistOnly(){
  G.dirty = true;
  saveToLocalStorage();
  updateFileStatus();
  scheduleAutoSave();
}

// Garante que alterações pendentes sejam gravadas antes de a aba ser minimizada,
// trocada ou fechada — evita perder a última edição feita bem antes do debounce disparar.
export function commitOpenEditors(){
  if(G.currentNoteComposerCommit){
    try{ G.currentNoteComposerCommit(); }catch(e){ console.error(e); }
  }
  /* Título e descrição da tarefa já commitam no blur (protegidos pelo blur()
     genérico abaixo). O campo de novo comentário é a exceção: só grava quando
     o usuário clica em "Adicionar", então um rascunho digitado ali e nunca
     enviado ficava só na memória do DOM — se a aba fosse escondida/fechada
     nesse meio tempo, o rascunho se perdia sem nenhum aviso. */
  // O comentário em digitação NÃO é mais enviado sozinho: fica como rascunho
  // (também em sessionStorage, então sobrevive a recarregar a página).
  const newCommentBox = document.getElementById('tpNewComment');
  if(newCommentBox && newCommentBox.value){
    G.tpCommentDrafts[currentCommentKey()] = newCommentBox.value;
    saveCommentDrafts();
  }
  if(document.activeElement && typeof document.activeElement.blur === 'function'){
    try{ document.activeElement.blur(); }catch(e){}
  }
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ commitOpenEditors(); flushAutoSave(); } });
window.addEventListener('beforeunload', () => { commitOpenEditors(); flushAutoSave(); });
window.addEventListener('pagehide', () => { commitOpenEditors(); flushAutoSave(); });

export function isEditingSomething(){
  const el = document.activeElement;
  if(!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}
/* Bug real: com o sistema aberto em duas janelas, editar e salvar numa nao atualizava
   o state em memoria da outra - ela continuava com a foto antiga carregada no boot, e
   ao editar e salvar algo la, sua escrita (o blob inteiro) sobrescrevia a mudanca feita
   na primeira janela. Ao voltar o foco pra uma aba/janela, se nao ha nada sendo digitado
   nem uma escrita pendente, busca o estado mais recente da nuvem antes que o usuario
   comece a editar ali - assim a escrita seguinte parte sempre do dado mais atual. */
G.cloudRefreshInFlight = false;
export async function refreshFromCloudIfSafe(){
  if(!sbClient || !G.cloudSession) return;
  if(G.dirty || G.cloudWriteInFlight || G.cloudWritePending) return;
  if(isEditingSomething()) return;
  if(G.cloudRefreshInFlight) return;
  G.cloudRefreshInFlight = true;
  try{
    const data = await G.fetchCloudStateRow();
    /* A busca é assíncrona — o usuário pode ter começado a editar algo
       enquanto ela estava em andamento. Se isso aconteceu, descarta o
       resultado buscado em vez de sobrescrever a edição em curso (era
       exatamente isso que apagava o que a pessoa acabara de digitar). */
    if(G.dirty || isEditingSomething()) return;
    if(data && data.data && typeof data.data === 'object'){
      G.state = data.data;
      normalizeState();
      adoptCloudRow(data);
      render();
    }
  }catch(e){ console.error('Erro ao atualizar dados da nuvem', e); }
  finally{ G.cloudRefreshInFlight = false; }
}
window.addEventListener('focus', refreshFromCloudIfSafe);
// janela aberta mas sem foco (ex.: lado a lado com outra): confere a nuvem de tempos em tempos
setInterval(() => { if(!document.hidden) refreshFromCloudIfSafe(); }, 45000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) refreshFromCloudIfSafe(); });

