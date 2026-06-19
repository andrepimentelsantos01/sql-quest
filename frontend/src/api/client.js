const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/_backend";

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

export function fetchRound(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty);
  }
  if (filters.previousScenarioId) {
    params.set("previous_scenario_id", filters.previousScenarioId);
  }
  const query = params.toString();
  return request(`/api/round${query ? `?${query}` : ""}`);
}

export function fetchRoundOptions() {
  return request("/api/round/options");
}

export function fetchCareerIntro() {
  return request("/api/career/intro");
}

export function fetchCareerArcIntro(arcIndex) {
  return request(`/api/career/intro/${arcIndex}`);
}

export function fetchCareerRound(step) {
  return request(`/api/career/round/${step}`);
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

export function fetchSqlHelpQuestion(scenarioId, excludeQuestionIds = []) {
  const excludedIds = Array.isArray(excludeQuestionIds) ? excludeQuestionIds : [excludeQuestionIds];
  const query = excludedIds.length ? `?exclude_question_ids=${encodeURIComponent(excludedIds.join(","))}` : "";
  return request(`/api/round/${scenarioId}/sql-help${query}`);
}

export function answerSqlHelpQuestion(scenarioId, questionId, optionId) {
  return request(`/api/round/${scenarioId}/sql-help`, {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, option_id: optionId }),
  });
}
