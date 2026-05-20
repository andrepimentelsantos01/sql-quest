import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.rounds import router as rounds_router

app = FastAPI(title="SQL Quest API", version="0.1.0")


def get_allowed_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]

    return ["http://localhost:5173", "http://127.0.0.1:5173"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(rounds_router, prefix="/api")
