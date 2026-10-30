import { G } from './globais.js';
import { APP_VERSION } from './00-versao.js';
import { sbClient } from './02-nuvem.js';
import { openWhatsNew } from './05-novidades-painel.js';
import { markDirty, persistOnly } from './08-persistencia.js';
import { catById, escapeHtml } from './10-helpers.js';
import { DOUNO_WORDMARK_SRC } from './42-nuvem-persistencia.js';

/* ===================== OUTLOOK (Microsoft Graph, via API server-side) =====================
   O token de acesso do Outlook não fica mais no navegador: fica guardado no
   Supabase, gerenciado pelas funções da Vercel em /api/outlook/*, que usam um
   client secret pra renovar sozinhas (refresh token) sem depender de popup
   nem do armazenamento local de cada domínio/navegador. */
G.outlookStatusCache = null;
export async function outlookApi(path, options){
  if(!G.cloudSession || !sbClient) throw new Error('Sem sessão na nuvem.');
  /* cloudSession.access_token é só uma foto do momento do login — o SDK do
     Supabase renova o token sozinho em segundo plano, mas essa variável
     nunca é atualizada. Busca a sessão atual (já renovada) a cada chamada,
     pra não mandar um token expirado pra nossa própria API. */
  const { data: sessionData } = await sbClient.auth.getSession();
  const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : G.cloudSession.access_token;
  const resp = await fetch(path, {
    ...options,
    headers: {
      ...(options && options.headers),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await resp.json().catch(() => ({}));
  if(!resp.ok) throw Object.assign(new Error(data.error || 'Erro na API do Outlook'), { data, status: resp.status });
  return data;
}
export async function connectOutlook(){
  const { url } = await outlookApi('/api/outlook/connect-url');
  window.location.href = url;
}
export async function disconnectOutlook(){
  await outlookApi('/api/outlook/disconnect', { method: 'POST' });
  G.outlookStatusCache = { connected: false };
}
export async function syncEventToOutlook(ev){
  if(!G.cloudSession) return;
  if(!G.outlookStatusCache) await refreshOutlookStatus();
  if(!G.outlookStatusCache || !G.outlookStatusCache.connected) return;
  const cat = catById(ev.categoryId);
  // categorias do Outlook = tags da agenda; sem tag, usa o nome do espaço
  const tagNames = (ev.tagIds || []).map(id => G.state.tags.find(t => t.id === id)).filter(Boolean).map(t => t.name);
  const categoryNames = tagNames.length ? tagNames : (cat ? [cat.name] : []);
  try{
    const result = await outlookApi('/api/outlook/sync-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync',
        outlookEventId: ev.outlookEventId || null,
        event: { ...ev, categoryName: cat ? cat.name : null, categoryNames },
      }),
    });
    if(result.outlookEventId && result.outlookEventId !== ev.outlookEventId){
      ev.outlookEventId = result.outlookEventId;
      markDirty();
    }
  }catch(e){ console.error('Erro ao sincronizar com Outlook', e); }
}
export async function deleteEventFromOutlook(ev){
  if(!G.cloudSession || !ev.outlookEventId) return;
  if(!G.outlookStatusCache) await refreshOutlookStatus();
  if(!G.outlookStatusCache || !G.outlookStatusCache.connected) return;
  try{
    await outlookApi('/api/outlook/sync-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', outlookEventId: ev.outlookEventId }),
    });
  }catch(e){ console.error('Erro ao excluir do Outlook', e); }
}
export async function refreshOutlookStatus(){
  if(!G.cloudSession){ G.outlookStatusCache = { connected: false }; return G.outlookStatusCache; }
  try{
    G.outlookStatusCache = await outlookApi('/api/outlook/status');
  }catch(e){
    console.error(e);
    G.outlookStatusCache = { connected: false };
  }
  return G.outlookStatusCache;
}
export async function renderOutlookStatus(){
  const row = document.getElementById('outlookStatusRow');
  if(!row) return;
  const hint = document.getElementById('outlookHint');
  if(hint){ hint.textContent = ''; }
  if(!G.cloudSession){
    row.innerHTML = `<span style="font-size:13px; color:var(--ink-faint);">Disponível apenas com a conta na nuvem conectada.</span>`;
    return;
  }
  row.innerHTML = `<span style="font-size:13px; color:var(--ink-faint);">Verificando...</span>`;
  const status = await refreshOutlookStatus();
  if(status.connected){
    row.innerHTML = `
      <span style="font-size:13px; color:var(--primary-dark); font-weight:600;">Conectado${status.account ? ' como ' + escapeHtml(status.account) : ''}</span>
      <button class="btn ghost small" id="outlookDisconnectBtn">Desconectar</button>
    `;
    document.getElementById('outlookDisconnectBtn').onclick = async () => {
      try{ await disconnectOutlook(); }catch(e){ console.error(e); }
      renderOutlookStatus();
    };
  } else {
    row.innerHTML = `<button class="btn small" id="outlookConnectBtn">Conectar Outlook</button>`;
    document.getElementById('outlookConnectBtn').onclick = async () => {
      const btn = document.getElementById('outlookConnectBtn');
      btn.disabled = true; btn.textContent = 'Conectando...';
      try{
        await connectOutlook();
      }catch(e){
        console.error(e);
        const h = document.getElementById('outlookHint');
        if(h){ h.style.color = 'var(--danger)'; h.textContent = 'Não foi possível conectar. Tente de novo.'; }
        btn.disabled = false; btn.textContent = 'Conectar Outlook';
      }
    };
  }
}
export function handleOutlookRedirectFeedback(){
  const params = new URLSearchParams(window.location.search);
  const outlookParam = params.get('outlook');
  if(!outlookParam) return;
  params.delete('outlook');
  params.delete('reason');
  const newQuery = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (newQuery ? '?' + newQuery : ''));
  if(outlookParam === 'connected'){
    G.pendingOutlookToast = 'Outlook conectado!';
  } else if(outlookParam === 'error'){
    G.pendingOutlookToast = 'Não foi possível conectar ao Outlook. Tente de novo.';
  }
}
G.pendingOutlookToast = null;
G.activeTaskId = null;
G.creatingNewTask = false;
G.tagsPopoverOpen = false;
G.tagFilterPopoverOpen = false;

