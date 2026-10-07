## [1.10.113] - 2026-10-07 00:00

### Added

#### Calendário

- Campo "Para" da agenda guarda o histórico de e-mails usados (até 100, mais recentes primeiro, sincronizado com o resto dos dados). Ao digitar, sugere os e-mails que combinam; cada sugestão tem um "×" no fim da linha para excluir aquele e-mail do histórico.

#### Tarefas

- Anexos da tarefa ganharam o botão de baixar o arquivo, ao lado do remover.


## [1.10.112] - 2026-10-07 00:00

### Changed

#### Tarefas

- Dentro de cada grupo, a lista agora segue a ordem de horário (da menor para a maior) no mesmo dia; tarefas sem hora vão por último. A ordem anterior só olhava a data e podia embaralhar tarefas do mesmo dia.


## [1.10.111] - 2026-10-07 00:00

### Added

#### Calendário / Outlook

- Campo "Para" na agenda (e-mails separados por vírgula, validados) e interruptor "Enviar convite pelo Outlook". Com ele ligado, ao salvar o Outlook envia o convite aos convidados e avisa sobre mudanças e cancelamento. Sem o interruptor, nada é enviado.
- Categorias no Outlook agora seguem as tags da agenda (uma categoria por tag). Sem tag, usa o nome do espaço.

### Changed

#### E-mail diário

- Novo visual, claro: bloco com o dia em destaque, resumo em etiquetas (atrasadas, tarefas, compromissos em 7 dias) e um cartão por espaço, com tarefas em caixas e agenda em linhas por dia.


## [1.10.110] - 2026-10-07 00:00

### Fixed

#### Calendário

- Agendas recorrentes (dia, semana, mês, ano) não apareciam além da data de início. Agora as ocorrências são calculadas e aparecem no calendário (dia, semana e mês), na Visão geral e nas notificações, respeitando o intervalo e o "Até". Mês mais curto cai no último dia (ex.: dia 31 → 28).
- Ao mudar o "A partir de" de uma agenda, o início da agenda acompanha.
- Outlook: a recorrência da agenda agora é enviada ao Outlook (diária, semanal, mensal, anual, com data final).

### Changed

#### Notificações

- O sino mostra só as tarefas atrasadas, as de hoje e a agenda do espaço selecionado (antes as tarefas vinham de todos os espaços).

#### E-mail diário

- Novo layout: cabeçalho com a identidade do DOUNO Tasks e cores azuis; um cartão por espaço, com Tarefas (atrasadas e de hoje) à esquerda e a agenda dos próximos 7 dias à direita (empilha no celular). Agendas recorrentes entram no resumo.
- Logo servida em /assets/douno-tasks-logo.png.


## [1.10.109] - 2026-10-06 00:00

### Changed

#### Novidades

- O painel acumula as novidades que o usuário ainda não viu: a mais recente em destaque (ícone, título e texto) e, abaixo, a seção "Também desde sua última visita", em fonte menor e cinza, com texto limitado a 2 linhas e rolagem interna quando houver muitas.
- Quem não tem nada novo, ou nunca abriu o sistema, vê só a mais recente (também ao abrir pelo menu). A lista pendente fica guardada enquanto o modal está aberto, então não some ao ir ao histórico e voltar.


## [1.10.108] - 2026-10-06 00:00

### Added

#### Novidades

- Link "Ver histórico completo" no painel de Novidades: lista todas as versões anteriores (mais recente primeiro), com botão Voltar. Abrir o histórico não altera o que já foi visto.


## [1.10.107] - 2026-10-06 00:00

### Changed

#### Celular

- Cabeçalho das páginas (Tarefas, Notas, Calendário): ícone e título à esquerda, contagem resumida embaixo e o seletor de espaço como botão curto ("Todos") à direita, numa linha só.
- Notas: a nota ocupa a largura toda. Um botão no topo mostra o caderno e a nota atuais e abre uma gaveta de cadernos (linhas maiores, fecha ao escolher a nota, ao tocar fora ou no X). O botão de expandir ativa o modo foco, que esconde o cabeçalho.
- Título da nota não é mais cortado: os botões de ação ficam acima dele.


## [1.10.106] - 2026-10-06 00:00

### Fixed

#### Calendário

- Modo Dia: tag e categoria longas, ou títulos com palavras compridas (links), empurravam o conteúdo para fora do quadro. Agora o texto quebra, e tag/categoria são cortadas com reticências.
- Celular: horário e categoria na primeira linha, título na linha toda e tag embaixo.



## [1.10.105] - 2026-10-06 00:00

### Changed

#### Tarefas

- Removido o número da tarefa (0001, 0002...) da lista, do painel, do dashboard, dos seletores de vínculo e dos rótulos. O número continua existindo internamente e a busca de vínculo ainda encontra por ele.
- Celular: o nome da tarefa ocupa a linha toda (até 2 linhas) e status, data, subtarefas e tag ficam numa linha menor embaixo, com fonte reduzida. Saem da linha o ícone de recorrência, o contador de comentários, as etiquetas Hoje/Vencida e o ícone do calendário. No desktop os ícones e alertas continuam.



## [1.10.104] - 2026-10-06 00:00

### Changed

#### Geral

- Fundo das telas com um degradê azul no topo (token `--bg-glow`, claro e escuro), que some até o fundo liso. A barra do topo passou a ser transparente pra o degradê passar por trás. O degradê fica fixo atrás da tela, e o conteúdo rola por cima.



## [1.10.103] - 2026-10-06 00:00

### Changed

#### Geral

- Cor da marca trocada de verde para azul, mantendo o tom: logo ("Tasks"), botão "+", botões e campos dos formulários, itens selecionados nos menus (cadernos, configurações, espaços), barra de progresso das subtarefas, gráficos e tela de login. Ficaram como estavam: cores de prioridade, tags e espaços, e o verde de estado (tarefa concluída, status da tarefa e indicador de sincronizado), que passou a usar tokens próprios (`--ok`).

#### Novidades

- O painel agora mostra só a última novidade, num card único e mais limpo, com botão "Entendi".

