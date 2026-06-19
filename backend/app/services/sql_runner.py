import re
import shutil
import sqlite3
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from pathlib import Path

from app.schemas import QueryResult

MAX_ROWS = 100
QUERY_TIMEOUT_SECONDS = 2

BLOCKED_WORDS = {
    "alter",
    "attach",
    "create",
    "delete",
    "detach",
    "drop",
    "insert",
    "pragma",
    "replace",
    "update",
    "vacuum",
}

DENIED_ACTIONS = {
    sqlite3.SQLITE_ALTER_TABLE,
    sqlite3.SQLITE_ATTACH,
    sqlite3.SQLITE_CREATE_INDEX,
    sqlite3.SQLITE_CREATE_TABLE,
    sqlite3.SQLITE_CREATE_TEMP_INDEX,
    sqlite3.SQLITE_CREATE_TEMP_TABLE,
    sqlite3.SQLITE_CREATE_TEMP_TRIGGER,
    sqlite3.SQLITE_CREATE_TEMP_VIEW,
    sqlite3.SQLITE_CREATE_TRIGGER,
    sqlite3.SQLITE_CREATE_VIEW,
    sqlite3.SQLITE_DELETE,
    sqlite3.SQLITE_DETACH,
    sqlite3.SQLITE_DROP_INDEX,
    sqlite3.SQLITE_DROP_TABLE,
    sqlite3.SQLITE_DROP_TEMP_INDEX,
    sqlite3.SQLITE_DROP_TEMP_TABLE,
    sqlite3.SQLITE_DROP_TEMP_TRIGGER,
    sqlite3.SQLITE_DROP_TEMP_VIEW,
    sqlite3.SQLITE_DROP_TRIGGER,
    sqlite3.SQLITE_DROP_VIEW,
    sqlite3.SQLITE_INSERT,
    sqlite3.SQLITE_PRAGMA,
    sqlite3.SQLITE_TRANSACTION,
    sqlite3.SQLITE_UPDATE,
}

MUTATION_START_PATTERNS = {
    "create_table": re.compile(r"^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[A-Za-z_]", re.IGNORECASE),
    "insert": re.compile(r"^INSERT\s+INTO\s+[A-Za-z_]", re.IGNORECASE),
    "delete": re.compile(r"^DELETE\s+FROM\s+[A-Za-z_]", re.IGNORECASE),
}

MUTATION_ALLOWED_WORDS = {
    "create_table": {"create"},
    "insert": {"insert"},
    "delete": {"delete"},
}

MUTATION_DENIED_WORDS = BLOCKED_WORDS | {"drop", "update"}

MUTATION_DENIED_ACTIONS = DENIED_ACTIONS - {
    sqlite3.SQLITE_CREATE_TABLE,
    sqlite3.SQLITE_INSERT,
    sqlite3.SQLITE_DELETE,
    sqlite3.SQLITE_TRANSACTION,
    sqlite3.SQLITE_UPDATE,
}


class QueryRejectedError(ValueError):
    pass


def ensure_read_query(query: str) -> None:
    stripped = query.strip()
    lowered = stripped.lower()
    if not lowered.startswith(("select", "with")):
        raise QueryRejectedError("Use apenas consultas SELECT ou WITH.")
    if ";" in stripped.rstrip(";"):
        raise QueryRejectedError("Envie apenas uma consulta por vez.")

    tokens = set(re.findall(r"\b[a-z_]+\b", lowered))
    blocked = sorted(tokens & BLOCKED_WORDS)
    if blocked:
        raise QueryRejectedError(f"Comando bloqueado: {blocked[0].upper()}.")


