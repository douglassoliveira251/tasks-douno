import { G } from './globais.js';
import { sbClient } from './02-nuvem.js';
import { todayStr } from './10-helpers.js';
import { serializarEstado } from './66-biblioteca-conteudo.js';
import { estadoMaisNovo } from './07-normalizacao-do-estado.js';

/* ===================== CÓPIA DE SEGURANÇA AUTOMÁTICA =====================
   Uma vez por dia (na primeira gravação bem-sucedida do dia), o estado é copiado para a tabela state_backups, que guarda os
   últimos DIAS_GUARDADOS dias. Serve para voltar atrás depois de um engano que já foi sincronizado (exclusão em massa, importação
   errada). Os textos grandes da Biblioteca não vão na cópia: ficam em library_contents e a cópia só aponta para eles.
   A linha "pre-restauracao" guarda como estava a conta logo antes da última restauração, para poder desfazê-la. */
export const DIAS_GUARDADOS = 7;
export const CHAVE_ANTES_RESTAURAR = 'pre-restauracao';
let verificadoHoje = null;

const nuvemAtiva = () => !!(sbClient && G.cloudSession && G.cloudSession.user);
export function reiniciarBackupAutomatico(){ verificadoHoje = null; }

function resumo(d){
  return { tarefas: Array.isArray(d && d.tasks) ? d.tasks.length : 0, notas: Array.isArray(d && d.notes) ? d.notes.length : 0, agendas: Array.isArray(d && d.events) ? d.events.length : 0 };
}

/* chamado depois de cada gravação bem-sucedida; só age na primeira do dia. Nunca lança. */
export async function backupDoDia(st){
  const dia = todayStr();
  if(verificadoHoje === dia || !nuvemAtiva() || !st || estadoMaisNovo(st)) return false;
  verificadoHoje = dia;
  try{
    const uid = G.cloudSession.user.id;
    const { data: ja, error: e0 } = await sbClient.from('state_backups').select('day').eq('user_id', uid).eq('day', dia);
    if(e0) throw e0;
    if(ja && ja.length) return false;
    const { error } = await sbClient.from('state_backups').insert({ user_id: uid, day: dia, data: serializarEstado(st) });
    if(error) throw error;
    const limite = new Date(); limite.setDate(limite.getDate() - DIAS_GUARDADOS);
    const corte = limite.toISOString().slice(0, 10);
    await sbClient.from('state_backups').delete().eq('user_id', uid).lt('day', corte).neq('day', CHAVE_ANTES_RESTAURAR);
    return true;
  }catch(e){
    console.error('Cópia automática falhou (sem prejuízo).', e);
    return false;
  }
}

/* lista das cópias disponíveis (mais recente primeiro) */
export async function listarBackups(){
  if(!nuvemAtiva()) return [];
  const { data, error } = await sbClient.from('state_backups').select('day, created_at, data').eq('user_id', G.cloudSession.user.id).order('day', { ascending: false });
  if(error) throw error;
  return (data || []).map(r => ({ day: r.day, criadoEm: r.created_at, ...resumo(r.data) }));
}

/* traz uma cópia inteira (para restaurar) */
export async function buscarBackup(day){
  const { data, error } = await sbClient.from('state_backups').select('data').eq('user_id', G.cloudSession.user.id).eq('day', day).maybeSingle();
  if(error) throw error;
  if(!data || !data.data) throw new Error('Cópia não encontrada.');
  return data.data;
}

/* guarda como está a conta agora, para poder desfazer a restauração */
export async function guardarAntesDeRestaurar(st){
  const uid = G.cloudSession.user.id;
  const { error } = await sbClient.from('state_backups').upsert({ user_id: uid, day: CHAVE_ANTES_RESTAURAR, data: serializarEstado(st), created_at: new Date().toISOString() }, { onConflict: 'user_id,day' });
  if(error) throw error;
}
