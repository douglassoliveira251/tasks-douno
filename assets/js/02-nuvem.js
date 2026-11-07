import { G } from './globais.js';
import { LS_KEY, freshState } from './01-estado.js';

/* ===================== NUVEM (Supabase) ===================== */
export const SUPABASE_URL = 'https://zwntzqwdhgplewgbidbs.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_7hLrYE-Cmr1g0XI_hyq3wA_Z6QzAiyt';
export const sbClient = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
G.cloudSession = null;

/* O cache local (localStorage) pertence a uma conta. Quem entra com outra conta no
   mesmo navegador começa do zero, em vez de herdar (e subir para a nuvem) os dados
   da conta anterior. Cache antigo, sem dono registrado, é da conta original. */
export const LS_OWNER_KEY = 'tyvraTasksOwner';
/* Marcadores da sincronização, guardados no aparelho para o app funcionar sem internet:
   - SYNC_PENDING_KEY: há alterações feitas aqui que ainda não subiram para a nuvem;
   - SYNC_BASE_KEY: a versão da nuvem que este aparelho viu por último (base da mesclagem). */
export const SYNC_PENDING_KEY = 'dounoSyncPending';
export const SYNC_BASE_KEY = 'dounoSyncBase';
export function clearSyncMarkers(){
  try{ localStorage.removeItem(SYNC_PENDING_KEY); localStorage.removeItem(SYNC_BASE_KEY); }catch(e){}
}
/* Sessão que o Supabase guarda no aparelho. Sem internet e com o token vencido, o Supabase não
   devolve a sessão; ainda assim a pessoa continua logada e deve poder usar o app. */
export function readStoredSession(){
  try{
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && /^sb-.+-auth-token$/.test(k)){
        const v = JSON.parse(localStorage.getItem(k));
        if(v && v.user && v.user.id) return v;
      }
    }
  }catch(e){}
  return null;
}
export const LEGACY_OWNER_EMAIL = 'douglas.soliveira+tasks@outlook.com.br';
export function claimLocalCache(user){
  let owner = null;
  try{ owner = localStorage.getItem(LS_OWNER_KEY); }catch(e){}
  const legacy = !owner && String(user.email || '').trim().toLowerCase() === LEGACY_OWNER_EMAIL;
  if(owner !== user.id && !legacy){
    G.state = freshState();
    try{ localStorage.removeItem(LS_KEY); }catch(e){}
    clearSyncMarkers();
  }
  try{ localStorage.setItem(LS_OWNER_KEY, user.id); }catch(e){}
}

