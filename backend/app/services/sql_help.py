import json
import random
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
QUESTIONS_FILE = DATA_DIR / "sql_help_questions.json"

FEATURE_TERMS = (
    "JOIN",
    "GROUP BY",
    "WHERE",
    "HAVING",
    "ORDER BY",
    "LIMIT",
    "COUNT",
    "SUM",
    "AVG",
    "ROUND",
    "CASE WHEN",
    "WITH",
    "CTE",
    "NULL",
    "DISTINCT",
)


@lru_cache
def load_sql_help_questions() -> list[dict[str, Any]]:
    with QUESTIONS_FILE.open(encoding="utf-8") as file:
        data = json.load(file)
    return data["questions"]


def get_sql_help_question(scenario: dict[str, Any], exclude_question_ids: set[str] | None = None) -> dict[str, Any]:
    excluded_ids = exclude_question_ids or set()
    questions = _questions_for_scenario(scenario)
    available_questions = [
        question for question in questions
        if question["id"] not in excluded_ids
    ]

    if not available_questions:
        available_questions = [
            question for question in _level_questions_for_scenario(scenario)
            if question["id"] not in excluded_ids
        ]

    if not available_questions:
        available_questions = [
            question for question in load_sql_help_questions()
            if question["id"] not in excluded_ids
        ]

    available_questions = available_questions or questions
    question = random.choice(available_questions)
    return {
        "id": question["id"],
        "question": question["question"],
        "options": question["options"],
    }


def check_sql_help_answer(question_id: str, option_id: str) -> tuple[bool, str]:
    for question in load_sql_help_questions():
        if question["id"] == question_id:
            return option_id == question["correct_option_id"], question["explanation"]
    return False, "A pergunta não foi encontrada. Peça ajuda novamente."


def _questions_for_scenario(scenario: dict[str, Any]) -> list[dict[str, Any]]:
    base_questions = _level_questions_for_scenario(scenario)
    expected_sql = scenario.get("expected_sql", "").upper()
    feature_terms = [term for term in FEATURE_TERMS if term in expected_sql]
    scored_questions = [
        (question, _question_score(question, feature_terms))
        for question in base_questions
    ]
    matched_questions = [question for question, score in scored_questions if score > 0]
    return matched_questions or base_questions


def _level_questions_for_scenario(scenario: dict[str, Any]) -> list[dict[str, Any]]:
    level = scenario.get("difficulty")
    return [question for question in load_sql_help_questions() if question["level"] == level] or load_sql_help_questions()


def _question_score(question: dict[str, Any], feature_terms: list[str]) -> int:
    searchable = " ".join(
        [
            question["question"],
            question["explanation"],
            " ".join(option["label"] for option in question["options"]),
        ]
    ).upper()
    return sum(1 for term in feature_terms if term in searchable)