### Fixed

#### Novidades

- O painel abria por cima da tela de login. Agora só abre depois que o app está liberado.



## [1.10.102] - 2026-10-05 00:00

### Added

#### Geral

- Painel de Novidades: abre sozinho uma vez a cada versão com mudanças (marcando o que é novo desde a última vez que foi visto) e fica sempre acessível em Novidades, no menu da conta, ou em Sobre → Ver novidades. O item do menu mostra uma bolinha enquanto houver novidade não vista. O conteúdo é uma lista curada em `WHATS_NEW` no `index.html`, escrita em linguagem de usuário, e deve ganhar uma entrada a cada versão que muda algo visível.



## [1.10.101] - 2026-10-05 00:00

### Changed

#### Infraestrutura

- O DOUNO Tasks passou a usar um projeto Supabase dedicado (separado do Dolfin): login, dados, link de calendário, resumo diário e integração com o Outlook. A lista de e-mails permitidos agora tem só a conta nova. Os dados do projeto antigo precisam ser importados pelo backup (Configurações → Arquivo → Importar backup) e o Outlook precisa ser reconectado uma vez.



## [1.10.100] - 2026-10-05 00:00

### Added

#### Configurações → Arquivo

- Com a conta na nuvem conectada, a aba Arquivo agora mostra "Baixar backup" e "Importar backup". O "Salvar como..." usado antes ligava o autosave a um arquivo local no lugar da nuvem até a próxima recarga, então não servia como backup nesse modo. Importar pede confirmação e grava o conteúdo na conta.

### Added

#### Infraestrutura

- Pasta `supabase/` com o SQL das tabelas, o código das duas funções (link de calendário e resumo diário) e o agendamento, pra montar o projeto Supabase dedicado do DOUNO Tasks. As funções leem os segredos do ambiente, sem valor fixo no código.



## [1.10.099] - 2026-10-02 00:00

### Fixed

#### Nuvem

- Corrige perda de edições ao entrar numa tela e começar a editar rápido demais: ao trocar de tela, o app busca a versão mais recente da nuvem antes de deixar editar (pra não sobrescrever o que foi mudado em outro dispositivo) — mas essa busca é assíncrona, e se a edição começasse antes dela terminar, quando a busca concluía ela sobrescrevia o `state` inteiro, apagando a edição em andamento. Agora, se o usuário começou a editar algo enquanto a busca ainda estava em andamento, o resultado da busca é descartado em vez de aplicado.



## [1.10.098] - 2026-10-01 00:00

### Changed

#### Tarefas

- Anexos: o ícone de anexar ficava empurrado pro canto direito (`justify-content:space-between`), longe do rótulo "Anexos" — deixava difícil de notar. Agora fica logo ao lado do texto, os dois à esquerda.



## [1.10.097] - 2026-10-01 00:00

### Changed

#### Modo escuro

- Paleta escurecida: fundo quase preto (antes era um azul-acinzentado), cards com mais contraste e definição — baseado numa referência visual trazida pelo usuário. Sidebar e conteúdo continuam com a mesma paleta (unificados).



## [1.10.096] - 2026-10-01 00:00

### Fixed

#### Integrações → Outlook

- "Conectar Outlook" falhava na hora (antes de abrir a tela da Microsoft) se a aba estivesse aberta há mais de ~1h: o token usado pra chamar nossa própria API vinha de uma variável capturada só no login, que nunca era atualizada — enquanto isso, o SDK do Supabase renova o token sozinho em segundo plano. Agora busca a sessão atual a cada chamada, em vez do valor antigo.



## [1.10.095] - 2026-10-01 00:00

### Added

#### Tarefas

- Anexos: agora dá pra anexar arquivos (qualquer tipo, não só imagem) direto na tarefa, igual já existia nas Notas. Imagens mostram miniatura; outros arquivos (PDF, planilha, etc.) mostram um ícone genérico — clicar abre o arquivo numa aba nova. Limite de 4 MB por arquivo, já que fica guardado junto com o resto dos dados (sem servidor de arquivo próprio).

### Fixed

#### Automação

- Corrigido o agendamento do resumo diário por e-mail, que não disparava — o SQL do `cron.schedule` usava `extensions.net.http_post` (erro de minha parte), quando a função correta é `net.http_post`.



## [1.10.094] - 2026-10-01 00:00

### Changed

#### Integrações → Outlook

- Reescrita a integração com o Outlook: o token de acesso deixou de ficar só no navegador (MSAL.js) e passou a ser gerenciado do lado do servidor, em funções na Vercel (`/api/outlook/*`), guardado no Supabase (tabela nova `outlook_tokens`, sem acesso de cliente). Resolve dois problemas: a sessão não depende mais de qual domínio você está usando (antes, cada domínio tinha seu próprio login salvo, parecendo "desconectar toda hora" ao trocar de endereço), e a renovação do token agora é automática via refresh token no servidor, sem popup. O app de Azure precisou virar "confidencial" (com client secret) em vez de público.



## [1.10.093] - 2026-10-01 00:00

### Changed

#### Integrações

- Redirect URI do login com o Outlook deixou de ser fixo (`tasks.douno.com.br`) e passou a usar a origem atual da página — permite o login funcionar tanto no domínio próprio quanto no espelho publicado na Vercel, desde que cada endereço esteja cadastrado como Redirect URI no Azure.



## [1.10.092] - 2026-09-30 00:00

### Changed

#### Integrações

- Endereço de retorno do login com o Outlook trocado do domínio do GitHub Pages para o domínio próprio `https://tasks.douno.com.br/`, agora com SSL ativo.



## [1.10.091] - 2026-09-30 00:00

### Fixed

#### Notas

- Editor: selecionar várias linhas com Título 3 (ou 1/2) aplicado e clicar em "Limpar formatação" não fazia nada. O navegador funde uma seleção multi-linha formatada como título num único bloco `<h3>` com quebras de linha internas, e o `removeFormat` nativo não desfaz títulos — só formatação de texto (negrito/itálico/sublinhado). Corrigido tratando esse caso separadamente.

