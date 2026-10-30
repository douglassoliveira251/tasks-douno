# DOUNO Tasks

Organize no seu ritmo.

DOUNO Tasks é um sistema pessoal de produtividade — tarefas, notas, calendário e um dashboard com indicadores — construído como uma aplicação **single-file HTML/CSS/JS**, sem backend, sem build step e sem dependências externas de servidor. Todos os seus dados ficam com você.

## ✨ Recursos

- **Visão geral** — cinco cards de indicadores (tarefas, notas, eventos hoje, tags mais usadas, itens importantes), gráfico de tarefas por prioridade, feed de atividades recentes, próximos eventos, indicadores gerais (taxa de conclusão, atraso, carga por espaço), notas recentes e tarefas importantes. Sempre mostra os dados de todos os espaços, independente do filtro selecionado.
- **Tarefas** — espaços, tags, prioridade, status, recorrência, subtarefas, comentários, ID único sequencial, filtros e agrupamento configurável (período, status, prioridade, tags, espaço), associação com notas e agendas.
- **Notas** — organizadas em cadernos por espaço (criar, renomear, mover de espaço, excluir, buscar, redimensionar a coluna), editor de texto rico (negrito, itálico, sublinhado, títulos, listas), anexos e colagem direta de imagem, fixar, duplicar, exportar como Markdown ou PDF, mover nota entre cadernos (arrastando ou pelo breadcrumb "Espaço › Caderno"), e associação com tarefas.
- **Calendário** — visões de dia, semana e mês, recorrência de eventos, cor por tag, exportação de convite `.ics`, associação bidirecional com tarefas, fim de semana destacado, densidade de exibição configurável na visão semanal.
- **Espaços** (antes "categorias") — organize tarefas, notas e agendas por espaço, com um seletor rápido no topo das telas de Tarefas, Notas e Calendário.
- **Configurações** — perfil, espaços, tags, personalização (modo escuro/claro, dia de início da semana) e gerenciamento do arquivo de dados.
- **Modo escuro** completo, com a barra lateral sempre no esquema escuro por padrão visual.
- **Barra lateral expansível/minimizável**, com avatar e menu do usuário (Perfil/Configurações/Sair) no topo da tela, e um botão "Sobre" com informações do sistema e versão instalada.

## 💾 Como os dados são salvos

DOUNO Tasks não tem servidor nem banco de dados externo. Os dados ficam num único arquivo `.json` local, salvo através da **File System Access API** (Chrome/Edge), com:

- Reconexão automática ao arquivo entre sessões (via handle salvo no IndexedDB do navegador).
- Fallback para `localStorage` em navegadores sem suporte à File System Access API.
- Autosave com debounce, e commit forçado ao trocar de aba, minimizar ou fechar o navegador.

Nenhum dado é enviado para fora do seu navegador.

## 🚀 Como usar

### Opção 1 — Rodar localmente

O código é feito de módulos ES e é empacotado com [Vite](https://vite.dev). Na raiz do projeto:

```bash
npm install
npm run dev
```

e abra o endereço mostrado (por exemplo `http://localhost:5173/app`). O navegador não carrega módulos a partir de um arquivo aberto direto (`file://`). Para gerar a versão publicada: `npm run build` (saída em `dist/`) e `npm run preview` para vê-la.

Chrome ou Edge são recomendados, para suporte completo à File System Access API.

### Opção 2 — GitHub Pages

1. Suba este repositório no GitHub.
2. Em **Settings → Pages**, selecione a branch e a raiz (`/`) como origem.
3. Acesse a URL gerada pelo GitHub Pages — o `index.html` já é o ponto de entrada.

Na primeira execução, o sistema vai pedir para você criar ou selecionar um arquivo `.json` onde os dados serão salvos.

## 🖥️ Compatibilidade

| Navegador | Suporte                                                |
|-----------|---------------------------------------------------------|
| Chrome / Edge | Completo (File System Access API + reconexão automática) |
| Firefox / Safari | Funcional, com fallback para `localStorage` (sem persistência em arquivo local) |

## 📁 Estrutura do projeto

```
├── index.html       # estrutura da página (HTML) e carregamento dos arquivos abaixo
├── vercel.json      # build (Vite), cache dos arquivos com hash e /app, /app/* → index.html
├── vite.config.mjs  # empacotamento; gera também version.json (versão publicada)
├── assets/css/       # app.css (estilos)
├── assets/js/        # módulos ES por área (NN-area.js); main.js é a entrada; globais.js guarda o estado compartilhado (G)
├── api/              # funções serverless da Vercel (integração com o Outlook)
├── tests/            # testes automatizados (Playwright) — não afeta o deploy
├── CHANGELOG.md      # histórico de versões
└── README.md         # este arquivo
```

## ✅ Testes

Testes de ponta a ponta com [Playwright](https://playwright.dev), cobrindo os fluxos mais sensíveis a regressão (recorrência de tarefas, editor de notas, sincronização com a nuvem). Rodam num `tests/` isolado, com seu próprio `package.json`. Por padrão testam os arquivos-fonte; com `TEST_DIST=1` (depois de `npm run build` na raiz) testam o resultado do build, que é o que vai ao ar.

```bash
cd tests
npm install
npx playwright install chromium   # só na primeira vez
npm test                          # arquivos-fonte
TEST_DIST=1 npm test              # resultado do build (rode npm run build antes)
```

Também rodam automaticamente a cada push/PR na branch `main` (veja `.github/workflows/tests.yml`).

## 🔢 Versionamento

O projeto segue o formato `X.Y.NNN`, onde `NNN` é a soma acumulada de mudanças individuais aplicadas desde `X.Y.000`. Veja o [CHANGELOG.md](./CHANGELOG.md) para o histórico detalhado.

## 📄 Licença

Uso pessoal.
