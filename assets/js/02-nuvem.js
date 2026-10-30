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
export const LEGACY_OWNER_EMAIL = 'douglas.soliveira+tasks@outlook.com.br';
export function claimLocalCache(user){
  let owner = null;
  try{ owner = localStorage.getItem(LS_OWNER_KEY); }catch(e){}
  const legacy = !owner && String(user.email || '').trim().toLowerCase() === LEGACY_OWNER_EMAIL;
  if(owner !== user.id && !legacy){
    G.state = freshState();
    try{ localStorage.removeItem(LS_KEY); }catch(e){}
  }
  try{ localStorage.setItem(LS_OWNER_KEY, user.id); }catch(e){}
}