### Changed

#### Geral

- Renomeado "Taskin" para "DOUNO Tasks" em todo o sistema (título da aba, textos de configurações, nome sugerido do arquivo de dados — `douno-tasks.json` — e nos metadados dos convites de calendário exportados).

#### Configurações → Perfil

- Acesso à nuvem restrito a uma lista de e-mails permitidos, já que o projeto de autenticação é compartilhado com outro app (Dolfin). Uma conta válida nesse projeto mas fora da lista agora é bloqueada no login com um aviso, mesmo já tendo sessão salva no navegador. Os dados de cada conta já eram isolados por política de RLS no banco — essa mudança impede o uso do sistema em si, não só a leitura de dados de terceiros.

#### Integrações (e-mail e calendário)

- Remetente do resumo diário trocado para `tasks@douno.com.br` (domínio próprio).



## [1.10.090] - 2026-09-30 00:00

### Fixed

#### Configurações → Integrações

- Conexão com o Outlook falhava com erro "redirect_uri is not valid": o endereço de retorno usado no login era calculado a partir da URL atual da página (`window.location`), que podia não bater exatamente com o cadastrado no Azure (ex: abrir como `/Taskin/index.html` em vez de `/Taskin/`). Agora o endereço é fixo no código, igual ao cadastrado no Azure.



## [1.10.089] - 2026-09-30 00:00

### Added

#### Configurações → Integrações

- Nova conexão com o Outlook via login Microsoft (Graph API): agendas criadas ou editadas no Taskin agora podem virar eventos de verdade no Outlook — editáveis, com categoria, e que dá pra encaminhar. Diferente do link de assinatura (que é somente leitura e não permite isso no Outlook). Botão "Conectar Outlook" na aba Integrações; funciona só na direção Taskin → Outlook.



## [1.10.088] - 2026-09-30 00:00

### Added

#### Topbar

- O sino de notificações, que antes era só um ícone sem função, agora abre um painel com tarefas atrasadas, tarefas de hoje e agenda de hoje, com uma bolinha de contagem. Clicar num item leva direto pra ele.



## [1.10.087] - 2026-09-30 00:00

### Changed

#### Configurações

- Perfil: o campo de e-mail deixou de ser um texto livre desconectado da conta e passou a exibir o e-mail real de login, com opção de trocar (envia confirmação por e-mail). Adicionada opção de alterar a senha direto na tela, sem precisar do fluxo de "esqueci minha senha". Ambas exigem conta na nuvem conectada.



## [1.10.086] - 2026-09-30 00:00

### Added

#### Configurações

- Nova aba "Integrações": gera um link de assinatura (`.ics` via Supabase Edge Function) para trazer as agendas do Taskin para outros calendários, como o Outlook.com ou o Google Agenda, sem precisar de login OAuth. É só colar o link em "Assinar da web" no calendário externo. Funciona só na direção Taskin → calendário externo (o que for criado direto no calendário externo não volta pro Taskin), e a sincronização depende do intervalo de atualização que cada serviço usa pra calendários assinados por link (não é instantâneo). Disponível apenas com a conta na nuvem conectada, já que o link depende dos dados estarem no servidor. Inclui botão para gerar um novo link e invalidar o anterior.



## [1.10.085] - 2026-09-30 00:00

### Fixed

#### Tarefas

- Recorrência desalinhava quando o prazo era editado antes de concluir a tarefa. Exemplo relatado: tarefa criada no dia 1 com recorrência semanal, reagendada pro dia 4 e concluída ali — a próxima ocorrência saía no dia 11 (dia 4 + 7) em vez de dia 8 (dia 1 + 7). A causa: o cálculo da próxima data usava o prazo atual da tarefa como base, que pode ser editado livremente pelo usuário pra planejar quando fazer aquela ocorrência específica. Agora usa sempre o campo "A partir de" (`recorrência` → data de início), que só muda se o usuário mexer nele de propósito — o prazo continua editável sem afetar a cadência. Esse campo já existia no popover de recorrência; só não era consultado no momento de gerar a próxima tarefa.



## [1.10.084] - 2026-09-29 00:00

### Changed

#### Modo escuro

- Paleta do modo escuro unificada com a do menu lateral (que é sempre escuro, com cores fixas): o verde de destaque e os tons neutros de fundo do conteúdo agora são exatamente os mesmos do menu. Antes, o conteúdo usava um verde mais apagado e um cinza neutro, diferentes do verde vivo e do cinza azulado do menu — a diferença só aparecia no modo escuro (no claro o menu contrasta de propósito) e dava a impressão de duas telas coladas. Opção 2 dos mockups apresentados, escolhida pelo usuário.



## [1.10.083] - 2026-09-29 00:00

### Changed

#### Configurações

- Redesenhada a navegação da tela: as abas horizontais (Perfil, Personalização, Espaços, Tags, Arquivo) viraram uma lista lateral com ícones, à esquerda do conteúdo — mesmo padrão de configurações do macOS/Linear. Em telas estreitas (mobile), a lista vira uma fileira de pílulas que quebra linha em vez de ficar comprimida.



## [1.10.082] - 2026-09-29 00:00

### Fixed

#### Sincronização com a nuvem

- **Correção importante**: uma escrita na nuvem que falhasse (rede instável, aparelho hibernando no meio do envio, erro do Supabase) era tratada como se tivesse dado certo — o app zerava a marca de "alterações pendentes" mesmo sem ter salvo nada. Com essa marca mentindo, ao voltar o foco pra janela (ex. "depois de um tempo que eu volto na tela") o app buscava o estado antigo do servidor e sobrescrevia silenciosamente a edição que nunca chegou a ser salva — comentários, mudança de status etc. pareciam simplesmente sumir. Agora, se a escrita falhar, o app mantém a marca de pendente (bloqueando essa busca), tenta salvar de novo automaticamente, e mostra um aviso visível ("Falha ao salvar") na barra superior, clicável para tentar na hora. Essa correção é na camada compartilhada de salvamento — vale para Tarefas, Notas e Calendário igualmente, e para qualquer tela nova que vier a usar o mesmo mecanismo.
- Um comentário digitado no painel de tarefa mas não enviado (sem clicar em "Adicionar") também podia se perder se a aba fosse escondida ou fechada nesse meio tempo. Agora é salvo automaticamente nesses momentos, do mesmo jeito que já acontecia com notas.

