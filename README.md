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
