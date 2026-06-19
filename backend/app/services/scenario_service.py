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
SQL_LINE_BREAK_KEYWORDS = ("FROM", "JOIN", "WHERE", "AND", "GROUP BY", "ORDER BY", "LIMIT", "VALUES")
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
BUSINESS_FIELD_COMPARISON_PATTERN = re.compile(
    r"\b(?P<left>[A-Za-z_][A-Za-z0-9_\.]*)\s*"
    r"(?P<operator><=|>=|<>|!=|<|>)\s*"
    r"(?P<right>[A-Za-z_][A-Za-z0-9_\.]*)",
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


def get_difficulties() -> list[str]:
    return sorted({scenario["difficulty"] for scenario in load_scenarios()})


def get_round_options() -> dict[str, Any]:
    scenarios = load_scenarios()
    return {
        "categories": sorted({scenario["category"] for scenario in scenarios}),
        "difficulties": sorted({scenario["difficulty"] for scenario in scenarios}),
        "combinations": [
            {"category": category, "difficulty": difficulty}
            for category, difficulty in sorted(
                {
                    (scenario["category"], scenario["difficulty"])
                    for scenario in scenarios
                }
            )
        ],
    }


def get_random_scenario(
    category: str | None = None,
    difficulty: str | None = None,
    previous_scenario_id: str | None = None,
) -> dict[str, Any]:
    scenarios = [
        scenario
        for scenario in load_scenarios()
        if (not category or scenario["category"] == category)
        and (not difficulty or scenario["difficulty"] == difficulty)
    ]
    if not scenarios:
        raise LookupError("Nenhum cenário encontrado para os filtros selecionados.")
    available_scenarios = [
        scenario
        for scenario in scenarios
        if scenario["id"] != previous_scenario_id
    ]
    return random.choice(available_scenarios or scenarios)


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

    for match in BUSINESS_FIELD_COMPARISON_PATTERN.finditer(query):
        if is_inside_spans(match.start(), ignored_spans):
            continue

        operator = match.group("operator")
        value = normalize_sql_field(match.group("right"))
        label = get_business_rule_label(match.group("left"), operator, value, scenario)
        if not label:
            continue
        if label in seen_labels:
            continue

        rules.append(
            {
                "field": label.split(":", 1)[0],
                "operator": operator,
                "value": value,
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

        operator = match.group("operator")
        label = get_business_rule_label(match.group("left"), operator, value, scenario)
        if not label:
            continue
        if label in seen_labels:
            continue

        rules.append(
            {
                "field": label.split(":", 1)[0],
                "operator": operator,
                "value": value,
                "label": label,
            }
        )
        seen_labels.add(label)

    for label in get_objective_business_rule_labels(scenario):
        if label in seen_labels:
            continue
        rules.append(
            {
                "field": label.split(":", 1)[0],
                "operator": "",
                "value": label.split(":", 1)[1].strip() if ":" in label else "",
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


def get_business_rule_label(expression: str, operator: str, value: str, scenario: dict[str, Any]) -> str | None:
    normalized_expression = normalize_sql_expression(expression)
    objective = scenario.get("objective", "").lower()

    if is_technical_positive_filter(normalized_expression, operator, value):
        return None

    rule_name = get_business_rule_name(normalized_expression, objective)
    if not rule_name:
        return None

    display_value = get_business_rule_display_value(rule_name, operator, value)
    rule_name_lower = rule_name.lower()
    if "mínim" in rule_name_lower or "máxim" in rule_name_lower:
        return f"{rule_name}: {display_value}"

    return f"{rule_name}: {format_business_operator(operator)} {value}"


def get_business_rule_name(expression: str, objective: str) -> str:
    expression_lower = expression.lower()

    if "media_bimestre" in expression_lower or "avg(a.nota)" in expression_lower or "avg(nota)" in expression_lower:
        return "Nota mínima"

    if "frequencia_percentual" in expression_lower:
        return "Frequência mínima"

    if "avg(" in expression_lower and "severidade" in expression_lower:
        return "Severidade média mínima"

    if expression_lower == "severidade":
        return "Severidade considerada"

    if "minutos_parada" in expression_lower:
        return "Total mínimo de minutos parados"

    if "preco_unitario" in expression_lower and "quantidade" in expression_lower:
        return "Faturamento mínimo"

    if expression_lower == "count(*)":
        if "sess" in objective or "dispositivo" in objective:
            return "Sessões mínimas por dispositivo"
        if "fornecedor" in objective:
            return "Problemas mínimos por fornecedor"
        return "Quantidade mínima"

    if "total_incidentes" in expression_lower:
        return "Incidentes mínimos por serviço"

    if "gols" in expression_lower:
        return "Gols mínimos"

    if "temperatura_c" in expression_lower:
        return "Temperatura limite"

    return normalize_sql_expression(expression)


def is_technical_positive_filter(expression: str, operator: str, value: str) -> bool:
    if operator != ">" or value != "0":
        return False

    expression_lower = expression.lower()
    return any(
        technical_field in expression_lower
        for technical_field in ("finalizacoes", "volume_m3", "km_rodados")
    )


def get_business_rule_display_value(rule_name: str, operator: str, value: str) -> str:
    if "mínim" in rule_name.lower() and operator == ">" and value == "0":
        return "1"
    return value


def get_objective_business_rule_labels(scenario: dict[str, Any]) -> list[str]:
    objective = scenario.get("objective", "").lower()
    labels: list[str] = []

    margin_match = re.search(r"margem percentual abaixo de (\d+(?:\.\d+)?)", objective)
    if margin_match:
        labels.append(f"Margem percentual máxima: {margin_match.group(1)}")

    favorites_match = re.search(r"pelo menos (\d+) favoritos", objective)
    if favorites_match:
        labels.append(f"Favoritos mínimos: {favorites_match.group(1)}")

    return labels


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
    if scenario.get("allowed_statement") == "create_table":
        query = format_create_table_query(query)
    for keyword in SQL_LINE_BREAK_KEYWORDS:
        query = re.sub(rf"\s+({keyword})\b", rf"\n\1", query, flags=re.IGNORECASE)

    lines = [line.rstrip() for line in query.splitlines() if line.strip()]
    if lines:
        lines[-1] = f"{lines[-1]};"
    return lines


def format_create_table_query(query: str) -> str:
    match = re.match(
        r"^(CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$",
        query,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return query

    columns = split_sql_by_top_level_commas(match.group(2))
    if not columns:
        return query

    column_lines = ",\n".join(f"  {column.strip()}" for column in columns)
    return f"{match.group(1)} (\n{column_lines}\n)"


def split_sql_by_top_level_commas(sql: str) -> list[str]:
    parts: list[str] = []
    current = ""
    depth = 0
    quote = None

    for character in sql:
        if quote:
            current += character
            if character == quote:
                quote = None
            continue

        if character in ("'", '"'):
            quote = character
            current += character
            continue

        if character == "(":
            depth += 1
        elif character == ")" and depth > 0:
            depth -= 1

        if character == "," and depth == 0:
            parts.append(current.strip())
            current = ""
            continue

        current += character

    parts.append(current.strip())
    return [part for part in parts if part]


def get_public_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    public = {
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
    if scenario.get("task_type"):
        public["task_type"] = scenario["task_type"]
        public["allowed_statement"] = scenario.get("allowed_statement")
    return public
