/* ===================== NOVIDADES ===================== */
/* Mais recente primeiro. O painel mostra só a primeira entrada. Ao lançar uma
   versão com algo que o usuário percebe, acrescente uma no topo (versão =
   APP_VERSION): é ela que decide se o painel abre sozinho e se a bolinha
   aparece no menu. */
const WHATS_NEW = [
  { version:'1.11.1', date:'30/10/2026', title:'Bastidores reorganizados', text:'O código do sistema foi dividido em vários arquivos para facilitar as próximas melhorias. Nada muda no que você vê.' },
  { version:'1.11.0', date:'30/10/2026', title:'Crie sua conta', text:'Agora dá para criar uma conta direto na tela de entrada: informe nome, e-mail e senha e confirme com o código de 6 dígitos enviado ao seu e-mail.' },
  { version:'1.10.206', date:'30/10/2026', title:'Fim de semana mais marcado', text:'A raia cinza de sábado e domingo no calendário ficou um pouco mais escura, para se destacar melhor dos dias úteis.' },
  { version:'1.10.205', date:'30/10/2026', title:'Semana alinhada', text:'Na Semana, o cabeçalho dos dias e a faixa de dia todo agora ficam alinhados com as colunas da grade de horas. A raia cinza do fim de semana ficou ainda mais suave.' },
  { version:'1.10.204', date:'30/10/2026', title:'Fim de semana cinza também no dia todo', text:'Na Semana, a faixa dos compromissos de dia todo agora também leva a raia cinza no sábado e no domingo.' },
  { version:'1.10.203', date:'30/10/2026', title:'Feriados em azul e fim de semana em cinza', text:'No Mês e na Semana, o dia de feriado ganha uma raia azul clarinha com o nome, e sábado e domingo uma raia cinza suave. O novo botão Camadas, no topo do calendário, liga e desliga os feriados e os facultativos.' },
  { version:'1.10.202', date:'30/10/2026', title:'Feriados nacionais no calendário', text:'O calendário agora mostra os feriados do Brasil no Mês, na Semana e no Dia (dia em vermelho com o nome). Dá para desligar em Configurações > Personalização > Calendário.' },
  { version:'1.10.201', date:'30/10/2026', title:'Novo cadastro de projeto', text:'Ao criar um projeto, o ícone aparece grande na frente do nome, e a cor e o ícone são escolhidos pelos botões redondos ao lado, sem lista de ícones ocupando a tela.' },
  { version:'1.10.200', date:'30/10/2026', title:'Lista de projetos renovada', text:'Cada projeto aparece com o ícone num quadrado na cor dele, a próxima etapa sobre a barra de progresso, a data de entrega e a situação.' },
  { version:'1.10.199', date:'30/10/2026', title:'Tarefas mais práticas', text:'Ao escolher o prazo, o horário já vem às 08:00. A subtarefa concluída vai para o fim da lista e, se desmarcada, volta ao lugar de antes. A descrição cresce conforme você escreve e pode ser esticada à mão. O nome longo do projeto no chip agora é cortado com reticências.' },
  { version:'1.10.198', date:'28/10/2026', title:'Tag nas agendas lado a lado', text:'Na Semana, as agendas que dividem o dia voltam a mostrar a tag abaixo do horário.' },
  { version:'1.10.197', date:'28/10/2026', title:'Horário completo nas agendas lado a lado', text:'Na Semana, quando duas agendas dividem o dia, o horário desce de linha para caber inteiro em vez de ficar cortado.' },
  { version:'1.10.196', date:'28/10/2026', title:'Agendas no mesmo horário lado a lado', text:'Na visão Semana, agendas que se cruzam no horário agora dividem o dia em colunas, em vez de ficarem uma por cima da outra.' },
  { version:'1.10.195', date:'28/10/2026', title:'Tag no lugar do espaço nas agendas', text:'Nas agendas do calendário, o texto destacado ao lado do horário agora é a tag (em tom escuro, sem cor). Na semana, se a tag não couber ao lado do horário, ela desce para a linha de baixo.' },
  { version:'1.10.194', date:'28/10/2026', title:'Dia todo no lugar do horário', text:'Nas agendas de dia inteiro, o título fica em cima e embaixo vem o relógio com "Dia todo" e a categoria ao lado, igual às agendas com horário.' },
  { version:'1.10.193', date:'28/10/2026', title:'Agendas com o mesmo visual em todas as visões', text:'O desenho das agendas do modo Dia (barra colorida, título, relógio com horário e categoria) agora vale também na Semana e no Mês, e a agenda de dia inteiro mostra Dia todo, título e categoria. O texto só se reduz quando falta espaço.' },
  { version:'1.10.192', date:'28/10/2026', title:'Dia inteiro e agendas longas no dia', text:'No modo Dia, a agenda de dia inteiro ganhou três linhas (Dia todo, título e categoria). E nas agendas com horário longas, o título aparece inteiro, encolhendo só quando o bloco é curto.' },
  { version:'1.10.191', date:'27/10/2026', title:'Agenda da visão geral com 5 itens', text:'O cartão Agenda da visão geral agora mostra as 5 próximas agendas dos próximos 7 dias, e uma agenda de vários dias aparece como uma linha só, com a data de início e a de fim.' },
  { version:'1.10.190', date:'27/10/2026', title:'Dia inteiro em barra contínua', text:'Na semana, a agenda de vários dias vira uma barra única atravessando os dias, como no Outlook, com título preto e reticências quando não cabe.' },
  { version:'1.10.189', date:'27/10/2026', title:'Agenda de dia inteiro com o mesmo visual', text:'As agendas de dia inteiro, no topo da semana e no painel do dia, agora usam o mesmo cartão suave com barra colorida das demais agendas.' },
  { version:'1.10.188', date:'27/10/2026', title:'Retornar antes nas tarefas que se repetem', text:'Na janela Repetir da tarefa, a opção Retornar antes (1 semana, 15 dias, 1 mês ou outro prazo) faz a próxima repetição voltar ao Retomar hoje antes do vencimento, para você já começar a tratar.' },
  { version:'1.10.187', date:'27/10/2026', title:'Ajuste na janela Repetir da agenda', text:'O "Avisar antes" da agenda foi retirado, pois o aviso antecipado vai ficar nas tarefas.' },
  { version:'1.10.185', date:'27/10/2026', title:'Agenda de vários dias', text:'Uma agenda que dura vários dias agora aparece em todos os dias do período no calendário, e também em cada repetição quando ela se repete.' },
  { version:'1.10.184', date:'27/10/2026', title:'Linha do tempo sem letra solta', text:'Quando o primeiro ou o último mês aparece só em parte, o cabeçalho da linha do tempo não mostra mais uma letra cortada.' },
  { version:'1.10.183', date:'27/10/2026', title:'Projetos na visão geral', text:'No card Projetos da visão geral, cada projeto ganhou o ícone e a cor dele dentro do anel de progresso, com a próxima etapa e a situação ao lado.' },
  { version:'1.10.182', date:'27/10/2026', title:'Topo do projeto estilo perfil', text:'O topo do projeto ganhou um avatar com anel de progresso e números em linha (etapas, tarefas, atrasadas, vencem em 3 dias e entrega). O Resumo sobe para a altura do topo e a linha do tempo fica logo abaixo, aproveitando melhor a tela.' },
  { version:'1.10.181', date:'27/10/2026', title:'Linha do tempo mais limpa', text:'No modo Ajustar, saíram as faixas de fins de semana e a linha de semanas: ficam só guias discretas no início de cada mês e a linha de hoje. A barra de cada etapa agora mostra o progresso preenchido.' },
  { version:'1.10.180', date:'27/10/2026', title:'Topo do projeto em um só bloco', text:'O cabeçalho do projeto agora é um bloco branco único: ícone, título, descrição, status com progresso e entrega, botões e as abas (Linha do tempo e Lista) juntos.' },
  { version:'1.10.179', date:'27/10/2026', title:'Linha do tempo que cabe na tela', text:'A linha do tempo do projeto agora abre no modo Ajustar: o período inteiro é encolhido para a largura da tela, sem rolagem lateral, com linhas mais compactas. Mês, Semana e Dia continuam disponíveis para ampliar.' },
  { version:'1.10.178', date:'27/10/2026', title:'Linha do tempo com zoom, Hoje e filtros', text:'A linha do tempo ganhou controles: zoom (Dia, Semana, Mês, Trimestre), botões para voltar, avançar e ir para Hoje, e filtros por atrasadas e vencem em breve. O cabeçalho mostra meses e semanas, os fins de semana ficam sombreados e a coluna de hoje fica destacada. A faixa de prioridade segue as cores das tarefas.' },
  { version:'1.10.177', date:'26/10/2026', title:'Linha do tempo com a cor do projeto e alertas de prazo', text:'As barras seguem a cor do projeto: concluída chapada, em andamento listrada e não iniciada em tom claro. Cada tarefa ganha uma faixa de prioridade na lateral e um selo no canto direito quando vence em até 3 dias (laranja) ou está atrasada (vermelho).' },
  { version:'1.10.176', date:'25/10/2026', title:'Busca mais limpa, só com itens abertos', text:'A busca agora mostra só tarefas em aberto. Para ver as concluídas, use "Mostrar concluídas" no rodapé. Os resultados também ficaram mais simples: ícone, título, espaço e data.' },
  { version:'1.10.175', date:'24/10/2026', title:'Agenda dos próximos dias, notificações sem repetição e etapas pela criação', text:'A Visão geral mostra a agenda de hoje e dos próximos 7 dias (com "Ver mais"). As notificações não repetem mais a mesma tarefa em atrasada/hoje e retomar. O PDF do projeto leva o ícone e as etapas passam a contar a data de criação das tarefas na linha do tempo.' },
  { version:'1.10.174', date:'21/10/2026', title:'Tarefas sem prazo aparecem na linha do tempo', text:'Tarefas criadas direto na linha do tempo (sem prazo) agora mostram uma barra listrada do início até hoje, em vez de um pontinho quase invisível. Ao definir o prazo, a barra passa a ir até ele.' },
  { version:'1.10.173', date:'21/10/2026', title:'Início = data de criação, visível na linha do tempo', text:'Toda tarefa nasce com o início na data de criação e a linha do tempo do projeto já desenha o período a partir dela. Você pode ajustar o início quando quiser.' },
  { version:'1.10.172', date:'21/10/2026', title:'Início da tarefa passa a valer na hora', text:'Ao definir o início de uma tarefa, a linha do tempo do projeto atualiza na hora, inclusive quando você escolhe a data de hoje (antes o campo já vinha com hoje e a escolha não era salva).' },
  { version:'1.10.171', date:'21/10/2026', title:'Retomada já vem com a data de hoje', text:'Toda tarefa nova nasce com retomada para hoje, e a próxima ocorrência de uma tarefa recorrente volta com a retomada marcada no dia dela. Assim você acompanha tudo pela visão de retomada.' },
  { version:'1.10.170', date:'21/10/2026', title:'Visão geral e projetos melhores no celular', text:'Os cartões agora usam a largura da tela, a lista de projetos ficou mais limpa, o resumo do projeto vem primeiro e a lista de etapas abre por padrão no celular.' },
  { version:'1.10.169', date:'22/10/2026', title:'Barra do projeto reorganizada', text:'No projeto: botão de voltar redondo, "Nova etapa" e "Nova tarefa" em destaque e o menu "⋮" com Editar projeto e Relatório (PDF, planilha, imprimir). A descrição virou um texto limpo, sem caixa: até duas linhas com "Ver mais", e clicar nela edita.' },
  { version:'1.10.168', date:'21/10/2026', title:'PDF do projeto direto pelo sistema', text:'O botão "Relatório" agora abre um menu: baixar o PDF (gerado pelo próprio sistema, sem imprimir), baixar a planilha CSV ou abrir a versão para imprimir.' },
  { version:'1.10.167', date:'21/10/2026', title:'Cadastro de projeto mais compacto', text:'A cor do projeto agora é uma bolinha: clique nela para escolher na paleta. O formulário foi reorganizado (espaço e datas na mesma linha, ícones em grade compacta e descrição curta) para aproveitar melhor o espaço.' },
  { version:'1.10.166', date:'21/10/2026', title:'Relatório do projeto', text:'No projeto aberto, o botão "Relatório" gera uma página com nome, descrição, resumo, linha do tempo e as tarefas linha a linha de cada etapa, pronta para imprimir, salvar em PDF ou baixar em planilha (CSV) e enviar para alguém.' },
  { version:'1.10.165', date:'21/10/2026', title:'Ícone, cor e descrição no projeto', text:'Cada projeto pode ter um ícone (biblioteca Lucide) e uma cor, mostrados em círculo na lista e no topo do projeto. Há também uma breve descrição editável logo abaixo do nome. Dentro das etapas, as tarefas se organizam sozinhas por data de início.' },
  { version:'1.10.164', date:'21/10/2026', title:'Revisão do celular', text:'Ajustes na versão mobile: painel da tarefa com botão de fechar e campos empilhados, semana do calendário cabendo na tela, título das notas sem corte, lista e linha do tempo de projetos mais legíveis e configurações sem texto espremido.' },
  { version:'1.10.163', date:'21/10/2026', title:'Voltou: nova tarefa direto na etapa', text:'O campo "+ Nova tarefa" voltou ao fim de cada etapa na linha do tempo: digite o nome e Enter para criar. Etapas continuam sendo criadas só pelo botão "+ Etapa" ou pelo "+".' },
  { version:'1.10.162', date:'21/10/2026', title:'Criar tarefa só pelos botões', text:'O campo "+ Nova tarefa" da linha do tempo saiu. Para criar uma tarefa no projeto, use o botão "+ Tarefa" ou "+ Nova tarefa nesta etapa" no resumo.' },
  { version:'1.10.161', date:'21/10/2026', title:'Criar e abrir tarefas direto no projeto', text:'Na linha do tempo do projeto, cada etapa tem um campo "+ Nova tarefa": digite o nome e Enter, sem prazo nem nada mais. Clicar numa tarefa abre o painel dela ali mesmo, sem ir para a tela de Tarefas.' },
  { version:'1.10.160', date:'21/10/2026', title:'Datas da etapa vêm das tarefas', text:'A etapa não tem mais campos de data: ela começa na primeira tarefa e termina no maior prazo das tarefas, e a linha do tempo se ajusta sozinha.' },
  { version:'1.10.159', date:'21/10/2026', title:'Trocar a etapa da tarefa com um clique ou arrastando', text:'Na tarefa, clique no chip do projeto para trocar a etapa ou o projeto sem desvincular. Na linha do tempo do projeto, arraste uma tarefa para outra etapa para movê-la.' },
  { version:'1.10.158', date:'21/10/2026', title:'Resumo com espaço próprio', text:'O Resumo agora tem o seu filtro de espaço, que sempre começa em Todos os espaços e não muda o espaço escolhido nas outras telas (e vice-versa).' },
  { version:'1.10.157', date:'21/10/2026', title:'Menos texto no painel da tarefa', text:'O texto fixo sobre o período da etapa saiu do painel. O aviso agora só aparece, por alguns segundos, quando você digita uma data fora do período.' },
  { version:'1.10.156', date:'21/10/2026', title:'Projetos mais completos e Resumo com espaço', text:'Tarefas de projeto mostram "Projeto > Etapa" na frente e respeitam as datas da etapa. No projeto, clicar numa etapa abre o detalhe dela no resumo (com nova tarefa e editar), o progresso considera as subtarefas e o "+" cria etapas. O Resumo ganhou o seletor de espaço, e as Notas, o rodapé com contagem de palavras.' },
  { version:'1.10.155', date:'21/10/2026', title:'Notas no novo padrão e prazo sem corte', text:'As Notas ganharam cantos arredondados, nota aberta em destaque suave e ações agrupadas. Na tarefa, a data do Prazo não fica mais cortada.' },
  { version:'1.10.154', date:'21/10/2026', title:'Configurações no novo visual', text:'Cada assunto das Configurações virou um cartão, com a navegação em cartão e destaque suave na aba ativa. Mesmas abas e mesmas opções, só mais organizadas.' },
  { version:'1.10.153', date:'21/10/2026', title:'Ajuda no novo visual', text:'O painel de Ajuda ganhou cartões arredondados nas perguntas, título maior e o botão de comentários mais destacado. O conteúdo é o mesmo.' },
  { version:'1.10.152', date:'21/10/2026', title:'Mais telas no novo visual', text:'Projeto, etapa, template e "Enviar comentários" ganharam o novo visual: o template em duas colunas (A tarefa | O que vem junto), projeto e comentários em cartão simples, todos com botão de fechar.' },
  { version:'1.10.151', date:'21/10/2026', title:'Cadastro de agenda renovado', text:'A tela de nova agenda ganhou o novo visual em duas colunas (Quando e Quem), com atalhos de duração (30 min, 1 h, 1 h 30, 2 h). Com o Outlook conectado, o envio do convite já vem ligado em agendas novas.' },
  { version:'1.10.150', date:'20/10/2026', title:'Início da tarefa (opcional)', text:'No painel da tarefa, o link "+ início" ao lado do Prazo permite definir quando a tarefa começa. Sem definir, ela herda o início da etapa do projeto. Na linha do tempo do projeto, a barra agora vai do início ao prazo.' },
  { version:'1.10.149', date:'20/10/2026', title:'Tarefa nova sem prazo', text:'Ao criar uma tarefa, o prazo agora vem em branco. Você define quando quiser (ou usa a Retomada).' },
  { version:'1.10.148', date:'20/10/2026', title:'Aviso de atualização corrigido', text:'O aviso de nova versão não aparecia porque a verificação lia o trecho errado do arquivo. Agora ele detecta e pede para atualizar.' },
  { version:'1.10.147', date:'20/10/2026', title:'Resumo: tarefas sem data', text:'O Resumo agora mostra quantas tarefas abertas estão sem prazo e sem data de retomada, e um cartão "Tarefas sem data" que leva direto para organizá-las.' },
  { version:'1.10.146', date:'20/10/2026', title:'Retomar em vem antes do prazo', text:'No painel da tarefa, o campo Retomar em agora fica à esquerda e o Prazo (entrega) ao lado, já que a retomada é a visão principal.' },
  { version:'1.10.145', date:'20/10/2026', title:'Topo padronizado e Retomada como visão principal', text:'O seletor de espaço passou para antes da busca, e busca, ajuda, notificações e conta ficam no mesmo lugar em todas as telas. Nas tarefas, a visão por Retomada agora é a principal: cada espaço lembra o agrupamento que você escolher.' },
  { version:'1.10.144', date:'20/10/2026', title:'Retomar hoje e rótulo mais claro', text:'O campo Retomar em ganhou a opção Hoje, e o grupo sem data na visão por Retomada agora se chama "Sem data de retomada".' },
  { version:'1.10.143', date:'20/10/2026', title:'Agrupamento fica guardado', text:'O agrupamento escolhido nas tarefas (Retomada, Prazo, Prioridade…) agora fica guardado por espaço, e também para a visão Todos, e continua igual quando você atualiza a página.' },
  { version:'1.10.142', date:'20/10/2026', title:'Aviso de atualização automática', text:'Quando sair uma versão nova, o sistema avisa na tela e pede para atualizar, salvando antes o que você estava fazendo. Assim ninguém fica usando uma versão antiga sem perceber. Na visão agrupada por Retomada, os grupos agora seguem os mesmos períodos da visão por prazo.' },
  { version:'1.10.141', date:'20/10/2026', title:'Calendário: visão Dia renovada', text:'O Dia agora é uma grade por hora, com as agendas em blocos (lado a lado quando se sobrepõem) e a linha do horário atual. À direita ficam o resumo, as agendas de dia inteiro e as tarefas do dia. Também: "Gerenciar templates" passou para dentro do grupo Template, no menu da tarefa, e a visão agrupada por Retomada ficou mais limpa.' },
  { version:'1.10.140', date:'20/10/2026', title:'Projetos mais claros', text:'A lista de projetos ganhou uma mini linha do tempo, e no detalhe as tarefas aparecem dentro de cada etapa (dá para recolher), com um resumo e as próximas tarefas ao lado.' },
  { version:'1.10.139', date:'20/10/2026', title:'Semana com mini-calendário e agenda do dia', text:'A visão de semana ganhou, à esquerda, um mini-calendário (clique num dia para ir até ele) e a lista de Hoje e Amanhã. Os blocos ficaram mais suaves e há uma linha vermelha no horário atual.' },
  { version:'1.10.138', date:'20/10/2026', title:'Calendário do mês com painel do dia', text:'O mês ficou mais limpo e, ao clicar num dia, um painel ao lado mostra as agendas e tarefas dele, com o botão para adicionar. Para criar direto pela grade, dê dois cliques no dia.' },
  { version:'1.10.137', date:'20/10/2026', title:'Retomar em com lista de opções', text:'Agora o campo Retomar em é uma lista: Amanhã, 3, 7 ou 15 dias, ou uma data personalizada. Cada opção mostra a data resultante.' },
  { version:'1.10.136', date:'20/10/2026', title:'Tarefas no novo visual', text:'Lista com cartões arredondados e painel de edição flutuante: Prazo e Retomar em lado a lado, status e recorrência, prioridade em botões, e campos em caixas suaves. Os fluxos continuam os mesmos.' },
  { version:'1.10.135', date:'20/10/2026', title:'Título menor', text:'O título no topo das páginas ficou mais discreto (de 32 para 26 px), mais proporcional ao resto da tela.' },
  { version:'1.10.134', date:'19/10/2026', title:'Mesma fonte do Finance', text:'O sistema agora usa a Open Sans, a mesma fonte do Finance DOUNO, hospedada junto do app (mais rápida e sem depender de serviços externos).' },
  { version:'1.10.133', date:'19/10/2026', title:'Título no topo, como no Finance', text:'O cartão com o título da página saiu: o título agora fica solto no topo, grande, com a busca, o espaço e a conta à direita. A Visão geral abre com a saudação "Bom dia, Nome".' },
  { version:'1.10.132', date:'19/10/2026', title:'Novo Resumo e modo escuro azul-petróleo', text:'A Visão geral foi redesenhada: o que importa hoje em destaque, próximos prazos, um cartão por espaço, projetos, retomadas e agenda. O modo escuro ganhou um tom azul-petróleo, com mais personalidade e a mesma identidade do menu.' },
  { version:'1.10.131', date:'19/10/2026', title:'Retomar em', text:'Cada tarefa pode ter uma data para voltar a olhar, separada do prazo. Aparece como etiqueta laranja na lista, no sino e em "Agrupar por: Retomada". O prazo continua sendo o que conta para atraso.' },
  { version:'1.10.130', date:'19/10/2026', title:'Projeto na tarefa, só quando precisa', text:'O seletor de projeto saiu do topo da tarefa. Para ligar a um projeto use o menu ⋮ → Vincular a um projeto; a tarefa mostra uma etiqueta pequena com o projeto e a etapa. Criando pela página do projeto, já vem ligada.' },
  { version:'1.10.129', date:'19/10/2026', title:'Rascunho do comentário mais seguro', text:'Trocar de aba ou minimizar não envia mais o comentário sozinho: ele fica como rascunho, e continua lá mesmo se você recarregar a página.' },
  { version:'1.10.128', date:'15/10/2026', title:'Comentário não se perde mais', text:'O texto do comentário é mantido enquanto você preenche outros campos da tarefa. Se tentar fechar a tarefa com um comentário não enviado, o sistema pergunta se quer enviar, descartar ou voltar.' },
  { version:'1.10.127', date:'15/10/2026', title:'Pesquisa redesenhada', text:'Resultados em lista compacta, com abas (Tudo, Tarefas, Notas, Agenda), o termo destacado e o contexto de cada item (espaço, projeto, status, data). Dá para navegar com as setas e abrir com Enter.' },
  { version:'1.10.126', date:'15/10/2026', title:'Tags por espaço nos templates e na agenda', text:'No template, só aparecem as tags dos espaços escolhidos (e as gerais). Na agenda, as tags já existentes agora saem com um clique, e as mudanças só valem ao salvar — e atualizam as cores no calendário.' },
  { version:'1.10.125', date:'13/10/2026', title:'Espaço e agendas na tarefa', text:'Na edição da tarefa, o espaço virou um nome clicável na mesma linha das tags (clique para trocar). As agendas que já passaram ficam ocultas, com "Mostrar anteriores" para vê-las.' },
  { version:'1.10.124', date:'13/10/2026', title:'Menu ⋮ no painel da tarefa', text:'O painel da tarefa ganhou um menu "⋮": usar template, salvar como template, gerenciar templates, duplicar, mover de espaço e excluir. Os ícones soltos saíram.' },
  { version:'1.10.123', date:'13/10/2026', title:'Templates por espaço', text:'Cada template agora é ligado a um ou mais espaços e só aparece neles. O espaço selecionado no momento decide quais templates você vê.' },
  { version:'1.10.122', date:'13/10/2026', title:'Projetos em lista', text:'A página Projetos agora é uma lista em tabela: progresso, etapa atual, entrega e status de cada projeto, com filtros por situação.' },
  { version:'1.10.121', date:'13/10/2026', title:'Projetos', text:'Nova página Projetos: crie projetos com etapas e prazos, veja a linha do tempo com progresso e atrasos, e ligue tarefas às etapas. Tarefas de projeto aparecem nas Tarefas com a etiqueta do projeto e podem ser filtradas.' },
  { version:'1.10.120', date:'13/10/2026', title:'Template ao criar tarefa', text:'No painel de Nova tarefa agora há "Começar de um template": escolha um e a tarefa nasce já preenchida.' },
  { version:'1.10.119', date:'13/10/2026', title:'Templates e comentários', text:'Crie templates de tarefa (descrição, subtarefas, tags, repetição e agendas) em Configurações → Templates e use pelo botão "Template" nas Tarefas. Na Ajuda (?), o botão "Enviar comentários" leva seu 👍 ou 👎 direto para nós.' },
  { version:'1.10.118', date:'13/10/2026', title:'Calendário a partir das 7h', text:'A visão da semana sempre abre mostrando a partir das 7h, sem precisar rolar a madrugada.' },
  { version:'1.10.117', date:'13/10/2026', title:'Várias abas sem perder alterações', text:'Se você usa o sistema em dois navegadores, o que foi alterado num não desfaz mais o que foi feito no outro: as mudanças das duas abas são combinadas ao salvar.' },
  { version:'1.10.116', date:'07/10/2026', title:'Espaço na barra do topo', text:'No computador, o seletor de espaço agora fica na barra do topo, à esquerda do botão de ajuda (?), com o rótulo "Espaço" e a bolinha na cor do espaço escolhido. No celular continua no cartão do título.' },
  { version:'1.10.114', date:'07/10/2026', title:'Espaço no cartão do título', text:'O seletor de espaço mudou para a direita do cartão do título de cada página, igual ao celular. O título e a contagem ficam sozinhos à esquerda.' },
  { version:'1.10.113', date:'07/10/2026', title:'Histórico de e-mails e baixar anexos', text:'No campo "Para" da agenda, os e-mails já usados aparecem enquanto você digita, e o "×" tira um da lista. Nos anexos da tarefa há agora um botão para baixar o arquivo.' },
  { version:'1.10.112', date:'07/10/2026', title:'Tarefas por horário', text:'Dentro de cada grupo, as tarefas agora ficam em ordem de horário, da mais cedo para a mais tarde. Tarefas sem hora vão para o fim do dia.' },
  { version:'1.10.111', date:'07/10/2026', title:'Convites e categorias no Outlook', text:'A agenda ganhou o campo "Para": informe e-mails e ligue "Enviar convite pelo Outlook" para o convite sair ao salvar. As categorias no Outlook agora seguem as tags da agenda. O resumo por e-mail também ganhou um visual novo, claro e por espaço.' },
  { version:'1.10.110', date:'07/10/2026', title:'Agendas recorrentes e notificações por espaço', text:'As agendas que se repetem (todo dia, semana, mês ou ano) agora aparecem em todas as datas no calendário, na Visão geral e nas notificações. O sino mostra só o espaço selecionado. O resumo por e-mail ficou em dois blocos e separado por espaço.' },
  { version:'1.10.109', date:'06/10/2026', title:'Novidades acumuladas', text:'Ficou um tempo sem entrar? Agora o painel mostra a novidade mais recente em destaque e, logo abaixo, as que saíram desde a sua última visita.' },
  { version:'1.10.108', date:'06/10/2026', title:'Histórico de novidades', text:'No painel de Novidades, o link "Ver histórico completo" mostra todas as versões anteriores, da mais recente para a mais antiga.' },
  { version:'1.10.107', date:'06/10/2026', title:'Celular: títulos e notas', text:'O cabeçalho das páginas ficou numa linha só, como na Visão geral. Em Notas, a nota ocupa a tela e os cadernos abrem numa gaveta pelo botão do topo; o botão de expandir esconde o cabeçalho para ler e escrever com mais espaço.' },
  { version:'1.10.106', date:'06/10/2026', title:'Calendário no modo Dia', text:'Títulos, tags e categorias longos não empurram mais o conteúdo para fora do quadro. No celular, horário e categoria ficam numa linha e o título embaixo, inteiro.' },
  { version:'1.10.105', date:'06/10/2026', title:'Lista de tarefas mais limpa', text:'O número da tarefa saiu da lista e do painel. No celular, o nome ganha a linha toda e os detalhes ficam numa linha menor embaixo.' },
  { version:'1.10.104', date:'06/10/2026', title:'Fundo com degradê', text:'Um brilho azul no topo de todas as telas, nos modos claro e escuro, que some suavemente conforme você desce.' },
  { version:'1.10.103', date:'06/10/2026', title:'Visual em azul', text:'O verde da interface virou azul: logo, botões, menus e destaques. Prioridades, tags e status continuam com as mesmas cores.' },
  { version:'1.10.102', date:'05/10/2026', title:'Painel de novidades', text:'Este painel. Abre sozinho quando sai uma versão com mudanças e fica sempre à mão no menu da sua conta, em Novidades.' },
  { version:'1.10.101', date:'05/10/2026', title:'Banco de dados próprio', text:'O DOUNO Tasks agora roda num projeto separado, só dele. Seus dados foram importados e o Outlook, reconectado.' },
  { version:'1.10.100', date:'05/10/2026', title:'Backup dos seus dados', text:'Em Configurações → Arquivo você baixa uma cópia de tudo e importa depois, se precisar.' },
  { version:'1.10.099', date:'02/10/2026', title:'Edição mais segura', text:'Ao entrar numa tela e começar a editar rápido, o app não apaga mais o que você acabou de digitar.' },
  { version:'1.10.097', date:'01/10/2026', title:'Modo escuro renovado', text:'Fundo quase preto e cards com mais contraste.' },
  { version:'1.10.095', date:'01/10/2026', title:'Anexos nas tarefas', text:'Anexe arquivos direto na tarefa, na seção Anexos (até 4 MB cada). Imagens mostram miniatura.' },
  { version:'1.10.094', date:'01/10/2026', title:'Outlook mais estável', text:'A conexão fica guardada no servidor: não desconecta ao trocar de endereço e renova sozinha.' },
  { version:'1.10.089', date:'30/09/2026', title:'Agenda no Outlook', text:'As agendas viram eventos de verdade no seu Outlook, editáveis e com categoria. Conecte em Configurações → Integrações.' },
  { version:'1.10.088', date:'30/09/2026', title:'Sino de notificações', text:'Mostra tarefas atrasadas, as de hoje e a agenda do dia, com contador.' },
  { version:'1.10.086', date:'30/09/2026', title:'Link de calendário', text:'Assine sua agenda em outros calendários, como o Google Agenda, por um link em Configurações → Integrações.' },
  { version:'1.10.085', date:'30/09/2026', title:'Recorrência corrigida', text:'A próxima tarefa repetida sempre segue o "A partir de", mesmo que você conclua atrasado ou mude o prazo.' },
];
const WHATS_NEW_SEEN_KEY = 'dounoSeenVersion';
function compareVersions(a, b){
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for(let i = 0; i < 3; i++){
    const d = (pa[i] || 0) - (pb[i] || 0);
    if(d) return d;
  }
  return 0;
}
function getSeenVersion(){ try{ return localStorage.getItem(WHATS_NEW_SEEN_KEY); }catch(e){ return null; } }
function setSeenVersion(v){ try{ localStorage.setItem(WHATS_NEW_SEEN_KEY, v); }catch(e){} }
function hasUnseenWhatsNew(){
  const seen = getSeenVersion();
  return !seen || compareVersions(WHATS_NEW[0].version, seen) > 0;
}
function updateWhatsNewDot(){
  const dot = document.getElementById('whatsNewDot');
  if(dot) dot.style.display = hasUnseenWhatsNew() ? 'inline-block' : 'none';
}
const WHATS_NEW_CLOSE_BTN = `
    <button type="button" id="whatsNewCloseBtn" class="about-close-btn" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>`;
