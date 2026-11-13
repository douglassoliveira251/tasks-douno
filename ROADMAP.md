# Roadmap — DOUNO Tasks

Ideias para avaliar e priorizar. Nada aqui está em desenvolvimento: são pontos para conversar e desenhar (com propostas em imagem) **antes de qualquer implementação**.

Registrado em 10/11/2026. Biblioteca detalhada em 11/11/2026.

## Em avaliação

### Biblioteca (central de recursos)
Um lugar dentro do sistema para guardar o que não é tarefa, nota nem agenda, mas precisa ficar à mão. Todo item tem um **tipo**, e cada tipo tem os seus campos. O item "Biblioteca" já existe no menu, desativado ("em breve").

**Motivo de origem:** os favoritos do navegador do trabalho não sincronizam; a Biblioteca vira os links na nuvem, acessíveis de qualquer lugar. Uso **só pessoal** por enquanto (sem compartilhamento).

#### Decisões já tomadas
- **Layout (escolhido em 11/11, "C" ajustado):** lateral esquerda com Todos os itens, Favoritos, a árvore de **Coleções** e, **fixos no rodapé da coluna**, os **Tipos** (com a contagem da pasta escolhida). À direita, o caminho da coleção e a lista de itens (tipos misturados, cada um com seu ícone; ao escolher um tipo, a lista filtra). Sem chips de tipo sobre a lista. No celular: botão da pasta (abre as coleções, uma pasta por vez) + faixa de tipos acima da lista. Tela de skill: contador de linhas/palavras/caracteres, Copiar, Exportar `.md`, Importar `.md`.
- **Estrutura de pastas ("Coleções"):** até **3 níveis**, **cada espaço com a sua estrutura**, e **um item fica em uma pasta só**.
- **Submenu "Links"** dentro da Biblioteca; os demais tipos entram como outras categorias na mesma coluna.
- **Links:** adicionar rápido (colar o endereço), abrir com um clique, fixar, tags, busca (inclusive na lupa do topo). Sem senhas.
- **Exportar e importar favoritos do navegador** (arquivo de favoritos em HTML, que preserva pastas). O logotipo dos sites só dentro da Biblioteca e só nos sites públicos, como opção (envia o endereço a um serviço externo); sites internos usam uma letra colorida.
- **Skills** (arquivo de texto `.md`): **sem versionamento**. Têm **contador de linhas** (e palavras/caracteres), **importar `.md`**, **exportar `.md`** e **copiar**.
- **Gestão dos templates de tarefa atuais** passa para a Biblioteca, como o tipo "Modelos de tarefa" (separado de "Modelos de texto", para não confundir). O menu "criar tarefa a partir de template" continua na tela de tarefas e lê de lá. Exige migração cuidadosa dos templates existentes.

#### Tipos previstos
| Tipo | Observação |
|---|---|
| Links (e ferramentas/utilitários) | Endereço, título, descrição. É a primeira entrega. |
| Modelos de tarefa | Os templates atuais (nome, subtarefas, agendas, espaço). |
| Skills e prompts | Texto `.md`, contador de linhas, importar/exportar/copiar. |
| Snippets e comandos | Nome, linguagem (PowerShell, SQL, Linux…), código, botão copiar. |
| Modelos de texto | E-mails, atas, relatórios. Texto reaproveitável, com copiar. |
| Referências e conhecimento | Texto mais longo; pode reaproveitar o editor das Notas. |
| Checklists | Lista de itens marcáveis, reutilizável. |
| Leituras, cursos | Tratados como Links com status (lido, progresso), não como tipos separados no início. |
| Documentos e arquivos | Só depois: exige armazenamento, limite de tamanho, custo e backup. |

#### Ordem sugerida
1. Base: **Links**, coleções de até 3 níveis por espaço e o campo "tipo" já preparado.
2. **Modelos de tarefa** (migração dos templates atuais).
3. **Skills, snippets e modelos de texto** (texto, com copiar, importar/exportar `.md`, contador de linhas).
4. **Referências** e **checklists**.
5. **Documentos e arquivos**, quando houver armazenamento.

Cada etapa sai funcionando e testada (computador e celular) antes da próxima.

#### Pontos de atenção
- "Templates" já existe em Configurações (modelos de tarefa): evitar o mesmo nome para os modelos de texto.
- Snippets e comandos costumam acabar com segredos: avisar na tela para não guardar senhas.
- Busca única (lupa do topo) deve achar itens de todos os tipos.
- Celular: tipos como lista ou abas; botão copiar fácil de tocar; coleções navegadas uma pasta por vez, com o caminho no topo.
- Em aberto: como a árvore se comporta com o seletor de espaço em "Todos" (recomendado: espaços como grupos no topo, e criar itens só com um espaço específico escolhido).

### Tela de Foco (e Dashboard de evolução)
Uma tela só com o que está pendente e importa agora, para trabalhar sem distração. Em paralelo, um dashboard separado para acompanhar a evolução.

Pontos a conversar:
- A tela de Foco seria a tela inicial? E a Visão geral atual viraria o dashboard de evolução?
- O que entra no Foco: só o que vence ou retoma hoje, atrasadas, favoritas? Quantas tarefas por vez?
- Modo de trabalho em uma tarefa por vez (abrir, concluir, passar para a próxima), com subtarefas à vista.
- Quais indicadores o dashboard de evolução mostra (concluídas por período, atrasos, projetos, constância)?
- Como fica no celular e no modo escuro.

### Cadastro de pessoas (backlog, 12/11/2026)
Cadastro de pessoas com e-mails e contatos, além de aniversário e datas especiais, para notificar automaticamente.

Pontos a conversar:
- Campos: nome, e-mails, telefones, aniversário, outras datas especiais (casamento, contratação etc.), relação/empresa, observações.
- Notificações: quando avisar (no dia, com antecedência), onde (sino, resumo por e-mail, Foco) e se pode virar agenda ou tarefa automática.
- Ligação com o que já existe: sugerir as pessoas ao convidar para uma agenda (hoje há só o histórico de e-mails) e vincular tarefas/agendas a uma pessoa.
- Se mora na Biblioteca como novo tipo ou em tela própria; privacidade e exportar/importar contatos.

### Canvas de status do projeto (backlog, 13/11/2026)
Um canvas por projeto, no estilo business case, para acompanhar o status: situação geral, riscos, pontos de atenção, decisões e próximos passos.

Pontos a conversar:
- Blocos do canvas (status geral, objetivo, riscos, pontos de atenção, marcos, decisões) e se são editáveis livremente ou fixos.
- Se o status geral (cor/semáforo) é manual ou calculado a partir das tarefas e prazos.
- Histórico de atualizações do status e exportação (PDF/relatório do projeto).
- Ligação com a documentação do projeto (itens da Biblioteca e anotações associados).

## Próximos passos sugeridos
1. Estabilizar as correções em andamento.
2. Biblioteca: avaliar as propostas de layout em imagem (árvore de coleções, tipos, tela de skill) e fechar a primeira entrega (Links).
3. Discutir o Foco com 3 propostas de layout em imagem.
4. Decidir a ordem e o escopo da primeira versão de cada uma.
