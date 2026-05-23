# Blueprint para inserir novo cenário

Use este blueprint sempre que criar um cenário para o SQL Quest. O cenário deve colocar o jogador como uma espécie de hitman da análise de dados: um analista acionado para entrar em situações urgentes, importantes e variadas pelo mundo, resolver o problema com SQL e sair deixando evidência objetiva no lugar de achismo.

## Padrão narrativo

Todo cenário deve seguir este tom:

- Começar obrigatoriamente com: `Olá, analista!`
- Colocar o analista dentro de uma situação realista e simulada.
- Dar sensação de urgência: reunião crítica, crise operacional, risco financeiro, decisão esportiva, pressão de cliente, falha de produto, investigação interna, auditoria, campanha, safra, exposição, operação logística etc.
- Variar lugares, setores e contextos. O analista pode estar em hospital, fábrica, estádio, galeria, fazenda, escola, transportadora, startup, multinacional, estúdio de games ou qualquer ambiente profissional plausível.
- Manter humor leve, seco e corporativo, sem virar piada solta.
- Mostrar que SQL é a ferramenta decisiva para separar narrativa, desculpa e opinião de evidência.
- Encerrar a história deixando clara a missão antes do objetivo técnico.

Evite:

- Texto genérico como "consulte a tabela".
- História sem consequência real.
- Humor que atrapalhe clareza.
- Cenário fantástico, mágico ou desconectado de um problema profissional.
- Objetivo ambíguo ou sem recorte verificável.

## Estrutura recomendada da história

A `story` deve ter 3 ou 4 parágrafos curtos:

1. Abertura: coloque o analista no local e na tensão do caso.
2. Contexto: explique o problema real, quem está pressionando e por quê.
3. Dados como virada: mostre que opinião não basta e que a consulta SQL precisa revelar a resposta.
4. Missão: diga o que precisa ser descoberto, em linguagem narrativa.

Modelo:

```text
Olá, analista! Hoje você está em [lugar realista] onde [situação urgente] colocou todo mundo em modo reunião crítica.

[Área/personagens] estão pressionando porque [problema concreto] começou a afetar [custo, prazo, cliente, risco, receita, desempenho ou operação].

Antes que alguém transforme a reunião em teatro corporativo, os dados precisam mostrar exatamente onde está o problema.

Sua missão é [descoberta esperada em linguagem de negócio]. Porque em [categoria] [frase curta bem-humorada reforçando que SQL resolve melhor que achismo].
```

## Campos obrigatórios

Cada item em `backend/app/data/scenarios.json` deve conter:

- `id`: único, previsível e incremental. Exemplo: `tecnologia_004`.
- `category`: área profissional. Exemplo: `Tecnologia`.
- `title`: título curto e específico.
- `difficulty`: `Júnior`, `Pleno` ou `Sênior`.
- `database`: arquivo SQLite em `backend/app/data/databases`.
- `story`: narrativa no padrão acima.
- `objective`: instrução técnica precisa do que retornar.
- `expected_sql`: consulta SQL ideal.
- `expected_answer`: colunas e linhas esperadas.
- `hint`: dica curta, sem entregar a consulta inteira.

## Categorias

Categorias atuais:

- Saúde
- Tecnologia
- Esporte
- Indústria
- Educação
- Arte
- Agricultura
- Logística
- Games

Ao adicionar novas categorias, mantenha o mesmo padrão de experiência: contexto profissional, problema urgente, dados simulados reais e SQL como ferramenta central.

## Níveis de dificuldade

- `Júnior`: filtros simples, `ORDER BY`, `LIMIT`, `COUNT`, `SUM`, `AVG`, uma tabela ou join muito direto.
- `Pleno`: `JOIN`, `GROUP BY`, `HAVING`, filtros por data, métricas calculadas, aliases e regras de negócio simples.
- `Sênior`: CTEs, múltiplos joins, subconsultas, janelas analíticas, regras encadeadas ou cálculo com etapas.

O nível deve refletir a complexidade real da query, não a importância narrativa do problema.

## Objetivo técnico

O `objective` deve ser direto e testável:

- Diga exatamente quais colunas retornar.
- Informe filtros de data, status, categoria ou recorte.
- Defina agregações e arredondamentos.
- Defina ordenação completa, incluindo desempate.
- Informe `LIMIT` quando houver.
- Use aliases esperados quando forem relevantes para validação.

Modelo:

