/* Ponto de entrada: carrega os módulos na ordem em que eram carregados como scripts e publica os
   nomes no window (os testes e o console usam as mesmas globais de antes). */
import { G } from './globais.js';
import * as m0 from './00-versao.js';
import * as m1 from './10-helpers.js';
import * as m2 from './01-estado.js';
import * as m3 from './02-nuvem.js';
import * as m4 from './03-outlook.js';
import * as m5 from './04-novidades.js';
import * as m6 from './05-novidades-painel.js';
import * as m7 from './06-cabecalho-e-ajuda.js';
import * as m8 from './07-normalizacao-do-estado.js';
import * as m9 from './08-persistencia.js';
import * as m10 from './09-atualizacao-do-sistema.js';
import * as m11 from './11-render-sidebar.js';
import * as m12 from './12-render-tasks.js';
import * as m13 from './13-portais-de-tarefa.js';
import * as m14 from './14-portal-de-recorrencia.js';
import * as m15 from './15-portais-de-grupo-e-etiquetas.js';
import * as m16 from './16-painel-lateral-de-tarefa.js';
import * as m17 from './17-painel-lateral-render.js';
import * as m18 from './18-painel-lateral-menu.js';
import * as m19 from './19-painel-lateral-campos.js';
import * as m20 from './20-painel-lateral-datas-e-etiquetas.js';
import * as m21 from './21-painel-lateral-subtarefas-e-comentarios.js';
import * as m22 from './22-texto-rico.js';
import * as m23 from './23-texto-rico-utilitarios.js';
import * as m24 from './24-render-notes.js';
import * as m25 from './25-calendario.js';
import * as m26 from './26-dashboard.js';
import * as m27 from './27-calendario-vistas.js';
import * as m28 from './28-calendario-eventos.js';
import * as m29 from './29-notas-lista.js';
import * as m30 from './30-perfil-e-configuracoes.js';
import * as m31 from './31-projetos.js';
import * as m32 from './32-projetos-lista-e-detalhe.js';
import * as m33 from './33-relatorio-do-projeto.js';
import * as m34 from './34-pdf-gerado-direto-pelo-app.js';
import * as m35 from './35-templates-de-tarefa.js';
import * as m36 from './36-comentarios.js';
import * as m37 from './37-configuracoes-paineis.js';
import * as m38 from './38-configuracoes-espacos-e-etiquetas.js';
import * as m39 from './39-recorte-de-imagem.js';
import * as m40 from './40-indexeddb.js';
import * as m41 from './41-vinculo-de-arquivo-base.js';
import * as m42 from './42-nuvem-persistencia.js';
import * as m43 from './43-tela-de-login.js';
import * as m44 from './44-vinculo-de-arquivo-e-init.js';
import * as m45 from './45-nav-view-switch.js';
import * as m46 from './46-busca-e-notificacoes.js';
import * as m47 from './47-menu-do-avatar.js';
import * as m48 from './48-render-principal.js';
import * as m49 from './49-rotas.js';
import * as m50 from './50-init.js';

const modulos = [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18, m19, m20, m21, m22, m23, m24, m25, m26, m27, m28, m29, m30, m31, m32, m33, m34, m35, m36, m37, m38, m39, m40, m41, m42, m43, m44, m45, m46, m47, m48, m49, m50];
for(const m of modulos){
  for(const [nome, valor] of Object.entries(m)){
    Object.defineProperty(window, nome, { value: valor, writable: true, configurable: true, enumerable: false });
  }
}
for(const nome of Object.keys(G)){
  Object.defineProperty(window, nome, { get: () => G[nome], set: (v) => { G[nome] = v; }, configurable: true, enumerable: false });
}
window.dispatchEvent(new Event('douno:modulos'));