#### Menu lateral

- Depois de atualizar a página (ou voltar de uma sessão restaurada), o item destacado no menu podia não bater com a tela realmente carregada — ficava sempre marcando "Visão geral" até o próximo clique, mesmo estando em outra tela. Corrigido: o destaque agora é recalculado a cada atualização de tela.



## [1.10.081] - 2026-09-29 00:00

### Added

#### Busca

- Busca global de verdade: o campo de busca agora aparece em todas as telas (antes só existia em Tarefas e Notas, sumia na Visão geral/Calendário/Configurações) e, ao digitar, mostra um menu com os resultados de tarefas, notas e eventos que combinam com o termo, agrupados por tipo. Clicar num resultado abre o item direto, de qualquer tela. Em Tarefas e Notas, a lista da própria tela continua filtrando ao vivo como já fazia, além do menu de resultados.



## [1.10.080] - 2026-09-29 00:00

### Changed

#### Configurações

- Aplicado o padrão visual das outras telas: o conteúdo de cada aba (Perfil, Personalização, Espaços, Tags, Arquivo) agora fica dentro de um card com sombra, em vez de flutuar direto no fundo da página. O toggle de "Modo escuro" virou uma linha com fundo levemente destacado em vez de uma caixa com borda própria dentro do card.



## [1.10.079] - 2026-09-29 00:00

### Added

#### Mobile

- Suporte real a telas estreitas (celular), no lugar do antigo fallback que só escondia o menu sem dar nenhuma forma de acessá-lo:
  - Menu lateral vira uma gaveta: botão de hambúrguer no topo abre um menu deslizante (com nome dos itens em tamanho legível, não só ícone), com fundo escurecido atrás; fecha ao tocar fora, ao escolher uma tela ou com Esc.
  - Barra de busca, chip de perfil (só o avatar) e o card de título se ajustam à largura da tela.
  - Notas: os dois painéis (Cadernos / nota) empilham em vez de ficar lado a lado espremidos.
  - Calendário: mês inteiro cabe na tela, com os textos dos eventos truncados em vez de quebrar letra por letra.
  - Painel de tarefa e painel de Ajuda passam a ocupar quase a tela toda (like um "modo cheio" mobile) em vez de manter a largura fixa de desktop, que vazava pra fora da tela.

Testado via browser em 375px de largura, nas 5 telas e nos dois temas.



## [1.10.078] - 2026-09-29 00:00

### Changed

#### Notas

- Aumentada a altura dos cards de Cadernos e da nota: a tela reservava 60px de respiro embaixo (herdado do padrão das outras telas, que rolam), mas como o painel de Notas tem altura fixa esse espaço só sobrava vazio. Reduzido para 16px.



## [1.10.077] - 2026-09-29 00:00

### Changed

#### Calendário

- Aplicado o mesmo padrão visual das outras telas: a barra de "Dia/Semana/Mês" + navegação ganhou um card com fundo e sombra (antes ficava solta no fundo da página), e a grade do mês, a grade da semana e as linhas do dia ganharam sombra leve, consistente com os cards elevados do resto do app.



## [1.10.076] - 2026-09-29 00:00

### Fixed

#### Visão geral

- O conteúdo do dashboard (`.dash-wrap`) tinha `max-width:1180px` fixo e centralizado, enquanto o card de título usa a largura toda disponível — em telas largas isso deixava o conteúdo mais estreito que o título, desalinhado. Removido o `max-width`, agora acompanha a mesma largura do card de título.

#### Notas

- Barrinha de rolagem horizontal indesejada no painel "Cadernos": `overflow-y:auto` sozinho faz o navegador tratar o eixo horizontal como `auto` também, e uma sobra de ~3px de conteúdo disparava a barra. Fixado `overflow-x:hidden` explícito.
- Rolagem da nota não funcionava quando o conteúdo era mais alto que a tela: a correção de altura da rodada anterior dependia de `#notesView` virar `display:flex`, mas esse elemento já tem o `display` controlado por JS a cada render (`style.display = 'block'/'none'` para trocar de tela) — um estilo inline sempre vence a regra do CSS, então o `display:flex` nunca chegava a valer. Trocado para `height:100%` nos painéis internos, que não depende do pai ser flex.



## [1.10.075] - 2026-09-29 00:00

### Changed

#### Visão geral

- Dashboard redesenhado: os 5 cards de indicador viraram 4 (removido "Tags mais usadas", que era mais decorativo que útil); o gráfico de rosca de "Tarefas por prioridade" virou barras horizontais; "Indicadores gerais" foi incorporado ao novo card "Progresso" (junto com as barras de prioridade); "Notas recentes" foi removido (redundante com o card de indicador "Notas" e a própria tela de Notas). Ícones dos cards de indicador em quadrado colorido (em vez de círculo) e cards com sombra leve, consistente com o resto do app.

#### Tarefas

- Barra de "Agrupar por / Filtros / Tags / Mostrar concluídas" ganhou um card próprio com fundo e sombra (antes era texto solto direto no fundo da página). Cada tarefa da lista passou a ser um card elevado (com sombra e cantos arredondados), em vez de uma linha plana dentro de uma caixa compartilhada.

#### Notas

- Painel de cadernos e a área da nota (editor ou o "selecione uma nota") viraram dois cards separados, com espaçamento e sombra entre eles, em vez de um painel único dividido por uma borda interna. Aproveitei pra corrigir também a altura do painel: usava um valor fixo (`100vh - 94px`) calibrado pro topo antigo, que ficou defasado depois da reforma do topo e deixava sobrar espaço vazio embaixo — agora usa flexbox e se ajusta sozinho a qualquer altura de topo.



## [1.10.074] - 2026-09-29 00:00

### Fixed

#### Layout

