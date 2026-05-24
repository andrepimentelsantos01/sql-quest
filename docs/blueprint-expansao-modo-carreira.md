# Blueprint para expansão do modo carreira

Use este blueprint para criar novos arcos do modo carreira sem quebrar a progressão narrativa, técnica e visual do SQL Quest.

O modo carreira é uma trilha sequencial. Cada arco deve parecer uma etapa profissional do jogador, não uma missão aleatória agrupada por conveniência.

## Estrutura de um arco

Todo arco deve ter:

- `intro`: texto de abertura do arco.
- `scenarios`: 5 desafios jogáveis.
- `completion`: texto de encerramento do arco.
- `next_arc`: próximo arco, quando existir.

O formato base é:

```json
{
  "intro": {
    "title": "Título do arco",
    "arc": "Nível e nome do arco",
    "story": "Texto introdutório..."
  },
  "completion": {
    "title": "Título de conclusão",
    "story": "Texto de encerramento..."
  },
  "scenarios": [],
  "next_arc": {}
}
```

O primeiro arco fica na raiz do JSON. Os arcos seguintes são ligados por `next_arc`. Não crie listas paralelas para representar a mesma progressão.

## Introdução do arco

A introdução deve contextualizar a nova etapa da carreira.

Ela precisa:

- Começar com `Olá, analista!`.
- Explicar o que mudou desde o arco anterior.
- Mostrar a nova pressão de negócio.
- Apresentar o nível de responsabilidade do jogador.
- Definir o tema central do arco.
- Manter humor corporativo seco e claro.

Modelo:

```text
Olá, analista! Depois de [consequência do arco anterior], você chegou a uma nova fase da carreira.

[Negócio ou operação] agora enfrenta [novo contexto], com [novas áreas, pessoas, dados ou riscos].

Sua missão neste arco é ajudar [personagem ou empresa] a entender [tema central] usando SQL, evidência e critério.

Porque quando [tipo de negócio] cresce, [frase final bem-humorada que reforce que achismo não basta].
```

## Encerramento do arco

O encerramento deve refletir o que o jogador acabou de conquistar.

Ele precisa:

- Celebrar a conclusão do arco.
- Mencionar o impacto das análises feitas.
- Mostrar como a empresa ou os personagens reagiram aos dados.
- Preparar a transição para o próximo arco ou nível.
- Evitar texto genérico que poderia servir para qualquer arco.

Modelo:

```text
Parabéns, analista! Você concluiu [nome ou tema do arco] sem deixar [risco do arco] virar [consequência ruim].

Com suas consultas, [empresa ou operação] conseguiu enxergar [evidências geradas].

A jornada continua. Agora [novo estágio, nova pressão ou nova complexidade].
```

## Cenários do arco

Cada arco deve ter exatamente 5 cenários.

Cada cenário precisa:

- Fazer parte do contexto do arco.
- Resolver um problema de negócio específico.
- Usar SQL real contra SQLite.
- Ter resultado validável por dados, não por texto da query.
- Ter dificuldade coerente com a fase profissional.

Campos obrigatórios:

- `id`
- `category`
- `title`
- `difficulty`
- `database`
- `story`
- `objective`
- `objective_steps`
- `expected_sql`
- `expected_answer`
- `hint`

## Narrativa dos cenários

Toda `story` deve:

- Começar com `Olá, analista!`.
- Ter contexto profissional concreto.
- Trazer uma tensão de negócio.
- Mostrar por que opinião não basta.
- Encerrar com a missão em linguagem narrativa.

Modelo:

```text
Olá, analista! [Situação inicial conectada ao arco.]

[Área, pessoa ou operação] precisa responder [problema concreto], mas ainda existe ruído, achismo ou pressão.

Antes que [decisão ruim] vire plano oficial, os dados precisam mostrar [evidência necessária].

Sua missão é [descoberta esperada]. Porque [frase final no tom do jogo].
```

## Objetivo técnico

O `objective` deve ser claro e testável.

Ele deve informar:

- Colunas retornadas.
- Tabelas ou entidades envolvidas, quando necessário.
- Filtros de data, status, loja, categoria ou período.
- Cálculos exigidos.
- Agregações.
- Arredondamento.
- Ordenação completa.
- Critérios de desempate.
- Limite de linhas, quando houver.

Modelo:

```text
Sua tarefa: retorne [colunas]. Considere [filtros]. Calcule [métrica]. Agrupe por [dimensão]. Ordene por [regra]. Em caso de empate, ordene por [desempate].
```

## Dificuldade

O nível deve refletir a complexidade da consulta.

### Júnior

Use principalmente:

- `SELECT`
- `WHERE`
- `ORDER BY`
- `LIMIT`
- `COUNT`
- `SUM`
- `AVG`
- `ROUND`
- `GROUP BY`
- uma tabela principal ou relação muito direta

Evite:

- CTE
- subquery
- função de janela
- muitas regras encadeadas

### Pleno

Use principalmente:

- múltiplos `JOIN`
- `GROUP BY`
- `HAVING`
- filtros por período
- métricas calculadas
- regras de negócio combinadas
- comparações entre entidades
- aliases claros

### Sênior

Use principalmente:

- CTE
- subqueries
- funções de janela
- rankings
- cálculos em etapas
- regras condicionais mais densas
- múltiplas dimensões de análise

## Banco de dados

Cada arco pode usar banco existente ou banco novo, conforme o contexto da carreira.

Regras:

- Reaproveite tabelas quando fizer sentido narrativo e técnico.
- Crie tabelas novas quando o arco introduzir uma nova área do negócio.
- Não duplique dados sem necessidade.
- Mantenha os dados suficientes para testar filtros, agregações e ordenações.
- Insira registros que entram e registros que ficam fora do resultado esperado.

O schema exibido no jogo é filtrado automaticamente pelas tabelas usadas em `FROM` e `JOIN` da `expected_sql`. Por isso, escreva a query esperada com referências claras às tabelas necessárias.

## SQL esperado

A `expected_sql` deve:

- Rodar em SQLite.
- Ser determinística.
- Ter aliases iguais aos nomes em `expected_answer.result.columns`.
- Usar `ORDER BY` completo.
- Arredondar valores quando houver média, percentual ou dinheiro.
- Evitar ambiguidade de coluna.

O `expected_answer` deve bater exatamente com a execução da query.

## Mini game de ajuda

O mini game usa perguntas por dificuldade.

Ao criar arcos:

- Defina `difficulty` corretamente.
- Verifique se a dificuldade tem perguntas suficientes.
- Evite introduzir conceitos que ainda não existem no banco de perguntas, a menos que também adicione perguntas novas.

O jogo evita repetir perguntas já vistas na sessão enquanto houver perguntas disponíveis.

## Checklist

- O arco tem `intro`, 5 `scenarios` e `completion`.
- A introdução começa com `Olá, analista!`.
- Cada cenário começa com `Olá, analista!`.
- O encerramento é específico do arco.
- Os IDs são únicos e previsíveis.
- A dificuldade combina com a SQL exigida.
- O banco tem dados suficientes para provar a regra.
- A query roda em SQLite.
- O resultado esperado bate exatamente com a query.
- A ordenação é determinística.
- O schema exibido mostra apenas tabelas pertinentes.
- O texto mantém o tom narrativo do jogo.

## Validação recomendada

Depois de criar ou alterar um arco, rode:

```bash
python backend/scripts/seed_databases.py
python -m compileall backend
npm.cmd run build
git diff --check
```

Também valide todas as `expected_sql` do modo carreira contra os bancos SQLite usados pelos cenários.