export function applyTheme(){
  const isDark = G.state.theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  const label = document.getElementById('themeToggleLabel');
  if(sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
  if(moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
  if(label) label.textContent = isDark ? 'Modo claro' : 'Modo escuro';
  document.querySelectorAll('.theme-toggle-switch input').forEach(inp => { inp.checked = isDark; });
}
export function toggleTheme(){
  G.state.theme = G.state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  persistOnly();
}
export function openAboutModal(){
  const body = document.getElementById('aboutModalBody');
  body.style.position = 'relative';
  body.innerHTML = `
    <button type="button" id="aboutCloseBtn" class="about-close-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <div style="display:flex; flex-direction:column; align-items:center; gap:4px; margin-bottom:18px;">
      <img src="${DOUNO_WORDMARK_SRC}" alt="Douno" class="about-logo-img" style="height:32px; display:block;">
      <div style="font-size:13px; font-weight:500; color:#3B82F6;">Tasks</div>
    </div>
    <div style="font-size:13px; color:var(--ink-soft); line-height:1.6; margin-bottom:16px;">
      Sistema pessoal de tarefas, notas, calendário e indicadores — sem servidor, seus dados ficam só no seu dispositivo.
    </div>
    <div style="display:inline-flex; align-items:center; gap:6px; background:var(--surface-2); padding:5px 12px; border-radius:20px; font-family:var(--font-mono); font-size:12px; color:var(--ink-soft);">
      Versão ${APP_VERSION}
    </div>
    <div style="margin-top:14px;">
      <button type="button" class="btn ghost small" id="aboutWhatsNewBtn">Ver novidades</button>
    </div>
  `;
  document.getElementById('aboutOverlay').classList.add('show');
  body.querySelector('#aboutCloseBtn').onclick = closeAboutModal;
  body.querySelector('#aboutWhatsNewBtn').onclick = () => { closeAboutModal(); openWhatsNew(); };
}
export function closeAboutModal(){
  document.getElementById('aboutOverlay').classList.remove('show');
}
document.getElementById('aboutBtn').onclick = openAboutModal;
G.aboutOverlayMouseDownOnBackdrop = false;
document.getElementById('aboutOverlay').addEventListener('mousedown', e => {
  G.aboutOverlayMouseDownOnBackdrop = (e.target.id === 'aboutOverlay');
});
document.getElementById('aboutOverlay').addEventListener('click', e => {
  if(e.target.id === 'aboutOverlay' && G.aboutOverlayMouseDownOnBackdrop) closeAboutModal();
});

