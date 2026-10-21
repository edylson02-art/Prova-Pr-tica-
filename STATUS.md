# Status da entrega

**Nome:** Edilson Santos
**Tempo total gasto (aprox.):** ~1h40 (das 19:44 às 21:20)

Trabalhei com o Claude Code. O histórico da sessão está em [`sessoes/`](sessoes/).

## Ordem em que trabalhei

Antes de mexer em código, fiz uma **auditoria do projeto inteiro**: rodei cada comando do README, reproduzi cada chamado e testei hipóteses no banco em memória. Depois **ataquei a correção que eu ia propor para a Tarefa 3**, para achar furos antes de escrever o código. Mandei quatro dúvidas pelo WhatsApp e a resposta foi que a decisão era minha. As decisões estão registradas em cada PR.

Ordem: **3 → 2 → 1 → 5 → 4**.

1. **Tarefa 3**: vazamento de dados entre clientes é o problema mais grave. Além de ler, qualquer pessoa conseguia criar, alterar e apagar tarefas de outras empresas.
2. **Tarefa 2**: número financeiro errado, que afeta decisões.
3. **Tarefa 1**: a tela principal abria vazia.
4. **Tarefa 5**: rápida, mas escondia um risco de segurança (fórmula executada no Excel).
5. **Tarefa 4**: a maior (API externa, comando novo, coluna na tela). Ficou por último também porque mexe na mesma tabela do `App.jsx` que a 5.

Cada tarefa tem uma branch saindo da `main` e um PR aberto. No fim, juntei as cinco numa branch temporária (já apagada) para garantir que **se juntam sem conflito e todos os testes passam juntos**.

## Tarefa 1 — Tela de tarefas

- **Situação:** pronta.
- **Qual era o problema:** dois erros em `listarTarefas`:
  - **Não descia a árvore.** Filtrava `empresa_id === empresaId`, e o Grupo Aurora não tem tarefas diretas, então a tela abria vazia. O parâmetro `empresas` era recebido e nunca usado.
  - **Excluía as duas pontas do período.** Usava `>` e `<`, então sumiam as tarefas criadas no primeiro **e** no último dia do filtro.
- **Como provei que funciona:**
  - 15 testes de `listarTarefas` cobrindo cada empresa, mais de um nível de árvore, árvore com ciclo, as duas pontas, período de um dia e datas vazias.
  - 1 teste que renderiza a tela real: ela abre com 13 tarefas do grupo e sem a Outra Empresa.
  - Com o código da `main`, 10 dos 16 falham.
