from pydantic import BaseModel, Field


class QuerySubmission(BaseModel):
    query: str = Field(min_length=1, max_length=5000)


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[object]]


class RoundResult(BaseModel):
    correct: bool
    message: str
    user_result: QueryResult | None = None
    hint: str | None = None
    expected_query: str | None = None


class AssistLineResult(BaseModel):
    line: str | None = None
    next_index: int
    completed: bool = False


class SqlHelpOption(BaseModel):
    id: str
    label: str


class SqlHelpQuestion(BaseModel):
    id: str
    question: str
    options: list[SqlHelpOption]


class SqlHelpAnswerSubmission(BaseModel):
    question_id: str
    option_id: str


class SqlHelpAnswerResult(BaseModel):
    correct: bool
    explanation: str
    query: str
