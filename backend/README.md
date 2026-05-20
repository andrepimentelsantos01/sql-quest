# Backend do SQL Quest

## Porta local padrao

API local: `http://localhost:8002/api/health`

## Rodar localmente

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_databases.py
uvicorn app.main:app --host 127.0.0.1 --port 8002
```

## CORS

Por padrao, o backend aceita:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Em producao, configure:

```bash
CORS_ORIGINS=https://seu-frontend.vercel.app
```

Multiplas origens podem ser separadas por virgula.