- Removido um recuo extra de 16px entre o menu lateral e o conteúdo das telas (o conteúdo agora começa logo depois do menu).



## [1.10.073] - 2026-09-29 00:00

### Fixed

#### Topo das telas

- Campo de busca estava com o mesmo fundo da página (cinza), quase invisível. Agora tem fundo branco e sombra leve, com destaque de verdade.

### Changed

#### Topo das telas

- Ícones de ajuda/notificações e o chip de perfil ganharam sombra leve, para não ficarem "soltos" no fundo da página.
- Card de título de cada tela ganhou mais presença: ícone da seção à esquerda, selo do espaço reduzido acima do título, e uma linha de estatísticas rápidas específica de cada tela (Tarefas: pendentes/vencidas/concluídas hoje; Notas: total/atualizadas hoje; Calendário: agendas hoje/no total). Visão geral e Configurações continuam só com ícone + título, sem a linha de estatísticas (a Visão geral já tem os cards de indicadores logo abaixo).



## [1.10.072] - 2026-09-28 00:00

### Added

#### Topo das telas

- Botão de ajuda (?) na barra superior, ao lado das notificações: abre um painel flutuante com perguntas e respostas específicas da tela atual (Visão geral, Tarefas, Notas, Calendário, Configurações), com a versão do app no rodapé.

### Changed

#### Topo das telas

- Barra superior reformulada seguindo o novo padrão: sem caixa/borda, mesmo fundo da página, com a busca à esquerda e ajuda/notificações/perfil (agora com o nome, não só o avatar) à direita.
- Título da tela, subtítulo e o seletor de espaço saíram da barra superior e passaram a ficar num card próprio, no topo do conteúdo de cada tela.



## [1.10.071] - 2026-09-28 00:00

### Removed

#### Menu lateral

- Removido o modo expandido do menu e o botão de minimizar/expandir. O menu agora é sempre o compacto (ícone + nome pequeno abaixo), sem alternância.

### Changed

#### Menu lateral

- Mais 2px de largura (90px → 92px).
- Fonte do rótulo "Modo escuro" reduzida para caber sem cortar (os demais itens continuam no tamanho anterior).



## [1.10.070] - 2026-09-28 00:00

### Changed

#### Menu lateral

- Modo reduzido: menu +4px mais largo, mais espaçamento entre o ícone e o nome do item, fonte do nome menor e um pouco menos destacada (branco com opacidade, peso normal em vez de médio).
- Modo reduzido: os botões "Modo escuro" e "Sobre" agora também mostram o nome abaixo do ícone, igual aos demais itens (antes ficavam só com o ícone).
- Fundo do item selecionado mais destacado (verde com mais contraste contra o menu escuro).



## [1.10.069] - 2026-09-28 00:00

### Added

#### Calendário

- Botão "Duplicar" na agenda em edição: cria uma cópia (título com sufixo "(cópia)", sem tarefa vinculada) na mesma data e já reabre o formulário nela editando, para trocar a data direto no campo.

### Fixed

#### Calendário

- Vincular uma tarefa a uma agenda já existente estava sobrescrevendo a data/horário da agenda pelos dados da tarefa. Agora isso só acontece quando a agenda nasce a partir da tarefa (fluxo "criar agenda" nas tarefas); vincular uma tarefa a uma agenda criada direto no calendário mantém a data que já estava lá.

### Changed

#### Sobre (menu)

- Identidade visual atualizada para o padrão Douno Tasks (logo "DOUNO" + "Tasks" em verde, com inversão de cor automática no tema escuro), no lugar do ícone/texto antigos do Taskin.

#### Menu lateral

- Modo reduzido: menu 2px mais largo, ícones um pouco maiores, e cada item passou a mostrar o nome abaixo do ícone (fonte bem pequena, branca, centralizada, truncada com reticências quando necessário).
- Modo reduzido: adicionado o rótulo "Tasks" em verde abaixo do ícone "D".

#### Tela inicial (login)

- Bloco "DOUNO" + "Tasks" movido para o canto esquerdo do painel de marca, mantendo "Tasks" centralizado sob o "DOUNO" (antes o bloco inteiro ficava centralizado no painel).



## [1.10.068] - 2026-09-28 00:00

### Changed

- "Tasks" (menu e login) com peso mais leve: a fonte Sora carregava só nos pesos 400/600/700/800, então `font-weight:500` caía pro 600 (parecia negrito); adicionado o peso 500 ao carregamento da fonte para renderizar como médio de verdade.
- Login: "Tasks" agora centralizado sob o "DOUNO", em vez de alinhado à esquerda.
- Favicon trocado para o ícone "D" oficial da marca Douno, fundo azul-escuro e traço branco (era o ícone antigo do Taskin).



### Changed

#### Tela de login

- Agora usa a identidade Douno Tasks (antes mantinha o logo/marca antiga do Taskin): logo "DOUNO" + "Tasks" no painel escuro, ícone oficial da marca como marca d'água, botão e realces em verde esmeralda, texto "Acesse sua conta do Douno Tasks.".

#### Menu lateral

- Logo "DOUNO" reduzido no modo expandido, com um pequeno espaço de volta entre ele e "Tasks" (tinha ficado colado demais no ajuste anterior).



### Changed

#### Menu lateral

- Logo "DOUNO" e subtítulo "Tasks" mais próximos, com uma linha divisória separando esse bloco dos itens de navegação.
- Botão de expandir/recolher menor e recolorido para combinar com o menu (fundo e borda escuros, ícone verde) em vez do círculo branco anterior.
- Espaçamento adicionado entre o menu e o início do conteúdo da tela.
- Logo da marca recortado (sem a folga transparente do arquivo original) para o espaçamento visual bater com o valor real definido em CSS.

#### Tela de login

- Redesenhada no formato split-screen (referência: tela de acesso do Anora) — painel de marca à esquerda em telas grandes (headline, texto de apoio, selo de segurança dos dados) e formulário centralizado à direita; em telas pequenas, só o formulário aparece, com o logo compacto no topo.
- Campo de senha ganhou botão de mostrar/ocultar.
- Logo e identidade visual do Taskin mantidos como estavam nessa tela (não usa a marca Douno).