- **PR:** [#3](https://github.com/edylson02-art/Prova-Pr-tica-/pull/3)

## Tarefa 2 — Relatório de vendas

- **Situação:** pronta.
- **Qual era o problema:** três erros somados:
  - **Dia em UTC.** O dia era calculado com `slice(0, 10)` sobre o horário em UTC, então vendas das 21h às 23h59 de Brasília caíam no dia seguinte.
  - **Vendas repetidas.** A sincronização repete vendas (V-0992, V-0994, V-0997), e elas eram somadas duas vezes.
  - **Ticket médio errado.** Dividia por todas as vendas do dia, incluindo canceladas e repetidas.
- **Como provei que funciona:**
  - `npm run relatorio -- 2026-10-01` → **R$ 3.400,50**, que bate com o financeiro. O ticket médio ficou em R$ 680,10.
  - 18 testes, incluindo os 4 dias reais do arquivo (os outros dias também estavam errados) e a virada do dia às 02:59:59Z e 03:00:00Z.
  - Mesmo resultado com o computador em UTC, Tóquio e Los Angeles.
  - Com o código da `main`, 13 dos 18 falham.
- **PR:** [#2](https://github.com/edylson02-art/Prova-Pr-tica-/pull/2)

## Tarefa 3 — Cliente vendo dado de outra empresa

- **Situação:** pronta.
- **Qual era o problema:** três falhas no `schema.sql`:
  - **Política aberta.** A política `tarefas_importacao` (`for all using (true)`) liberava leitura e escrita de tudo para todos. Políticas permissivas se combinam com OU, então ela anulava as outras.
  - **Leitura sem a árvore.** A `tarefas_leitura` comparava só a própria empresa, sem descer a árvore.
  - **Árvore alterável.** A tabela `empresas` não tinha RLS e aceitava `update`. Logada como Outra Empresa, consegui pendurar o Grupo Aurora embaixo dela.
- **Como provei que funciona:**
  - Logada como Vértice, `npm run db -- 3 "select ... from tarefas"` agora traz só as 4 tarefas da Vértice.
  - 32 testes no mesmo banco em memória do `scripts/db.js`:
    - o que cada uma das 5 empresas vê (tarefas e empresas);
    - criar, alterar, mover e apagar dentro e fora da árvore;
    - sessão sem empresa;
    - alteração da árvore e ciclos.
  - Com o schema da `main`, 29 dos 32 falham. Os 3 que passam são operações permitidas nos dois.
- **PR:** [#1](https://github.com/edylson02-art/Prova-Pr-tica-/pull/1)

## Tarefa 4 — Prazo em dias úteis

- **Situação:** pronta.
- **Qual API de feriados usei e por quê:** **[BrasilAPI](https://brasilapi.com.br/docs#tag/Feriados-Nacionais)** (`/api/feriados/v1/<ano>`).
  - É brasileira, pública e gratuita, e não exige chave (nenhum segredo no repositório).
  - Devolve só os feriados nacionais, já com os móveis e com a Consciência Negra (nacional desde a Lei 14.759/2023).
  - Comparei com Nager.Date (não é brasileira), Invertexto (exige token) e Calendarific (exige token e tem plano pago).
  - `data/feriados-2026.json` foi gerado por `npm run feriados -- 2026`, sem datas digitadas à mão.
- **Como provei que funciona:**
  - 30 testes de `prazoSLA` com o arquivo real de feriados:
    - o caso do chamado: criada na sexta 02/10 com 1 dia, vence na **segunda 05/10**;
    - cada feriado do segundo semestre, feriado no fim de semana e criação no sábado ou num feriado;
    - virada do ano, prazo de 0 dias e entradas inválidas.
  - 18 testes do comando: ano malicioso (`../../etc`), resposta vazia ou incompleta, erro HTTP e limite de tempo.
  - Mesmo resultado em 5 fusos (incluindo UTC+14).
  - Com o código da `main`, 23 dos 30 testes de prazo falham.
- **PR:** [#5](https://github.com/edylson02-art/Prova-Pr-tica-/pull/5)

## Tarefa 5 — Exportar para o Excel

- **Situação:** pronta.
- **Qual era o problema:** cinco defeitos:
  - **Tudo numa coluna.** O separador era `,`, e o Excel em português espera `;`.
  - **Acentos estranhos.** O arquivo não tinha BOM, e o Excel o abria na codificação do Windows.
  - **Colunas quebradas.** Não havia aspas, então a tarefa 112 (`"Vendas 2026"; turma 1`) quebrava as colunas.
  - **Fórmula executada.** A tarefa 114 (`=SOMA(...)`) **seria executada como fórmula** no Excel.
  - **Data no formato errado:** saía em ISO.
  - Além disso, não havia botão na tela.
- **Como provei que funciona:**
  - 23 testes com um leitor que segue as regras do Excel em português. Todas as 15 tarefas reais saem com 4 colunas e o título intacto.
  - Títulos com `;`, aspas, vírgula e quebra de linha continuam numa coluna só.
  - 6 tipos de fórmula viram texto, inclusive no campo `status`.
  - O arquivo baixado começa com os bytes do BOM (`EF BB BF`).
  - 1 teste confirma que o botão aparece na tela.
  - Com o código da `main`, 22 dos 23 falham.
  - **Validação manual:** o CSV abriu no Excel com cada campo na sua coluna e os acentos certos, e o botão no navegador baixa o arquivo.
- **PR:** [#4](https://github.com/edylson02-art/Prova-Pr-tica-/pull/4)

## Encontrei também

**Segurança (não resolvidos, porque exigem mudar arquitetura ou tabelas):**
- **A empresa logada pode ser trocada por quem executa SQL.** `app.empresa_id` é uma configuração de sessão, e qualquer papel pode alterá-la com `set_config`. Testei: numa única consulta, a Vértice se passa pelo Grupo Aurora. A proteção vale enquanto só o servidor monta o SQL, e uma falha de SQL injection vira acesso ao grupo inteiro. A solução definitiva é tirar a empresa de uma identidade autenticada (claims do JWT ou uma tabela usuário→empresa).
- **O navegador recebe os dados de todas as empresas.** O `App.jsx` embute o `data/tarefas.json` inteiro, e o seletor deixa escolher qualquer empresa, inclusive a Outra Empresa S.A. Filtrar na tela não protege nada. Com login, a tela deveria buscar as tarefas do servidor, já filtradas pela RLS.
- **É possível descobrir se um id de tarefa existe em outra empresa.** Inserir o id 107 (da empresa 5) logada como Vértice dá `duplicate key`. Isso revela que o id existe, mas não o conteúdo.
- **Views sobre `tarefas`** criadas pelo dono ignoram a RLS; precisam de `with (security_invoker = true)` (comentado no schema).
- **A importação do chamado #412** precisa rodar com um papel administrativo (superusuário ou `BYPASSRLS`), não com o da aplicação.

**Dependências:** `npm audit` aponta 5 vulnerabilidades (2 críticas).
- O `esbuild` ≤ 0.24.2 deixa qualquer site ler o servidor de desenvolvimento (GHSA-67mh-4wv8-2f99).
- Também há falhas no `tinypool` e no `@vitest/mocker`.
- Todas são só do ambiente de desenvolvimento, e a correção exige atualizar versões principais do Vite e do Vitest. Não fiz isso dentro das tarefas para não misturar assuntos. Enquanto isso, não rodar `vite --host`.

**Decisões de negócio que tomei e merecem confirmação:**
- **Carnaval e Corpus Christi contam como feriado.** A BrasilAPI os marca como nacionais, mas pela lei são ponto facultativo. Segui a API porque o README pede para não digitar datas à mão.
- **Vendas repetidas: vale a última ocorrência de cada `id`.** Se a sincronização tiver um campo de atualização, essa regra deveria usá-lo.
- **CSV:** o `'` que neutraliza fórmulas aparece na célula. Também afeta títulos legítimos que começam com `-` ou `+`.
- **O SLA de 3 dias úteis está fixo na tela.** Se cada cliente tiver o seu, deveria vir do contrato.

**Outros:**
- **Sem controle de valores:** a tabela `tarefas` aceita qualquer texto em `status`.
- **Sem índices:** não há índices em `empresa_id` e `pai_id`.
- **`scripts/relatorio.js` aceitava qualquer texto como dia:** `01/10/2026` mostrava R$ 0,00 sem aviso. Corrigido no PR #2.
- **Testes originais:** os 2 que existiam passavam por coincidência dos dados escolhidos.

## O que ficou faltando / o que eu faria com mais tempo

- **Teste automatizado do clique:** o clique no botão "Exportar CSV" foi validado manualmente, mas não tem teste automatizado, porque o projeto não tem jsdom e não quis adicionar dependência só para isso.
- **Concorrência na árvore:** o gatilho contra ciclos não foi testado com duas conexões simultâneas, porque o PGlite tem uma conexão só. Faria esse teste num Postgres real.
- **Testes do banco lentos (~45 s):** cada teste de escrita sobe um banco novo. Com mais tempo, usaria transação com rollback por teste.
- **Identidade autenticada:** trocaria o `app.empresa_id` por uma identidade autenticada, o que fecha a brecha do `set_config`.
- **Coluna "Empresa":** com o Grupo Aurora escolhido, a tabela mistura três empresas sem dizer de qual é cada tarefa.
- **Dependências:** um PR separado para atualizar o Vite e o Vitest e zerar o `npm audit`.
