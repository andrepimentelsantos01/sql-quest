export const CAREER_STORAGE_KEY = "sql-quest:career:v1";

export function readCareerProgress(storage) {
  try {
    const saved = JSON.parse(storage.getItem(CAREER_STORAGE_KEY));
    if (!saved || saved.version !== 1 || !Number.isInteger(saved.step) || saved.step < 0
      || typeof saved.scenarioId !== "string" || typeof saved.query !== "string"
      || !saved.player || ![saved.player.lives, saved.player.streak, saved.player.solvedTasks]
        .every((value) => Number.isInteger(value) && value >= 0)
      || saved.player.lives > 5) return null;
    return saved;
  } catch {
    return null;
  }
}

export function careerCheckpoint(career) {
  const step = career.step - career.arc_step;
  return { step, player: { lives: 5, streak: 0, solvedTasks: step } };
}