### Changed

#### Menu lateral (rebranding Douno)

- Menu lateral redesenhado com a nova identidade Douno: painel flutuante suspenso (cantos arredondados, afastado das bordas, sombra), fundo azul-marinho no lugar do preto/verde anterior, e cor de destaque em verde esmeralda.
- Logo "DOUNO" (arte real da marca, em branco) substituindo o ícone e o texto "Taskin" antigos; "Tasks" como subtítulo do produto logo abaixo, mais próximo do logo.
- Menu reduzido agora mostra o ícone "D" oficial da marca (traço, sem fundo colorido), maior e em branco.
- Botão de expandir/recolher redesenhado como um círculo branco na borda direita do painel.
- Mudança restrita ao menu lateral — nenhuma outra tela do sistema foi alterada.



### Changed

#### Notas

- Removidos os atalhos de markdown ao digitar (`# `, `- `, `**negrito**`...), a pedido — voltou a ser só texto normal digitar esses caracteres no corpo da nota.
- Ícone de fixar na lista de notas do caderno reduzido mais uma vez (de 13px para 11px).

## [1.10.052] - 2026-09-25 00:00

### Added

#### Notas

- Duplicar nota: novo botão no cabeçalho da nota (antes do de fixar).
- Exportar nota como Markdown (.md) ou PDF (abre uma janela de impressão para "Salvar como PDF"), pelo novo botão de exportar no cabeçalho.
- Atalhos de markdown ao digitar no corpo da nota: `# `/`## `/`### ` no início da linha viram título, `- `/`* ` viram lista com marcadores, `1. ` vira lista numerada, e fechar `**texto**`/`*texto*` vira negrito/itálico.

#### Calendário / Tarefas

- Recorrência ganhou um campo opcional "Até" (data fim) — depois dessa data, a tarefa recorrente deixa de gerar a próxima ocorrência ao ser concluída.

### Fixed

#### Notas

- Corrigido: escolher um estilo de título (Normal/Título 1/2/3) no seletor da barra de formatação às vezes não aplicava o formato ao texto selecionado — o valor escolhido podia ser sobrescrito internamente antes de ser usado.

### Changed

#### Notas

- Ícone de fixar reduzido um pouco mais na lista de notas dentro do caderno.

## [1.10.045] - 2026-09-25 00:00

### Changed

#### Sincronização na nuvem

- A busca automática de dados mais recentes da nuvem (adicionada ao voltar o foco na janela) agora também acontece ao trocar de tela (Visão geral/Tarefas/Notas/Calendário/Configurações) dentro da mesma janela — cobre o caso de ficar um tempo na mesma janela navegando entre telas sem nunca trocar de aba/janela. Mesmas travas de segurança de antes: não busca se houver algo sendo digitado ou uma escrita pendente.

## [1.10.044] - 2026-09-25 00:00

### Fixed

#### Sincronização na nuvem

- Bug real corrigido: com o sistema aberto em duas janelas, editar e salvar numa não atualizava os dados carregados na outra — ela continuava com a "foto" antiga do momento em que abriu, e ao editar e salvar algo ali, sua escrita (o dado inteiro) sobrescrevia a mudança feita na primeira janela. Agora, ao voltar para uma janela/aba (ela ganha foco), o sistema busca os dados mais recentes da nuvem antes que você comece a editar ali, desde que não haja nada sendo digitado nem uma escrita pendente — assim a próxima alteração sempre parte do dado mais atual, e a edição feita na outra janela não é mais perdida.

## [1.10.043] - 2026-09-25 00:00

### Fixed

#### Notas

- Bug real corrigido: o corpo da nota só salvava ao perder o foco (clicar fora do campo). Se você digitasse e saísse da tela sem clicar fora antes (trocar de tela, dar refresh), a edição nunca era gravada. Agora o corpo também salva sozinho após 3 segundos sem digitar, igual ao título.

## [1.10.042] - 2026-09-25 00:00

### Fixed

#### Sincronização na nuvem

- Corrigido: editar em duas janelas/dispositivos ao mesmo tempo e atualizar a página podia mostrar dados desatualizados. O salvamento na nuvem tinha um atraso de 250ms (debounce) que um refresh logo em seguida não esperava terminar — a última edição podia nunca chegar a ser gravada. Agora a escrita na nuvem dispara imediatamente a cada alteração, sem atraso artificial, e novas edições que cheguem enquanto uma escrita já está em andamento são enfileiradas (nunca perdidas, nunca escritas em paralelo).
- A tela e o espaço que você estava vendo (Tarefas/Notas/Calendário/Visão geral + filtro de espaço) agora são restaurados automaticamente após um refresh — cada aba/janela guarda isso de forma independente, então abrir o sistema em duas janelas olhando espaços diferentes não faz uma "roubar" o estado da outra.

## [1.10.040] - 2026-09-22 00:00

### Changed

#### Notas

