import json
import random
import re
import sqlite3
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCENARIOS_FILE = DATA_DIR / "scenarios.json"
DATABASES_DIR = DATA_DIR / "databases"
SQL_LINE_BREAK_KEYWORDS = ("FROM", "JOIN", "WHERE", "AND", "GROUP BY", "ORDER BY", "LIMIT")


@lru_cache
def load_scenarios() -> list[dict[str, Any]]:
    with SCENARIOS_FILE.open(encoding="utf-8") as file:
        return json.load(file)


def get_categories() -> list[str]:
    return sorted({scenario["category"] for scenario in load_scenarios()})


def get_random_scenario() -> dict[str, Any]:
    return random.choice(load_scenarios())


def get_scenario(scenario_id: str) -> dict[str, Any]:
    for scenario in load_scenarios():
        if scenario["id"] == scenario_id:
            return scenario
    raise KeyError(scenario_id)


def get_database_path(scenario: dict[str, Any]) -> Path:
    database_path = DATABASES_DIR / scenario["database"]
    if not database_path.exists():
        raise FileNotFoundError(f"Banco de dados não encontrado: {database_path.name}")
    return database_path


def get_scenario_schema(scenario: dict[str, Any]) -> dict[str, list[str]]:
    database_path = get_database_path(scenario)
    connection = sqlite3.connect(f"file:{database_path}?mode=ro", uri=True)
    try:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        schema: dict[str, list[str]] = {}
        for (table_name,) in tables:
            columns = connection.execute(f'PRAGMA table_info("{table_name}")').fetchall()
            schema[table_name] = [column[1] for column in columns]
        return schema
    finally:
        connection.close()


def get_expected_answer_lines(scenario: dict[str, Any]) -> list[str]:
    answer = scenario.get("expected_answer", {})
    query = answer.get("query") or scenario["expected_sql"]
    query = query.strip().rstrip(";")
    for keyword in SQL_LINE_BREAK_KEYWORDS:
        query = re.sub(rf"\s+({keyword})\b", rf"\n\1", query, flags=re.IGNORECASE)

    lines = [line.strip() for line in query.splitlines() if line.strip()]
    if lines:
        lines[-1] = f"{lines[-1]};"
    return lines


def get_public_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": scenario["id"],
        "category": scenario["category"],
        "title": scenario["title"],
        "story": scenario["story"],
        "objective": scenario["objective"],
        "objective_steps": scenario.get("objective_steps"),
        "difficulty": scenario["difficulty"],
        "hint": scenario.get("hint"),
        "schema": get_scenario_schema(scenario),
    }
