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
TEMPORAL_LITERAL_PATTERN = r"\d{4}-\d{2}-\d{2}|\d{2}:\d{2}"
DATE_RANGE_PATTERN = re.compile(
    rf"\b(?P<field>[A-Za-z_][A-Za-z0-9_\.]*)\s*>=\s*'(?P<start>{TEMPORAL_LITERAL_PATTERN})'"
    rf"\s+AND\s+(?P=field)\s*<\s*'(?P<end>{TEMPORAL_LITERAL_PATTERN})'",
    re.IGNORECASE,
)
DATE_BETWEEN_PATTERN = re.compile(
    rf"\b(?P<field>[A-Za-z_][A-Za-z0-9_\.]*)\s+BETWEEN\s+'(?P<start>{TEMPORAL_LITERAL_PATTERN})'\s+AND\s+'(?P<end>{TEMPORAL_LITERAL_PATTERN})'",
    re.IGNORECASE,
)
DATE_CUTOFF_PATTERN = re.compile(
    rf"\b(?P<field>[A-Za-z_][A-Za-z0-9_\.]*)\s*(?P<operator><=|>=|<|>|=)\s*'(?P<date>{TEMPORAL_LITERAL_PATTERN})'",
    re.IGNORECASE,
)
DATE_REFERENCE_PATTERN = re.compile(r"\bjulianday\('(?P<date>\d{4}-\d{2}-\d{2})'\)", re.IGNORECASE)
BUSINESS_COMPARISON_PATTERN = re.compile(
    r"\b(?P<left>[A-Za-z_][A-Za-z0-9_\.]*|(?:AVG|COUNT|SUM)\([^)]*\))\s*"
    r"(?P<operator><=|>=|<>|!=|=|<|>)\s*"
    r"(?P<value>'[^']+'|-?\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
BUSINESS_IN_PATTERN = re.compile(
    r"\b(?P<field>[A-Za-z_][A-Za-z0-9_\.]*)\s+IN\s*\((?P<values>'[^']+'(?:\s*,\s*'[^']+')*)\)",
    re.IGNORECASE,
)


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


def get_scenario_schema_tables(scenario: dict[str, Any]) -> dict[str, list[str]]:
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


def get_scenario_schema(scenario: dict[str, Any]) -> dict[str, Any]:
    schema: dict[str, Any] = {"tables": get_scenario_schema_tables(scenario)}
    analysis_period = get_analysis_period(scenario)
    business_rules = get_business_rules(scenario)
    if analysis_period:
        schema["analysis_period"] = analysis_period
    if business_rules:
        schema["business_rules"] = business_rules
    return schema


def get_relevant_schema_tables(scenario: dict[str, Any]) -> set[str]:
    if not scenario["id"].startswith(("career_", "carreira_")):
        return set()

    query = scenario.get("expected_sql", "")
    return {match.group(1) for match in SQL_TABLE_REFERENCE_PATTERN.finditer(query)}


def get_analysis_period(scenario: dict[str, Any]) -> dict[str, Any] | None:
    query = scenario.get("expected_answer", {}).get("query") or scenario.get("expected_sql", "")
    ranges: list[dict[str, str]] = []
    consumed_spans: list[tuple[int, int]] = []

    for match in DATE_RANGE_PATTERN.finditer(query):
        field = normalize_sql_field(match.group("field"))
        start = match.group("start")
        end = match.group("end")
        ranges.append(
            {
                "field": field,
                "start": start,
                "end": end,
                "label": f"{field}: de {start} ate antes de {end}",
            }
        )
        consumed_spans.append(match.span())

    for match in DATE_BETWEEN_PATTERN.finditer(query):
        field = normalize_sql_field(match.group("field"))
        start = match.group("start")
        end = match.group("end")
        ranges.append(
            {
                "field": field,
                "start": start,
                "end": end,
                "label": f"{field}: de {start} ate {end}",
            }
        )
        consumed_spans.append(match.span())

    cutoffs: list[dict[str, str]] = []
    for match in DATE_CUTOFF_PATTERN.finditer(query):
        if is_inside_spans(match.start(), consumed_spans):
            continue
        field = normalize_sql_field(match.group("field"))
        operator = match.group("operator")
        date = match.group("date")
        cutoffs.append(
            {
                "field": field,
                "operator": operator,
                "date": date,
                "label": f"{field}: {format_date_operator(operator)} {date}",
            }
        )

    references = [
        {
            "date": match.group("date"),
            "label": f"Data de referencia: {match.group('date')}",
        }
        for match in DATE_REFERENCE_PATTERN.finditer(query)
    ]

    if not ranges and not cutoffs and not references:
        return None

    return {
        "title": "Janela solicitada",
        "ranges": ranges,
        "cutoffs": cutoffs,
        "references": references,
    }


def get_business_rules(scenario: dict[str, Any]) -> dict[str, Any] | None:
    query = scenario.get("expected_answer", {}).get("query") or scenario.get("expected_sql", "")
    ignored_spans = get_temporal_spans(query)
    rules: list[dict[str, str]] = []
    seen_labels: set[str] = set()

    for match in BUSINESS_IN_PATTERN.finditer(query):
        if is_inside_spans(match.start(), ignored_spans):
            continue
        field = normalize_sql_field(match.group("field"))
        values = [
            value.strip().strip("'")
            for value in match.group("values").split(",")
        ]
        label = f"{field}: um de {', '.join(values)}"
        if label not in seen_labels:
            rules.append(
                {
                    "field": field,
                    "operator": "IN",
                    "value": ", ".join(values),
                    "label": label,
                }
            )
            seen_labels.add(label)

    for match in BUSINESS_COMPARISON_PATTERN.finditer(query):
        if is_inside_spans(match.start(), ignored_spans):
            continue

        value = normalize_sql_literal(match.group("value"))
        if is_temporal_literal(value):
            continue

        left = normalize_sql_expression(match.group("left"))
        operator = match.group("operator")
        label = f"{left}: {format_business_operator(operator)} {value}"
        if label in seen_labels:
            continue

        rules.append(
            {
                "field": left,
                "operator": operator,
                "value": value,
                "label": label,
            }
        )
        seen_labels.add(label)

    if not rules:
        return None

    return {
        "title": "Regras de Negócio",
        "rules": rules,
    }


def get_temporal_spans(query: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    spans.extend(match.span() for match in DATE_RANGE_PATTERN.finditer(query))
    spans.extend(match.span() for match in DATE_BETWEEN_PATTERN.finditer(query))
    spans.extend(match.span() for match in DATE_CUTOFF_PATTERN.finditer(query))
    spans.extend(match.span() for match in DATE_REFERENCE_PATTERN.finditer(query))
    return spans


def normalize_sql_field(field: str) -> str:
    return field.split(".")[-1]


def normalize_sql_expression(expression: str) -> str:
    expression = expression.strip()
    field_match = re.fullmatch(r"[A-Za-z_][A-Za-z0-9_\.]*", expression)
    if field_match:
        return normalize_sql_field(expression)
    return re.sub(r"\s+", " ", expression)


def normalize_sql_literal(value: str) -> str:
    return value.strip().strip("'")


def is_temporal_literal(value: str) -> bool:
    return re.fullmatch(TEMPORAL_LITERAL_PATTERN, value) is not None


def is_inside_spans(position: int, spans: list[tuple[int, int]]) -> bool:
    return any(start <= position < end for start, end in spans)


def format_date_operator(operator: str) -> str:
    return {
        "<": "antes de",
        "<=": "ate",
        ">": "apos",
        ">=": "a partir de",
        "=": "em",
    }[operator]


def format_business_operator(operator: str) -> str:
    return {
        "<": "menor que",
        "<=": "menor ou igual a",
        ">": "maior que",
        ">=": "maior ou igual a",
        "=": "igual a",
        "!=": "diferente de",
        "<>": "diferente de",
    }[operator]


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
