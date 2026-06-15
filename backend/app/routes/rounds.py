from fastapi import APIRouter, HTTPException

from app.schemas import (
    AssistLineResult,
    QueryResult,
    QuerySubmission,
    RoundResult,
    SqlHelpAnswerResult,
    SqlHelpAnswerSubmission,
    SqlHelpQuestion,
)
from app.services.scenario_service import (
    get_categories,
    get_career_intro,
    get_career_arc_intro,
    get_career_round,
    get_database_path,
    get_expected_answer_lines,
    get_public_scenario,
    get_random_scenario,
    get_round_options,
    get_scenario,
    get_scenario_schema,
)
from app.services.validator import validate_submission
from app.services.sql_runner import QueryRejectedError, run_select_query
from app.services.sql_help import check_sql_help_answer, get_sql_help_question

router = APIRouter()


@router.get("/categories")
def categories() -> list[str]:
    return get_categories()


@router.get("/round/options")
def round_options() -> dict:
    return get_round_options()


@router.get("/round")
def round_data(category: str | None = None, difficulty: str | None = None) -> dict:
    try:
        return get_public_scenario(get_random_scenario(category=category, difficulty=difficulty))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/career/intro")
def career_intro() -> dict[str, str]:
    return get_career_intro()


@router.get("/career/intro/{arc_index}")
def career_arc_intro(arc_index: int) -> dict[str, str]:
    try:
        return get_career_arc_intro(arc_index)
    except IndexError as exc:
        raise HTTPException(status_code=404, detail="Arco de carreira não encontrado.") from exc


@router.get("/career/round/{step}")
def career_round(step: int) -> dict:
    try:
        return get_career_round(step)
    except IndexError as exc:
        raise HTTPException(status_code=404, detail="Etapa de carreira não encontrada.") from exc


@router.get("/scenarios/{scenario_id}/schema")
def scenario_schema(scenario_id: str) -> dict:
    try:
        scenario = get_scenario(scenario_id)
        return get_scenario_schema(scenario)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc


@router.get("/round/{scenario_id}/assist-line/{line_index}", response_model=AssistLineResult)
def assist_line(scenario_id: str, line_index: int) -> AssistLineResult:
    try:
        scenario = get_scenario(scenario_id)
        lines = get_expected_answer_lines(scenario)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc

    if line_index < 0:
        raise HTTPException(status_code=400, detail="Linha de ajuda inválida.")

    if line_index >= len(lines):
        return AssistLineResult(line=None, next_index=line_index, completed=True)

    return AssistLineResult(line=lines[line_index], next_index=line_index + 1, completed=line_index + 1 >= len(lines))


@router.get("/round/{scenario_id}/sql-help", response_model=SqlHelpQuestion)
def sql_help_question(scenario_id: str, exclude_question_ids: str | None = None) -> SqlHelpQuestion:
    try:
        scenario = get_scenario(scenario_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc

    excluded_ids = {
        question_id.strip()
        for question_id in (exclude_question_ids or "").split(",")
        if question_id.strip()
    }
    return SqlHelpQuestion(**get_sql_help_question(scenario, excluded_ids))


@router.post("/round/{scenario_id}/sql-help", response_model=SqlHelpAnswerResult)
def answer_sql_help(scenario_id: str, submission: SqlHelpAnswerSubmission) -> SqlHelpAnswerResult:
    try:
        scenario = get_scenario(scenario_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc

    correct, explanation = check_sql_help_answer(submission.question_id, submission.option_id)
    answer = scenario.get("expected_answer", {})
    return SqlHelpAnswerResult(correct=correct, explanation=explanation, query=answer.get("query") or scenario["expected_sql"])


@router.post("/round/{scenario_id}/submit", response_model=RoundResult)
def submit_round(scenario_id: str, submission: QuerySubmission) -> RoundResult:
    try:
        scenario = get_scenario(scenario_id)
        return validate_submission(scenario, submission.query)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc


@router.post("/round/{scenario_id}/preview", response_model=QueryResult)
def preview_round_query(scenario_id: str, submission: QuerySubmission) -> QueryResult:
    try:
        scenario = get_scenario(scenario_id)
        return run_select_query(get_database_path(scenario), submission.query)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cenário não encontrado.") from exc
    except QueryRejectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
