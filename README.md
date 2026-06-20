# SQL Quest

SQL Quest é um jogo para praticar SQL com missões narrativas. O jogador recebe um contexto, consulta o esquema disponível e escreve uma consulta SQL real. O backend executa a consulta em SQLite e valida o resultado contra uma resposta esperada, sem comparar o texto da SQL.

## O que tem no jogo

SQL Quest se propõe a ser uma espécie de simulador de análise de dados: o jogador entra em situações urgentes, recebe uma missão narrativa e precisa resolver o problema com evidência objetiva em SQL.

O jogo tem um terminal para executar comandos SQL reais contra bancos SQLite simulados. Cada consulta retorna dados reais do banco da missão, permitindo testar, errar, ajustar e validar a resposta pelo resultado retornado.

Também existe um sistema de ajuda em formato de mini game: o jogador responde perguntas sobre fundamentos de SQL para desbloquear apoio durante a missão, conectando prática direta com revisão de conceitos.

## Stack

- Frontend: React + Vite
- Visual: Tailwind CSS, Motion, Lucide React e CodeMirror
- Backend: FastAPI
- Banco: SQLite

## Portas padrão

- Backend local: `http://localhost:8002`
- Frontend local: `http://localhost:5173`

Não há fallback automático de porta. Se uma porta estiver ocupada, encerre o processo antigo antes de iniciar o app.

## Rodar a aplicação completa

```bash
npm install
npm run dev:app
```

O `npm install` na raiz instala as dependências do frontend, cria `backend/.venv` e instala as dependências do backend. Use Python 3.12, 3.13 ou 3.14.

O script `dev:app` inicia backend e frontend. O frontend chama `/_backend` e o Vite redireciona essa rota para `http://localhost:8002` em desenvolvimento.

## Rodar backend manualmente

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_databases.py
uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Configuração opcional:

```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## Rodar frontend manualmente

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

`frontend/.env` opcional:

```bash
VITE_API_BASE_URL=/_backend
```

## Deploy online

Deploy recomendado:

- Backend: Render, usando `render.yaml` na raiz.
- Frontend: Vercel, apontando para a pasta `frontend`.

Passos:

1. Suba o repositório no GitHub.
2. No Render, crie o backend a partir do `render.yaml`.
3. Depois que o backend publicar, copie a URL da API.
4. No Vercel, crie o frontend usando a pasta `frontend`.
5. Configure no Vercel:

```bash
VITE_API_BASE_URL=https://sua-api.onrender.com
```

6. Configure no Render:

```bash
CORS_ORIGINS=https://seu-frontend.vercel.app
```

O frontend também aceita `/api` como fallback para deploys em que frontend e backend ficam no mesmo domínio.

### Deploy monorepo na Vercel

Se a Vercel detectar o projeto como múltiplos serviços, use o `vercel.json` da raiz. Ele publica:

- Frontend em `/`
- Backend em `/_backend`

Nesse modo, não é necessário configurar `VITE_API_BASE_URL`; o frontend usa `/_backend` automaticamente em produção.

O frontend não referencia `localhost` no client. Em produção, as chamadas usam `/_backend`.

## MVP atual

- Missões narrativas por categoria.
- Validação por resultado retornado.
- Bloqueio de comandos de escrita e comandos perigosos.
- SQLite em modo somente leitura para execução das consultas.
- HUD com sequência e vidas.
- Terminal SQL com CodeMirror e destaque de sintaxe.
- Ajuda por quiz e sistema de Game Over.

## Crescimento planejado

Adicione novas situações em `backend/app/data/scenarios.json` e crie/alimente o banco correspondente em `backend/scripts/seed_databases.py`. Cada situação deve apontar para um arquivo SQLite em `backend/app/data/databases`.

Para padronizar novas situações, use o blueprint em `docs/blueprint-novas-situacoes.md`.