```text
Sua tarefa: retorne [colunas] considerando [filtros]. Calcule [métrica], ordene por [regra] e, em caso de empate, ordene por [desempate].
```

## SQL e resposta esperada

A `expected_sql` precisa ser:

- Determinística.
- Compatível com SQLite.
- Clara o suficiente para servir como solução de referência.
- Ordenada explicitamente quando retornar múltiplas linhas.
- Com aliases iguais aos nomes definidos em `expected_answer.result.columns`.
- Com arredondamento definido quando houver `REAL`, porcentagem ou média.

O `expected_answer` deve bater exatamente com a execução da `expected_sql` no banco informado.

## Banco de dados

Preferência:

1. Reaproveitar tabelas existentes quando a nova missão puder ser resolvida com dados atuais.
2. Alterar `backend/scripts/seed_databases.py` somente quando o novo cenário precisar de dados ou tabelas novas.
3. Regenerar o banco SQLite após qualquer alteração no seed.

Todo banco deve conter casos que provem a regra:

- Registros dentro e fora do período.
- Status que entram e status que não entram.
- Empates quando o objetivo exigir desempate.
- Valores nulos ou ausentes se a missão envolver `LEFT JOIN` ou `COALESCE`.
- Dados suficientes para o resultado não parecer artificial demais.

## Exemplo de cenário

```json
{
  "id": "tecnologia_004",
  "category": "Tecnologia",
  "title": "Squads sob alerta",
  "difficulty": "Pleno",
  "database": "tecnologia.db",
  "story": "Olá, analista! Hoje você entrou no war room de uma empresa global de tecnologia onde os squads chegaram com dashboards próprios, explicações defensivas e uma vontade enorme de provar que o problema está sempre em outro serviço.\n\nA liderança quer olhar para os incidentes do mês sem separar responsabilidade em frases vagas como complexidade sistêmica ou comportamento intermitente.\n\nSe um squad concentra chamados demais, a próxima conversa precisa começar por ele, não por um slide genérico de estabilidade.\n\nSua missão é contar os incidentes por squad no último mês fechado. Porque em tecnologia incidente sem dono vira recorrência, e recorrência sem dado vira tradição.",
  "objective": "Sua tarefa: retorne o squad e a quantidade de incidentes abertos entre 2026-04-01 e 2026-05-01. Ordene da maior quantidade para a menor. Em caso de empate, ordene por squad em ordem alfabética.",
  "expected_sql": "SELECT s.squad, COUNT(*) AS incidentes FROM servicos s JOIN incidentes i ON i.servico_id = s.id WHERE i.aberto_em >= '2026-04-01' AND i.aberto_em < '2026-05-01' GROUP BY s.squad ORDER BY incidentes DESC, s.squad ASC;",
  "expected_answer": {
    "query": "SELECT s.squad, COUNT(*) AS incidentes FROM servicos s JOIN incidentes i ON i.servico_id = s.id WHERE i.aberto_em >= '2026-04-01' AND i.aberto_em < '2026-05-01' GROUP BY s.squad ORDER BY incidentes DESC, s.squad ASC;",
    "result": {
      "columns": ["squad", "incidentes"],
      "rows": [
        ["Core", 3],
        ["Plataforma", 2],
        ["Dados", 1],
        ["Engajamento", 1]
      ]
    }
  },
  "hint": "Relacione serviços com incidentes, filtre o período e conte os registros por squad."
}
```

## Como implementar

1. Escolha categoria, título e nível.
2. Defina a missão narrativa no padrão `Olá, analista!`.
3. Confirme se o banco existente já contém dados suficientes.
4. Se necessário, atualize `backend/scripts/seed_databases.py` e regenere os bancos.
5. Insira o cenário em `backend/app/data/scenarios.json`.
6. Execute a `expected_sql` no SQLite correspondente.
7. Compare colunas e linhas com `expected_answer`.
8. Garanta que a ordenação seja determinística.

## Checklist de qualidade

- A história começa com `Olá, analista!`.
- O analista foi colocado em uma situação concreta, urgente e importante.
- O contexto parece real e profissional.
- O tom é bem-humorado sem perder clareza.
- A missão depende de SQL para separar evidência de opinião.
- O objetivo técnico é preciso e testável.
- O nível combina com a complexidade da consulta.
- A query roda em SQLite.
- O resultado esperado bate exatamente com a query.
- A ordenação inclui desempate quando necessário.
- A dica ajuda sem entregar a solução inteira.