def ensure_mutation_query(query: str, allowed_statement: str) -> None:
    stripped = query.strip()
    pattern = MUTATION_START_PATTERNS.get(allowed_statement)
    if not pattern:
        raise QueryRejectedError("Tipo de comando mutavel invalido.")
    if not pattern.search(stripped):
        expected = {
            "create_table": "CREATE TABLE",
            "insert": "INSERT INTO",
            "delete": "DELETE FROM",
        }[allowed_statement]
        raise QueryRejectedError(f"Use apenas comandos {expected} nesta task.")
    if ";" in stripped.rstrip(";"):
        raise QueryRejectedError("Envie apenas uma instrucao por vez.")

    lowered = stripped.lower()
    tokens = set(re.findall(r"\b[a-z_]+\b", lowered))
    denied = sorted(tokens & (MUTATION_DENIED_WORDS - MUTATION_ALLOWED_WORDS[allowed_statement]))
    if denied:
        raise QueryRejectedError(f"Comando bloqueado: {denied[0].upper()}.")


def _authorizer(action: int, *_args: object) -> int:
    if action in DENIED_ACTIONS:
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


def _mutation_authorizer(action: int, *_args: object) -> int:
    if action in MUTATION_DENIED_ACTIONS:
        return sqlite3.SQLITE_DENY
    return sqlite3.SQLITE_OK


def _execute_select(database_path: Path, query: str, readonly: bool = True) -> QueryResult:
    if readonly:
        ensure_read_query(query)
        connection = sqlite3.connect(f"file:{database_path}?mode=ro", uri=True, check_same_thread=False)
        connection.set_authorizer(_authorizer)
    else:
        connection = sqlite3.connect(database_path, check_same_thread=False)
    deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
    connection.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 1000)
    try:
        cursor = connection.execute(query)
        columns = [description[0] for description in cursor.description or []]
        rows = cursor.fetchmany(MAX_ROWS + 1)
        if len(rows) > MAX_ROWS:
            raise QueryRejectedError(f"A consulta retornou mais de {MAX_ROWS} linhas. Refine o resultado.")
        return QueryResult(columns=columns, rows=[list(row) for row in rows])
    finally:
        connection.close()


def _execute_mutation(database_path: Path, query: str, allowed_statement: str) -> None:
    ensure_mutation_query(query, allowed_statement)
    connection = sqlite3.connect(database_path, check_same_thread=False)
    connection.set_authorizer(_mutation_authorizer)
    deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
    connection.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 1000)
    try:
        connection.execute(query)
        connection.commit()
    finally:
        connection.close()


def _copy_to_temp_database(database_path: Path) -> Path:
    temp_file = tempfile.NamedTemporaryFile(prefix="sqlquest_", suffix=".db", delete=False)
    temp_path = Path(temp_file.name)
    temp_file.close()
    shutil.copy2(database_path, temp_path)
    return temp_path


def run_select_query(database_path: Path, query: str) -> QueryResult:
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_execute_select, database_path, query)
    try:
        return future.result(timeout=QUERY_TIMEOUT_SECONDS + 0.2)
    except TimeoutError as exc:
        raise QueryRejectedError("A consulta demorou demais. Tente simplificar sua SQL.") from exc
    except sqlite3.Error as exc:
        raise QueryRejectedError(f"SQLite respondeu: {exc}") from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def run_mutation_preview(
    database_path: Path,
    query: str,
    allowed_statement: str,
    validation_query: str,
) -> QueryResult:
    temp_path = _copy_to_temp_database(database_path)
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_run_mutation_preview, temp_path, query, allowed_statement, validation_query)
    try:
        return future.result(timeout=QUERY_TIMEOUT_SECONDS + 0.2)
    except TimeoutError as exc:
        raise QueryRejectedError("A consulta demorou demais. Tente simplificar sua SQL.") from exc
    except sqlite3.Error as exc:
        raise QueryRejectedError(f"SQLite respondeu: {exc}") from exc
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
        temp_path.unlink(missing_ok=True)


def _run_mutation_preview(
    database_path: Path,
    query: str,
    allowed_statement: str,
    validation_query: str,
) -> QueryResult:
    _execute_mutation(database_path, query, allowed_statement)
    return _execute_select(database_path, validation_query, readonly=False)
