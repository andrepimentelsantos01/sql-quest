from collections import Counter
import re
import unicodedata
from typing import Any

from app.schemas import RoundResult
from app.services.scenario_service import get_database_path
from app.services.sql_runner import QueryRejectedError, run_mutation_preview, run_select_query

ORDER_REQUIREMENT_PATTERN = re.compile(
    r"\b(ordene|ordenar|ordenacao|ordena[cç][aã]o|organize|priorize|ranking|rank|primeiro|top|limit|desempate)\b"
    r"|maior\s+(?:[a-zA-ZÀ-ÿ]+\s+){0,4}para\s+(?:a\s+)?menor"
    r"|menor\s+(?:[a-zA-ZÀ-ÿ]+\s+){0,4}para\s+(?:a\s+)?maior",
    re.IGNORECASE,
)


def _normalize(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, str):
        normalized = unicodedata.normalize("NFKD", value.strip().casefold())
        return "".join(character for character in normalized if not unicodedata.combining(character))
    return value


def _normalized_rows(rows: list[list[Any]]) -> list[list[Any]]:
    return [[_normalize(value) for value in row] for row in rows]


def _same_rows_ignoring_order(user_rows: list[list[Any]], expected_rows: list[list[Any]]) -> bool:
    return Counter(tuple(row) for row in _normalized_rows(user_rows)) == Counter(
        tuple(row) for row in _normalized_rows(expected_rows)
    )


def _requires_order(scenario: dict[str, Any]) -> bool:
    text = " ".join(
        [
            scenario.get("objective", ""),
            " ".join(scenario.get("objective_steps") or []),
        ]
    )
    return bool(ORDER_REQUIREMENT_PATTERN.search(text))


def _get_expected_query(scenario: dict[str, Any]) -> str:
    return scenario.get("expected_answer", {}).get("query") or scenario["expected_sql"]


def _is_mutation_scenario(scenario: dict[str, Any]) -> bool:
    return scenario.get("task_type") == "mutation"


def validate_submission(scenario: dict[str, Any], user_query: str) -> RoundResult:
    if _is_mutation_scenario(scenario):
        return validate_mutation_submission(scenario, user_query)

    database_path = get_database_path(scenario)
    try:
        expected = run_select_query(database_path, scenario["expected_sql"])
        user_result = run_select_query(database_path, user_query)
    except QueryRejectedError as exc:
        return RoundResult(
            correct=False,
            message=str(exc),
            user_result=None,
            hint=scenario.get("hint"),
            expected_query=_get_expected_query(scenario),
        )

    ordered_match = _normalized_rows(user_result.rows) == _normalized_rows(expected.rows)
    unordered_match = _same_rows_ignoring_order(user_result.rows, expected.rows)
    correct = ordered_match or (unordered_match and not _requires_order(scenario))
    if correct:
        message = "Boa! O resultado retornado bate com a resposta esperada."
        hint = None
        expected_query = None
    else:
        message = "Ainda não bateu com o resultado esperado. Confira filtros, agrupamentos e regras do enunciado."
        hint = scenario.get("hint")
        expected_query = _get_expected_query(scenario)

    return RoundResult(correct=correct, message=message, user_result=user_result, hint=hint, expected_query=expected_query)


def validate_mutation_submission(scenario: dict[str, Any], user_query: str) -> RoundResult:
    database_path = get_database_path(scenario)
    validation_sql = scenario["validation_sql"]
    allowed_statement = scenario["allowed_statement"]
    try:
        expected = run_mutation_preview(database_path, scenario["expected_sql"], allowed_statement, validation_sql)
        user_result = run_mutation_preview(database_path, user_query, allowed_statement, validation_sql)
    except QueryRejectedError as exc:
        return RoundResult(
            correct=False,
            message=str(exc),
            user_result=None,
            hint=scenario.get("hint"),
            expected_query=_get_expected_query(scenario),
        )

    correct = _normalized_rows(user_result.rows) == _normalized_rows(expected.rows)
    if correct:
        message = "Boa! A alteracao ficou igual ao estado esperado."
        hint = None
        expected_query = None
    else:
        message = "Ainda nao bateu com o estado esperado. Confira o comando e os valores alterados."
        hint = scenario.get("hint")
        expected_query = _get_expected_query(scenario)

    return RoundResult(correct=correct, message=message, user_result=user_result, hint=hint, expected_query=expected_query)