- Layout completo da tela redesenhado no padrão visual de Tarefas: Cadernos numa coluna própria (com busca, redimensionável arrastando a borda), nota aberta ao lado numa única superfície contínua em vez de duas caixas separadas.
- Removida a cor por nota (seletor de cor, fundo colorido no card) — paleta neutra em todo o fluxo, como no resto do sistema.
- Cadernos: contagem de notas como badge, criar/renomear/excluir/**mover de espaço** pelo menu (⋮), nome com fonte de título.
- Notas: mover para outro caderno arrastando a nota até ele, ou clicando no caderno mostrado no breadcrumb "Espaço › Caderno" dentro da nota (substituiu o botão de mover na barra de ferramentas).
- Pin: continua na lista de cadernos como antes, agora clicável para desafixar direto ali; fixar/excluir na nota aberta viraram botões circulares no cabeçalho, no mesmo padrão do sino de notificações.
- Tags removidas das notas (composer e filtro no topo da tela) — seguem existindo normalmente em Tarefas.
- "Cadernos" e a lista de cadernos/notas puxados um pouco mais à esquerda; barra de formatação e linha de mover/anexar/vincular tarefa voltaram a ficar numa única linha, com divisor sutil entre os grupos.

#### Tarefas

- Modo escuro: ícone de status "Em andamento" e cor das tags reequilibrados para contraste adequado sobre fundo escuro.

#### Geral

- Botão "Sair": corrigida a confirmação de desconexão, que fechava sozinha no mesmo clique em que abria e aparecia fora do lugar na tela.

### Removed

#### Notas

- Modal de nota legado (não usado desde a migração para o layout de Cadernos) e o código morto acumulado da grade antiga de notas coloridas — parte dele colidia com o CSS do editor novo e quebrava o sublinhado do título e o alinhamento da barra de ferramentas.
- Função de arquivar removida da lista de Cadernos — não havia nenhum controle na interface que a ativasse.

### Fixed

#### Notas

- "Nova nota" podia travar num composer em branco ao sair da tela sem digitar nada; agora restaura a última nota aberta do espaço.
- Arrastar uma nota para outro caderno enquanto ela estava aberta desfazia a própria mudança (ordem incorreta entre o commit do editor e a atualização do caderno).
- Três botões da coluna de Cadernos sem `border`/`background` explícitos apareciam com o estilo padrão do navegador fora de um preview em sandbox.

## [1.9.011] - 2026-09-15 01:51

### Added

#### General

- Novo botão **"Sobre"** no rodapé da sidebar, antes de "Modo escuro" — abre uma modal com o logo, nome, slogan, descrição curta do sistema e número da versão instalada.
- **Novo logo/ícone da marca**: ícone de lista com check, em verde sólido (`#3FA087`, a mesma cor `--primary` já usada na sidebar), aplicado em três lugares — favicon da aba do navegador, marca da sidebar (ícone + "Taskin" quando expandida, só o ícone quando minimizada) e modal "Sobre".

### Changed

#### Tarefas

- Dropdown da lista de Status: agora dimensiona conforme o conteúdo em vez de ficar travado exatamente na largura do campo, sem quebrar texto em várias linhas. Só a lista mudou — o campo (trigger) continua do mesmo tamanho.
- Campo Agenda vinculada: data/hora agora em uma linha (fonte normal, menor e um pouco mais escura) e o título da tarefa embaixo, truncado a uma linha.

#### Calendário

- Ao criar uma agenda a partir de uma tarefa, a descrição da tarefa é copiada automaticamente para a descrição do evento.

#### Notas

- Botão de filtro de tags movido do corpo da tela para o topo, logo depois do campo de busca — some automaticamente ao sair da tela de Notas.

#### Geral

- Modal "Sobre": removido o botão "Fechar", mantendo apenas um X no canto superior direito.

### Removed

#### Visão geral

- Seletor de espaço removido do título da tela de Visão geral (ela sempre mostra todos os espaços, então o seletor ali não tinha função).

### Fixed

#### Geral

- Corrigido o favicon do site, que não estava refletindo o novo logo: havia um segundo favicon antigo (PNG, resquício de antes da renomeação para Taskin) ainda declarado no HTML, competindo com o novo SVG. Removida a referência antiga — agora só existe um favicon declarado, com o ícone e a cor atuais do sistema.
## [1.8.044] - 2026-09-05 15:39

### Renomeação: Categorias → Espaços

- "Categoria(s)" renomeada para "Espaço(s)" em todas as referências visíveis: aba de Configurações, rótulos de campo, botões, mensagens de confirmação, agrupamento de tarefas, tela de mover item de espaço, etc. As chaves internas (`data-tab="categorias"`, `catById`, `getOrderedCategories` etc.) foram mantidas intactas, mesmo princípio já usado na renomeação para Taskin.

### Added

#### General

- Novo **seletor de espaço** no topo da tela, antes do título: combo com círculo colorido + nome do espaço + seta, abrindo um menu com a lista de espaços (com marca de seleção), opção "Todos os espaços", "+ Novo espaço" (cria e leva direto para Configurações com o campo em foco) e "Gerenciar espaços" (vai para a aba Espaços). Presente nas telas de Tarefas, Notas, Calendário e Visão geral.
- Lista de espaços removida do menu lateral — a seleção agora é feita inteiramente pelo novo seletor no topo, com o mesmo comportamento de antes (sincroniza agrupamento salvo, visão de calendário salva, limpa a busca).

#### Visão geral (Dashboard)

- Tela renomeada de "Dashboard" para "Visão geral" (título e item de menu).
- Redesenho completo com cinco cards de indicadores no topo: **Tarefas** (total, concluídas/pendentes nos últimos 45 dias, barra de progresso), **Notas** (total, novas na semana, gráfico sparkline dos últimos dias), **Eventos hoje** (contagem, próximo evento, atalho para o Calendário), **Tags mais usadas** (total distintas, top 3 em pills, atalho para Configurações → Tags) e **Itens importantes** (tarefas de prioridade alta/crítica + notas fixadas).
- Segunda linha de cards: **Tarefas por prioridade** (gráfico de rosca com total no centro e legenda com contagem/percentual), **Atividades recentes** (feed real das últimas 4 ações — tarefa concluída, nota criada, agenda criada/atualizada — com ícone, espaço de origem, módulo e horário relativo) e **Próximos eventos** (lista compacta com data/hora, título e categoria colorida).
- Terceira seção: **Indicadores gerais** (taxa de conclusão, % em atraso, criadas vs. concluídas em 30 dias, agendas hoje, carga por espaço).
- Quarta linha: **Notas recentes** (lista com ícone, título, pill do espaço e "Editada hoje/ontem/em DD/MM/AAAA") e **Tarefas importantes** (checkbox, título, pill de prioridade, data amigável "Hoje"/"Amanhã"/data completa, bandeira vermelha para prioridade Crítica).
- Visão geral passou a sempre considerar **todos os espaços**, independente do espaço selecionado no seletor do topo — o restante do sistema continua respeitando o filtro normalmente.
- Rastreamento de `updatedAt` adicionado aos eventos do calendário (não existia antes), permitindo diferenciar "agenda criada" de "agenda atualizada" no feed de atividades.

### Changed

#### Visão geral (Dashboard)

- KPIs de conclusão (card "Tarefas" e "Taxa de conclusão") passaram a considerar apenas tarefas concluídas nos **últimos 45 dias**, não o total histórico.
- Gráfico de rosca "Tarefas por status" substituído por "Tarefas por prioridade", reaproveitando os mesmos dados já usados em outro ponto do dashboard.
- Peso da fonte dos números de destaque reduzido (de extra-negrito para um peso mais simples) em todo o dashboard.
- Tamanhos de fonte gerais do dashboard reduzidos (números, títulos de seção, linhas de lista, rótulos).
- Círculo do gráfico de prioridade aumentado (118px → 150px).
- Layout do card "Próximos eventos" simplificado para o formato compacto (data/hora em uma linha, título, categoria colorida à direita).
- Botão do seletor de espaço com visual menos destacado (borda neutra em vez de preenchimento verde) e levemente mais alto.
- Card "Notas recentes" (formato lista) por notas recentes.

### Removed

#### Visão geral (Dashboard)

- Removidos, por redundância com os novos cards de indicadores: banner de "tarefa crítica e vencida", bloco "Vencidas e Hoje / Esta Semana / Próximas agendas", bloco antigo "Tarefas abertas por prioridade / Produtividade", faixa "Últimas Notas" e seção "Outros pontos de atenção".
## [1.7.040] - 2026-09-02 00:05

### Renomeação do sistema

- Sistema renomeado de "TYVRA Tasks" para **Taskin** em todas as referências visíveis: título da página, marca na sidebar (logo antigo substituído por marca em texto), nome de arquivo padrão sugerido (`taskin.json`), textos de diálogo e metadados de exportação `.ics`.
- As chaves internas de armazenamento (`localStorage`, `IndexedDB`) foram mantidas intactas de propósito, para não causar perda aparente dos dados já salvos pelos usuários.

### Added

#### General

- Perfil do usuário movido do topo da sidebar para um **avatar circular no canto superior direito**, com avatar genérico (ícone) quando não há foto cadastrada.
- Menu dropdown no avatar com as opções **Perfil**, **Configurações** e **Sair** (aciona a desconexão do arquivo).
- Botão de **notificações** (sino) no topo, ainda sem função — placeholder para funcionalidade futura.

#### Sidebar

- Sidebar agora é **expansível/minimizável**, com botão dedicado em formato de círculo flutuante na borda direita, posicionado logo abaixo do nome do sistema.
- No modo minimizado, a sidebar fica só com ícones; a lista de categorias vira um botão único que abre um popover para seleção.
- Alternador de modo escuro/claro sempre fixado no rodapé da sidebar (`margin-top:auto`), na mesma posição em ambos os modos (expandido e minimizado).
- Cor da sidebar fixada permanentemente no esquema escuro, independente do tema geral do sistema — trocar entre modo claro/escuro agora afeta só o restante da tela.
- Largura útil das telas de Notas aumenta automaticamente quando a sidebar está minimizada, aproveitando o espaço liberado.

#### Notes

- Associação de notas com tarefas, no mesmo padrão já usado no calendário: botão "Vincular tarefa" no composer da nota, e seção "Notas" no painel de edição da tarefa listando as vinculadas.
- Ícone do menu "Notas" substituído por um de documento com linhas de texto (mais parecido com anotações).

#### Calendar

- Colunas de data da visão mensal e semanal destacam sábado e domingo com cor diferenciada.
- Eventos com título longo agora quebram linha em vez de estourar a largura da célula (visão mensal).

### Changed

#### Tasks

- Campos "Prazo e hora" e "Recorrência" ficam na mesma linha, lado a lado, com larguras recalculadas para não sobrepor nem cortar texto.
- Coluna de data/hora dimensionada ao próprio conteúdo; Recorrência cresce para ocupar o espaço restante.
- Altura dos campos de data/hora/recorrência padronizada em 34px, alinhados horizontalmente.
- Campos "Status" e "Prioridade" na mesma linha, com distribuição de largura ajustada para dar mais espaço aos botões de prioridade.
- Removidos os textos "Nenhuma agenda/nota vinculada a esta tarefa" — os campos ficam apenas em branco quando vazios.
- Largura do painel de edição fixada em 500px.

#### Calendar

- Campos de data/hora de Início e Fim do composer de evento recalculados para o contexto mais estreito do modal, corrigindo sobreposição.

#### General

- Botão "Desconectar" removido da barra superior — acessível apenas via "Sair" no menu do avatar.
- Nome do arquivo removido da exibição no topo (status do arquivo continua acessível em Configurações → Arquivo).

### Fixed

#### Notes

- Corrigido bug crítico de **duplicação de notas**: o mecanismo de salvamento de segurança (acionado ao trocar de aba/minimizar/fechar) criava uma nova entrada a cada acionamento para notas ainda não salvas, em vez de atualizar a mesma nota. Corrigido tornando a criação idempotente.
- Corrigido o botão de limpar formatação, que ao processar uma seleção dentro de um único parágrafo reconstruía o bloco inteiro, podendo alterar conteúdo fora da seleção e perder quebras de linha. Corrigido usando o `removeFormat` nativo do navegador para esse caso, preservando o restante do conteúdo intacto.

#### Tasks

- Corrigido bug de CSS em que a coluna de Prioridade parou de esticar até a borda direita do painel por reutilizar, por engano, a mesma classe de outra coluna (Prazo e hora); agora usa uma classe própria.

#### Calendar

- Corrigido o cálculo de largura das colunas da visão mensal (bug de `min-width` do CSS Grid) que fazia colunas ficarem com tamanhos desiguais quando havia conteúdo mais longo.

#### Sidebar

- Corrigido o efeito hover do botão de minimizar/expandir, que clareava em vez de escurecer devido a um efeito colateral da cor fixa escura da sidebar; trocado para `filter: brightness()`, que sempre escurece corretamente.
