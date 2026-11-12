import { G } from './globais.js';
import { escapeHtml } from './10-helpers.js';

/* ===================== PÁGINA HTML EM ABA PRÓPRIA =====================
   /app/pagina/<id> (ou #/pagina/<id> quando hospedado em subpasta) mostra só a página guardada na Biblioteca, ocupando a
   janela inteira, no mesmo quadro isolado (sandbox sem allow-same-origin: o HTML não enxerga os dados do app).
   O app ainda carrega por baixo para buscar o item (a sessão é a mesma do navegador). */
const SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals';

export function renderStandalonePage(){
  let host = document.getElementById('pageOnly');
  if(!host){ host = document.createElement('div'); host.id = 'pageOnly'; document.body.appendChild(host); }
  const list = Array.isArray(G.state && G.state.libItems) ? G.state.libItems : [];
  const it = list.find(i => i.id === G.standalonePage && i.type === 'html');
  if(!it){
    host.dataset.key = '';
    host.innerHTML = '<div class="po-msg"><b>Página não encontrada</b><span>Se você acabou de abrir, aguarde o carregamento. Se ela foi excluída, volte ao app e abra outra.</span><a href="' + escapeHtml(location.pathname.replace(/\/pagina\/.*$/, '') || '/') + '">Voltar ao app</a></div>';
    return;
  }
  const key = it.id + ':' + (it.updatedAt || 0);
  document.title = (it.title || 'Página HTML') + ' · DOUNO Tasks';
  if(host.dataset.key === key) return;
  host.dataset.key = key;
  host.innerHTML = '';
  const fr = document.createElement('iframe');
  fr.title = it.title || 'Página HTML';
  fr.setAttribute('sandbox', SANDBOX);
  fr.setAttribute('referrerpolicy', 'no-referrer');
  fr.srcdoc = it.html || '';
  host.appendChild(fr);
}
