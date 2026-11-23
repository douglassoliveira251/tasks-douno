import { G } from './globais.js';
import { sbClient } from './02-nuvem.js';

/* ===================== BIBLIOTECA: conteúdo grande fora do registro principal =====================
   Páginas HTML (campo html) e skills (campo content) podem ter centenas de KB. Se ficassem dentro do estado
   (taskin_state), todo salvamento mandaria tudo isso junto. Na nuvem eles ficam na tabela library_contents
   (uma linha por item, só do dono: RLS) e o item no estado guarda só os metadados + ref:true.

   Regras que mantêm isso seguro:
   1. O conteúdo SEMPRE sobe antes de o registro principal deixar de levá-lo (enviarConteudos roda antes da gravação).
   2. Se o envio falhar, o conteúdo continua dentro do item e vai no registro como antes: nada se perde.
   3. Em memória o item pode ter o texto (hidratado) ou não (ainda não aberto). Quem grava (nuvem e cópia
      local) usa serializarEstado, que tira o texto só dos itens cujo texto é idêntico ao da tabela.
   4. Sem nuvem (arquivo local / só este aparelho), nada muda: o texto fica no item.
   O que é "idêntico ao da tabela" fica em `confirmado` (id → texto). Comparar pelo mesmo texto em memória é barato. */
export const CAMPO_CONTEUDO = { html: 'html', skill: 'content' };
/* textos pequenos ficam no item: não vale uma viagem extra à nuvem */
export const LIMITE_NO_ITEM = 20000;

const confirmado = new Map();
const emAndamento = new Map();

export const campoDeConteudo = (it) => (it && CAMPO_CONTEUDO[it.type]) || null;
const nuvemAtiva = () => !!(sbClient && G.cloudSession && G.cloudSession.user);

/* contador de linhas, palavras e caracteres de uma skill */
export function skillStats(text){
  const t = String(text || '');
  if(!t.trim()) return { lines: 0, words: 0, chars: 0 };
  const lines = t.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
  const words = (t.match(/\S+/g) || []).length;
  return { lines, words, chars: t.length };
}

/* o item diz que o texto está na nuvem, mas ainda não foi trazido para a memória */
export function conteudoFaltando(it){
  const c = campoDeConteudo(it);
  return !!(c && it.ref && typeof it[c] !== 'string');
}

/* traz o texto da nuvem para o item (uma busca só, mesmo que várias telas peçam ao mesmo tempo) */
export function hidratarItem(it){
  if(!conteudoFaltando(it)) return Promise.resolve(it);
  if(emAndamento.has(it.id)) return emAndamento.get(it.id);
  const c = campoDeConteudo(it);
  const p = (async () => {
    if(!nuvemAtiva()) throw new Error('Sem conexão com a nuvem: não foi possível carregar este conteúdo agora.');
    const { data, error } = await sbClient.from('library_contents').select('content')
      .eq('user_id', G.cloudSession.user.id).eq('item_id', it.id).maybeSingle();
    if(error) throw error;
    if(!data || typeof data.content !== 'string') throw new Error('O conteúdo deste item não foi encontrado na nuvem.');
    it[c] = data.content;
    confirmado.set(it.id, data.content);
    return it;
  })().finally(() => emAndamento.delete(it.id));
  emAndamento.set(it.id, p);
  return p;
}

/* sobe para a nuvem os textos novos ou alterados (e os grandes que ainda estão no item). Nunca lança:
   o que não subir continua no item. Chamar antes de gravar o registro principal. */
export async function enviarConteudos(st){
  if(!nuvemAtiva() || !st || !Array.isArray(st.libItems)) return;
  const uid = G.cloudSession.user.id;
  for(const it of st.libItems){
    const c = campoDeConteudo(it);
    if(!c || typeof it[c] !== 'string') continue;
    const txt = it[c];
    if(it.ref && confirmado.get(it.id) === txt) continue;       // já está igual na nuvem
    if(!it.ref && txt.length < LIMITE_NO_ITEM) continue;        // pequeno: fica no item
    try{
      const { data, error } = await sbClient.from('library_contents')
        .upsert({ user_id: uid, item_id: it.id, kind: it.type, content: txt, updated_at: new Date().toISOString() }, { onConflict: 'user_id,item_id' })
        .select('item_id');
      if(error) throw error;
      if(!data || data.length !== 1) throw new Error('A nuvem não confirmou a gravação.');
      it.ref = true;
      if(it.type === 'skill') it.stats = skillStats(txt);
      confirmado.set(it.id, txt);
    }catch(e){
      console.error('Biblioteca: não consegui enviar o conteúdo de "' + (it.title || it.id) + '"; segue dentro do item.', e);
    }
  }
}

/* Textos de itens que já não existem na Biblioteca (excluídos) ficam órfãos na tabela. Só apaga o que está parado há mais
   de DIAS_ORFAO dias: dá tempo de outro aparelho ainda desatualizado enviar o item, e de desfazer uma exclusão por backup.
   Roda no máximo uma vez por sessão, depois de uma gravação bem-sucedida. Nunca lança. Devolve quantas linhas apagou. */
export const DIAS_ORFAO = 7;
let orfaosVerificados = false;
export function reiniciarLimpezaDeOrfaos(){ orfaosVerificados = false; }
export async function limparOrfaos(st){
  if(orfaosVerificados || !nuvemAtiva() || !st || !Array.isArray(st.libItems)) return 0;
  orfaosVerificados = true;
  try{
    const uid = G.cloudSession.user.id;
    const vivos = new Set(st.libItems.map(i => i.id));
    const corte = new Date(Date.now() - DIAS_ORFAO * 86400000).toISOString();
    const { data, error } = await sbClient.from('library_contents').select('item_id').eq('user_id', uid).lt('updated_at', corte);
    if(error) throw error;
    const ids = (data || []).map(r => r.item_id).filter(id => !vivos.has(id));
    if(!ids.length) return 0;
    const { error: e2 } = await sbClient.from('library_contents').delete().eq('user_id', uid).in('item_id', ids);
    if(e2) throw e2;
    return ids.length;
  }catch(e){ console.error('Biblioteca: limpeza de textos órfãos falhou (sem prejuízo).', e); return 0; }
}

const podeEnxugar = (it) => {
  const c = campoDeConteudo(it);
  return !!(c && it.ref && typeof it[c] === 'string' && confirmado.get(it.id) === it[c]);
};
/* o estado como deve ser gravado (nuvem e cópia local): sem o texto dos itens que já estão na tabela.
   Não mexe no estado em memória. Devolve o próprio estado se não há o que tirar. */
export function serializarEstado(st){
  const lib = st && st.libItems;
  if(!Array.isArray(lib) || !lib.some(podeEnxugar)) return st;
  return Object.assign({}, st, {
    libItems: lib.map(it => {
      if(!podeEnxugar(it)) return it;
      const o = Object.assign({}, it);
      delete o[campoDeConteudo(it)];
      return o;
    }),
  });
}

/* o estado com todos os textos dentro dos itens (para o backup em arquivo) */
export async function estadoCompleto(st){
  const lib = Array.isArray(st.libItems) ? st.libItems : [];
  await Promise.all(lib.filter(conteudoFaltando).map(hidratarItem));
  return st;
}
