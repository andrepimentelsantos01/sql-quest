const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.detail ?? "Não foi possível falar com a API.");
  }

  return response.json();
}

export function fetchRound() {
  return request("/api/round");
}

export function submitQuery(scenarioId, query) {
  return request(`/api/round/${scenarioId}/submit`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function previewQuery(scenarioId, query) {
  return request(`/api/round/${scenarioId}/preview`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function fetchAssistLine(scenarioId, lineIndex) {
  return request(`/api/round/${scenarioId}/assist-line/${lineIndex}`);
}

export function fetchSqlHelpQuestion(scenarioId) {
  return request(`/api/round/${scenarioId}/sql-help`);
}

export function answerSqlHelpQuestion(scenarioId, questionId, optionId) {
  return request(`/api/round/${scenarioId}/sql-help`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, option_id: optionId }),
  });
}
