import json
import random
import re
import sqlite3
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCENARIOS_FILE = DATA_DIR / "scenarios.json"
CAREER_SCENARIOS_FILE = DATA_DIR / "career_scenarios.json"
DATABASES_DIR = DATA_DIR / "databases"
SQL_LINE_BREAK_KEYWORDS = ("FROM", "JOIN", "WHERE", "AND", "GROUP BY", "ORDER BY", "LIMIT")
SQL_TABLE_REFERENCE_PATTERN = re.compile(r"\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)", re.IGNORECASE)


@lru_cache
def load_scenarios() -> list[dict[str, Any]]:
    with SCENARIOS_FILE.open(encoding="utf-8") as file:
        return json.load(file)


@lru_cache
def load_career_data() -> dict[str, Any]:
    with CAREER_SCENARIOS_FILE.open(encoding="utf-8") as file:
        return json.load(file)


def load_career_scenarios() -> list[dict[str, Any]]:
    return [
        scenario
        for arc in get_career_arcs()
        for scenario in arc["scenarios"]
    ]


def get_career_arcs() -> list[dict[str, Any]]:
    data = load_career_data()
    arcs = [
        {
            "intro": data["intro"],
            "completion": data.get("completion"),
            "scenarios": data["scenarios"],
        }
    ]
    next_arc = data.get("next_arc")
    while next_arc:
        arcs.append(next_arc)
        next_arc = next_arc.get("next_arc")
    return arcs


def get_categories() -> list[str]:
    return sorted({scenario["category"] for scenario in load_scenarios()})


def get_random_scenario() -> dict[str, Any]:
    return random.choice(load_scenarios())


def get_scenario(scenario_id: str) -> dict[str, Any]:
    for scenario in [*load_scenarios(), *load_career_scenarios()]:
        if scenario["id"] == scenario_id:
            return scenario
    raise KeyError(scenario_id)


def get_career_intro() -> dict[str, str]:
    return get_career_arc_intro(0)


def get_career_arc_intro(arc_index: int) -> dict[str, str]:
    arcs = get_career_arcs()
    if arc_index < 0 or arc_index >= len(arcs):
        raise IndexError(arc_index)
    return arcs[arc_index]["intro"]


def get_career_round(step: int) -> dict[str, Any]:
    career_scenarios = load_career_scenarios()
    if step < 0 or step >= len(career_scenarios):
        raise IndexError(step)

    scenario = get_public_scenario(career_scenarios[step])
    arc_index, arc_step, arc_total = get_career_position(step)
    arc = get_career_arcs()[arc_index]
    scenario["career"] = {
        "step": step,
        "total": len(career_scenarios),
        "arc_index": arc_index,
        "arc_step": arc_step,
        "arc_total": arc_total,
        "arc": arc["intro"]["arc"],
        "completion": get_career_arc_completion(arc),
        "completed": False,
    }
    return scenario


def get_career_position(step: int) -> tuple[int, int, int]:
    offset = 0
    for arc_index, arc in enumerate(get_career_arcs()):
        arc_total = len(arc["scenarios"])
        if step < offset + arc_total:
            return arc_index, step - offset, arc_total
        offset += arc_total
    raise IndexError(step)


def get_career_arc_completion(arc: dict[str, Any]) -> dict[str, str]:
    completion = arc.get("completion")
    if completion:
        return completion

    return {
        "title": "Arco concluído",
        "story": "Você concluiu mais uma etapa da carreira com SQL e deixou seu Joaquim com menos achismo para defender na próxima reunião.",
    }


def get_database_path(scenario: dict[str, Any]) -> Path:
    database_path = DATABASES_DIR / scenario["database"]
    if not database_path.exists():
        raise FileNotFoundError(f"Banco de dados não encontrado: {database_path.name}")
    return database_path


def get_scenario_schema(scenario: dict[str, Any]) -> dict[str, list[str]]:
    database_path = get_database_path(scenario)
    relevant_tables = get_relevant_schema_tables(scenario)
    connection = sqlite3.connect(f"file:{database_path}?mode=ro", uri=True)
    try:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        schema: dict[str, list[str]] = {}
        for (table_name,) in tables:
            if relevant_tables and table_name not in relevant_tables:
                continue
            columns = connection.execute(f'PRAGMA table_info("{table_name}")').fetchall()
            schema[table_name] = [column[1] for column in columns]
        return schema
    finally:
        connection.close()


def get_relevant_schema_tables(scenario: dict[str, Any]) -> set[str]:
    if not scenario["id"].startswith(("career_", "carreira_")):
        return set()

    query = scenario.get("expected_sql", "")
    return {match.group(1) for match in SQL_TABLE_REFERENCE_PATTERN.finditer(query)}


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