// novidades acumuladas desde a última visita (sem a mais recente, que fica em destaque)
let whatsNewPending = [];
function computePendingWhatsNew(){
  const seen = getSeenVersion();
  if(!seen) return [];
  return WHATS_NEW.slice(1).filter(w => compareVersions(w.version, seen) > 0);
}
function openWhatsNew(keepPending){
  const n = WHATS_NEW[0];
  if(keepPending !== true) whatsNewPending = computePendingWhatsNew();
  const body = document.getElementById('whatsNewModalBody');
  body.classList.remove('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <div class="whatsnew-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/></svg>
    </div>
    <div class="whatsnew-eyebrow">Novidade</div>
    <h3 class="whatsnew-title">${escapeHtml(n.title)}</h3>
    <p class="whatsnew-text">${escapeHtml(n.text)}</p>
    ${whatsNewPending.length ? `
      <div class="whatsnew-prev">
        <div class="whatsnew-prev-label">Também desde sua última visita</div>
        <ul class="whatsnew-prev-list">
          ${whatsNewPending.map(w => `<li>
            <div class="whatsnew-prev-item-meta">v${w.version} · ${w.date}</div>
            <div class="whatsnew-prev-item-title">${escapeHtml(w.title)}</div>
            <p class="whatsnew-prev-item-text">${escapeHtml(w.text)}</p>
          </li>`).join('')}
        </ul>
      </div>` : ''}
    ${WHATS_NEW.length > 1 ? `<button type="button" class="whatsnew-history-link" id="whatsNewHistoryBtn">Ver histórico completo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg></button>` : ''}
    <div class="whatsnew-foot">
      <span class="whatsnew-version">v${n.version} · ${n.date}</span>
      <button type="button" class="btn whatsnew-ok" id="whatsNewOkBtn">Entendi</button>
    </div>
  `;
  document.getElementById('whatsNewOverlay').classList.add('show');
  body.querySelector('#whatsNewCloseBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewOkBtn').onclick = closeWhatsNew;
  const histBtn = body.querySelector('#whatsNewHistoryBtn');
  if(histBtn) histBtn.onclick = openWhatsNewHistory;
  setSeenVersion(n.version);
  updateWhatsNewDot();
}
function openWhatsNewHistory(){
  const body = document.getElementById('whatsNewModalBody');
  body.classList.add('is-history');
  body.innerHTML = WHATS_NEW_CLOSE_BTN + `
    <button type="button" class="whatsnew-back" id="whatsNewBackBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg> Voltar
    </button>
    <div class="whatsnew-eyebrow">Histórico</div>
    <h3 class="whatsnew-title">Todas as novidades</h3>
    <ul class="whatsnew-list">
      ${WHATS_NEW.map((w, i) => `
        <li class="whatsnew-item${i === 0 ? ' is-latest' : ''}">
          <div class="whatsnew-item-meta">v${w.version} · ${w.date}</div>
          <div class="whatsnew-item-title">${escapeHtml(w.title)}</div>
          <p class="whatsnew-item-text">${escapeHtml(w.text)}</p>
        </li>`).join('')}
    </ul>
    <div class="whatsnew-foot" style="justify-content:flex-end;">
      <button type="button" class="btn whatsnew-ok" id="whatsNewOkBtn">Fechar</button>
    </div>
  `;
  body.querySelector('#whatsNewCloseBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewOkBtn').onclick = closeWhatsNew;
  body.querySelector('#whatsNewBackBtn').onclick = () => openWhatsNew(true);
}
function closeWhatsNew(){
  document.getElementById('whatsNewOverlay').classList.remove('show');
}
let whatsNewOverlayMouseDownOnBackdrop = false;
document.getElementById('whatsNewOverlay').addEventListener('mousedown', e => {
  whatsNewOverlayMouseDownOnBackdrop = (e.target.id === 'whatsNewOverlay');
});
document.getElementById('whatsNewOverlay').addEventListener('click', e => {
  if(e.target.id === 'whatsNewOverlay' && whatsNewOverlayMouseDownOnBackdrop) closeWhatsNew();
});
document.getElementById('avatarMenuWhatsNewBtn').onclick = () => {
  document.getElementById('avatarDropdownMenu').style.display = 'none';
  openWhatsNew();
};
/* Abre sozinho uma vez por versão, só quando o app já está utilizável (fora
   das telas de login e de vínculo de arquivo). */
let whatsNewChecked = false;
let appUnlocked = false; // vira true quando sai a tela de login (ou de vínculo de arquivo)
function maybeShowWhatsNew(){
  if(whatsNewChecked || !appUnlocked) return;
  if(document.getElementById('loginOverlay').classList.contains('show')) return;
  if(document.getElementById('linkOverlay').classList.contains('show')) return;
  whatsNewChecked = true;
  if(hasUnseenWhatsNew()) openWhatsNew();
}

document.getElementById('toggleThemeBtn').onclick = toggleTheme;

const PAGE_HEADER_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h10M3 12h14M3 19h8"/><circle cx="17" cy="5" r="2"/><circle cx="15" cy="19" r="2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
};
function renderPageHeaderMeta(){
  const statsEl = document.getElementById('pageHeaderStats');
  let stats = null;
  if(currentView === 'tasks'){
    const scope = state.tasks.filter(t => !activeCategoryFilter || t.categoryId === activeCategoryFilter);
    const pending = scope.filter(t => !t.done).length;
    const overdue = scope.filter(t => isOverdue(t.dueDate, t.done)).length;
    const doneToday = scope.filter(t => t.completedAt && dateToStr(new Date(t.completedAt)) === todayStr()).length;
    stats = [
      { n: pending, label: pending === 1 ? 'pendente' : 'pendentes' },
      { n: overdue, label: overdue === 1 ? 'vencida' : 'vencidas' },
      { n: doneToday, label: doneToday === 1 ? 'concluída hoje' : 'concluídas hoje' },
    ];
  } else if(currentView === 'notes'){
    const scope = state.notes.filter(n => !n.archived && (!activeCategoryFilter || n.categoryId === activeCategoryFilter));
    const updatedToday = scope.filter(n => n.updatedAt && dateToStr(new Date(n.updatedAt)) === todayStr()).length;
    stats = [
      { n: scope.length, label: scope.length === 1 ? 'nota' : 'notas' },
      { n: updatedToday, label: updatedToday === 1 ? 'atualizada hoje' : 'atualizadas hoje' },
    ];
  } else if(currentView === 'projects'){
    const list = projectsInScope();
    const late = list.filter(p => projectStatus(p).late).length;
    stats = [
      { n: list.length, label: list.length === 1 ? 'projeto' : 'projetos' },
      { n: late, label: late === 1 ? 'com atraso' : 'com atraso' },
    ];
  } else if(currentView === 'calendar'){
    const todayCount = getEventsForDate(todayStr()).length;
    const total = eventsInScope().length;
    stats = [
      { n: todayCount, label: todayCount === 1 ? 'agenda hoje' : 'agendas hoje' },
      { n: total, label: total === 1 ? 'agenda no total' : 'agendas no total' },
    ];
  }
  if(stats){
    statsEl.innerHTML = stats.map(s => `<div class="page-header-stat"><b>${s.n}</b> ${s.label}</div>`).join('');
    statsEl.style.display = 'flex';
  } else {
    statsEl.style.display = 'none';
  }
}

const HELP_CONTENT = {
  dashboard: [
    { q: 'O que esse painel mostra?', a: 'Um resumo do que está em aberto: tarefas pendentes, notas recentes, eventos do dia e indicadores gerais de conclusão.' },
    { q: 'Os números somem quando eu concluo uma tarefa?', a: 'Sim — os cards contam só o que está em aberto. Tarefas concluídas continuam no histórico, só saem da contagem.' },
  ],
  tasks: [
    { q: 'Como crio uma tarefa recorrente?', a: 'Ao criar ou editar uma tarefa, abra o campo Recorrência e escolha a frequência. Dá pra definir uma data final pra repetição parar.' },
    { q: 'Como agrupo as tarefas por outro critério?', a: 'Use o seletor "Agrupar por" no topo da lista pra trocar entre período, prioridade, tag ou espaço.' },
    { q: 'Para onde vão as tarefas concluídas?', a: 'Ficam ocultas por padrão. Ative "Mostrar concluídas" no canto superior direito da lista pra vê-las.' },
  ],
  notes: [
    { q: 'Posso organizar notas em cadernos?', a: 'Sim, cada espaço tem seus próprios cadernos. Crie um novo caderno pela lista de notas pra agrupar por assunto.' },
    { q: 'As notas têm formatação?', a: 'Sim, o editor aceita negrito, listas, títulos e outros elementos básicos de texto rico.' },
  ],
  calendar: [
    { q: 'Vincular uma agenda a uma tarefa muda a data da agenda?', a: 'Não quando a agenda já existia antes: a data que você definiu no calendário é mantida. Só quando a agenda nasce a partir de uma tarefa (pelo botão "criar agenda" nas tarefas) é que a data vem da tarefa.' },
    { q: 'Como duplico uma agenda para outro dia?', a: 'Abra a agenda existente e use o botão "Duplicar" — ele cria uma cópia na mesma data, já pronta pra você trocar a data no formulário.' },
  ],
  settings: [
    { q: 'Onde ficam meus dados?', a: 'Modo local: só no seu dispositivo, num arquivo que você escolhe. Modo nuvem: sincronizados com sua conta, acessíveis de qualquer aparelho logado.' },
  ],
};
function renderHelpPanelContent(){
  const items = HELP_CONTENT[currentView] || HELP_CONTENT.dashboard;
  document.getElementById('helpPanelBody').innerHTML = items.map((item, i) => `
    <div class="help-item${i === 0 ? ' open' : ''}">
      <button type="button" class="help-item-q">
        ${escapeHtml(item.q)}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="help-item-a">${escapeHtml(item.a)}</div>
    </div>
  `).join('');
  document.getElementById('helpPanelBody').querySelectorAll('.help-item-q').forEach(btn => {
    btn.onclick = () => btn.closest('.help-item').classList.toggle('open');
  });
}
function openHelpPanel(){
  document.getElementById('helpPanelVersion').textContent = APP_VERSION;
  renderHelpPanelContent();
  document.getElementById('helpPanel').classList.add('show');
  document.getElementById('helpPanelBackdrop').classList.add('show');
  document.getElementById('primaryAddBtn').classList.add('help-open');
}
function closeHelpPanel(){
  document.getElementById('helpPanel').classList.remove('show');
  document.getElementById('helpPanelBackdrop').classList.remove('show');
  document.getElementById('primaryAddBtn').classList.remove('help-open');
}
document.getElementById('helpBtn').onclick = openHelpPanel;
document.getElementById('saveErrorBadge').onclick = () => { if(cloudSession) triggerCloudWrite(); };
document.getElementById('helpCloseBtn').onclick = closeHelpPanel;
document.getElementById('helpPanelBackdrop').onclick = closeHelpPanel;

function normalizeState(){
  if(!state.profile) state.profile = { name:'', email:'', avatar:null };
  if(!state.tags) state.tags = [];
  if(!Array.isArray(state.emailHistory)) state.emailHistory = [];
  if(!Array.isArray(state.taskTemplates)) state.taskTemplates = [];
  if(!Array.isArray(state.projects)) state.projects = [];
  state.projects.forEach(p => { if(!Array.isArray(p.stages)) p.stages = []; });
  if(!state.tasks) state.tasks = [];
  if(!state.notes) state.notes = [];
  if(!state.events) state.events = [];
  state.events.forEach(ev => {
    if(ev.tagIds === undefined) ev.tagIds = [];
    if(ev.allDay === undefined) ev.allDay = !ev.startTime;
    if(ev.recurrence === undefined) ev.recurrence = 'none';
    if(ev.recurrenceInterval === undefined) ev.recurrenceInterval = 1;
    if(ev.recurrenceBaseDate === undefined) ev.recurrenceBaseDate = ev.date || null;
    if(ev.recurrenceEndDate === undefined) ev.recurrenceEndDate = null;
    if(ev.linkedTaskId === undefined) ev.linkedTaskId = null;
    if(ev.endDate === undefined) ev.endDate = ev.date || null;
    if(ev.updatedAt === undefined) ev.updatedAt = ev.createdAt || null;
    if(ev.description === undefined) ev.description = '';
    if(ev.outlookEventId === undefined) ev.outlookEventId = null;
  });
  if(!state.uiGroupCollapse) state.uiGroupCollapse = {};
  if(state.defaultCategoryFilter === undefined) state.defaultCategoryFilter = null;
  if(!state.categoryOrder) state.categoryOrder = 'creation';
  if(!state.categoryGroupModes) state.categoryGroupModes = {};
  lastGroupModeKey = null; // dados novos carregados: reaplica o agrupamento guardado no próximo render
  if(!state.categoryCalendarViews) state.categoryCalendarViews = {};
  if(!state.theme) state.theme = 'light';
  if(!state.calendarHourDensity) state.calendarHourDensity = 'normal';
  if(!state.calendarViewDefault) state.calendarViewDefault = 'month';
  if(state.weekStartDay === undefined) state.weekStartDay = 0;
  if(!Array.isArray(state.notebooks)) state.notebooks = [];
  if(!state.lastActiveNoteBySpace || typeof state.lastActiveNoteBySpace !== 'object') state.lastActiveNoteBySpace = {};
  state.categories.forEach(cat => {
    const hasNotebook = state.notebooks.some(nb => nb.categoryId === cat.id);
    const hasNotes = state.notes.some(n => n.categoryId === cat.id);
    if(!hasNotebook && hasNotes){
      const nb = { id: uid('nb'), name: 'Notas', categoryId: cat.id, createdAt: Date.now() };
      state.notebooks.push(nb);
      state.notes.forEach(n => { if(n.categoryId === cat.id && !n.notebookId) n.notebookId = nb.id; });
    }
  });
  state.notes.forEach(n => {
    if(n.notebookId === undefined) n.notebookId = null;
    if(n.notebookId){
      const nb = state.notebooks.find(x => x.id === n.notebookId);
      if(!nb || nb.categoryId !== n.categoryId) n.notebookId = null;
    }
    if(!n.notebookId){
      let nb = state.notebooks.find(x => x.categoryId === n.categoryId);
      if(!nb){
        nb = { id: uid('nb'), name: 'Notas', categoryId: n.categoryId, createdAt: Date.now() };
        state.notebooks.push(nb);
      }
      n.notebookId = nb.id;
    }
  });
  if(!state.tagOrder) state.tagOrder = 'creation';
  if(state.showCompletedTasks === undefined) state.showCompletedTasks = false;
  if(!state.notebooksColWidth) state.notebooksColWidth = 260;
  state.tags.forEach(tg => { if(tg.categoryId === undefined) tg.categoryId = null; });
  state.notes.forEach(n => {
    if(n.attachments === undefined) n.attachments = [];
    if(n.tagIds === undefined) n.tagIds = [];
    if(n.linkedTaskId === undefined) n.linkedTaskId = null;
    if(n.pinnedAt === undefined) n.pinnedAt = n.pinned ? (n.updatedAt || Date.now()) : null;
  });
  state.tasks.forEach(t => {
    if(t.description === undefined) t.description = '';
    if(t.dueTime === undefined) t.dueTime = null;
    if(t.tagIds === undefined) t.tagIds = [];
    if(t.recurrence === undefined) t.recurrence = 'none';
    if(t.subtasks === undefined) t.subtasks = [];
    if(t.comments === undefined) t.comments = [];
    if(t.attachments === undefined) t.attachments = [];
    if(t.status === undefined) t.status = t.done ? 'concluida' : 'nao_iniciado';
    if(t.pinnedAt === undefined) t.pinnedAt = t.pinned ? Date.now() : null;
    if(t.completedAt === undefined) t.completedAt = t.done ? (t.updatedAt || t.createdAt || null) : null;
    if(t.recurrenceInterval === undefined) t.recurrenceInterval = 1;
    if(t.recurrenceTime === undefined) t.recurrenceTime = (t.recurrence && t.recurrence !== 'none') ? (t.dueTime || null) : null;
    if(t.recurrenceBaseDate === undefined) t.recurrenceBaseDate = (t.recurrence && t.recurrence !== 'none') ? (t.dueDate || null) : null;
    if(t.recurrenceEndDate === undefined) t.recurrenceEndDate = null;
    if(t.remindBefore === undefined) t.remindBefore = 0;
  });
  if(state.taskIdCounter === undefined) state.taskIdCounter = 0;
  state.tasks.forEach(t => { if(t.shortId && /^t\d+$/.test(t.shortId)) t.shortId = t.shortId.slice(1); });
  const tasksNeedingId = state.tasks.filter(t => !t.shortId).sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
  tasksNeedingId.forEach(t => {
    state.taskIdCounter++;
    t.shortId = String(state.taskIdCounter).padStart(4, '0');
  });
}

