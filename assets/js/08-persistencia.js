/* ===================== PERSISTÊNCIA ===================== */
function loadFromLocalStorage(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && parsed.categories){
        state = parsed;
      }
    }
  }catch(e){ console.error('Erro ao carregar localStorage', e); }
  normalizeState();
}

function saveToLocalStorage(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch(e){ console.error('Erro ao salvar localStorage', e); }
}

let autoSaveTimer = null;
const AUTOSAVE_DEBOUNCE_MS = 250;

/* Único ponto que agenda a escrita atrasada, seja pra arquivo local ou pra nuvem -
   markDirty/persistOnly só chamam isto, sem saber qual backend está ativo. */
let cloudWriteInFlight = null;
let cloudWritePending = false;
let cloudWriteFailed = false;
let cloudWriteRetryTimer = null;
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
function triggerCloudWrite(){
  if(cloudWriteInFlight){ cloudWritePending = true; return; }
  clearTimeout(cloudWriteRetryTimer);
  cloudWriteInFlight = writeStateToCloud()
    .then(() => {
      cloudWriteInFlight = null;
      cloudWriteFailed = false;
      dirty = false;
      updateFileStatus();
      if(cloudWritePending){ cloudWritePending = false; triggerCloudWrite(); }
    })
    .catch(e => {
      console.error('Auto-save na nuvem falhou', e);
      cloudWriteInFlight = null;
      cloudWriteFailed = true;
      updateFileStatus();
      cloudWriteRetryTimer = setTimeout(triggerCloudWrite, 8000);
    });
}

function scheduleAutoSave(){
  if(fileHandle){
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      try{ await writeStateToFile(); dirty = false; updateFileStatus(); }
      catch(e){ console.error('Auto-save falhou', e); }
    }, AUTOSAVE_DEBOUNCE_MS);
  } else if(cloudSession){
    triggerCloudWrite();
  }
}

async function flushAutoSave(){
  if(!dirty) return;
  if(fileHandle){
    clearTimeout(autoSaveTimer);
    try{ await writeStateToFile(); dirty = false; updateFileStatus(); }
    catch(e){ console.error('Auto-save falhou', e); }
  } else if(cloudSession){
    triggerCloudWrite();
    if(cloudWriteInFlight){ try{ await cloudWriteInFlight; }catch(e){} }
  }
}

function markDirty(){
  dirty = true;
  saveToLocalStorage();
  updateFileStatus();
  render();
  scheduleAutoSave();
}

/* Salva sem re-renderizar a tela inteira — usado em blur de campos de texto para não
   destruir o elemento que o usuário acabou de clicar (ex: seletor de fonte/cor) no meio da interação. */
function persistOnly(){
  dirty = true;
  saveToLocalStorage();
  updateFileStatus();
  scheduleAutoSave();
}

// Garante que alterações pendentes sejam gravadas antes de a aba ser minimizada,
// trocada ou fechada — evita perder a última edição feita bem antes do debounce disparar.
function commitOpenEditors(){
  if(currentNoteComposerCommit){
    try{ currentNoteComposerCommit(); }catch(e){ console.error(e); }
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
    tpCommentDrafts[currentCommentKey()] = newCommentBox.value;
    saveCommentDrafts();
  }
  if(document.activeElement && typeof document.activeElement.blur === 'function'){
    try{ document.activeElement.blur(); }catch(e){}
  }
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ commitOpenEditors(); flushAutoSave(); } });
window.addEventListener('beforeunload', () => { commitOpenEditors(); flushAutoSave(); });
window.addEventListener('pagehide', () => { commitOpenEditors(); flushAutoSave(); });

function isEditingSomething(){
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
let cloudRefreshInFlight = false;
async function refreshFromCloudIfSafe(){
  if(!sbClient || !cloudSession) return;
  if(dirty || cloudWriteInFlight || cloudWritePending) return;
  if(isEditingSomething()) return;
  if(cloudRefreshInFlight) return;
  cloudRefreshInFlight = true;
  try{
    const data = await fetchCloudStateRow();
    /* A busca é assíncrona — o usuário pode ter começado a editar algo
       enquanto ela estava em andamento. Se isso aconteceu, descarta o
       resultado buscado em vez de sobrescrever a edição em curso (era
       exatamente isso que apagava o que a pessoa acabara de digitar). */
    if(dirty || isEditingSomething()) return;
    if(data && data.data && typeof data.data === 'object'){
      state = data.data;
      normalizeState();
      adoptCloudRow(data);
      render();
    }
  }catch(e){ console.error('Erro ao atualizar dados da nuvem', e); }
  finally{ cloudRefreshInFlight = false; }
}
window.addEventListener('focus', refreshFromCloudIfSafe);
// janela aberta mas sem foco (ex.: lado a lado com outra): confere a nuvem de tempos em tempos
setInterval(() => { if(!document.hidden) refreshFromCloudIfSafe(); }, 45000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) refreshFromCloudIfSafe(); });

