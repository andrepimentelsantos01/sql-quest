import { useEffect, useRef, useState } from "react";
import { CheckCircle2, HelpCircle, ShieldQuestion, TerminalSquare, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  answerSqlHelpQuestion,
  fetchAssistLine,
  fetchRound,
  fetchSqlHelpQuestion,
  previewQuery,
  submitQuery,
} from "./api/client";
import GameHud from "./components/GameHud";
import GameAmbientEffects from "./components/effects/GameAmbientEffects";
import MissionBriefing from "./components/MissionBriefing";
import MissionReport from "./components/MissionReport";
import ResultModal from "./components/ResultModal";
import SqlTerminal from "./components/SqlTerminal";

const STARTER_QUERY = "SELECT \nFROM \nLIMIT 10;";

export default function App() {
  const terminalSectionRef = useRef(null);
  const [scenario, setScenario] = useState(null);
  const [query, setQuery] = useState(STARTER_QUERY);
  const [previewResult, setPreviewResult] = useState(null);
  const [modalResult, setModalResult] = useState(null);
  const [assistModalOpen, setAssistModalOpen] = useState(false);
  const [giveUpModalOpen, setGiveUpModalOpen] = useState(false);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const [assistLineIndex, setAssistLineIndex] = useState(0);
  const [assisting, setAssisting] = useState(false);
  const [sqlHelpIntroOpen, setSqlHelpIntroOpen] = useState(false);
  const [sqlHelpQuestion, setSqlHelpQuestion] = useState(null);
  const [sqlHelpResult, setSqlHelpResult] = useState(null);
  const [usedSqlHelpResult, setUsedSqlHelpResult] = useState(null);
  const [loadingSqlHelp, setLoadingSqlHelp] = useState(false);
  const [answeringSqlHelp, setAnsweringSqlHelp] = useState(false);
  const [loadingRound, setLoadingRound] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState({ level: 1, xp: 0, streak: 0, lives: 5 });

  async function loadRound() {
    setLoadingRound(true);
    setError("");
    setPreviewResult(null);
    setModalResult(null);
    setAssistModalOpen(false);
    setGiveUpModalOpen(false);
    setTaskAccepted(false);
    setAssistLineIndex(0);
    setSqlHelpIntroOpen(false);
    setSqlHelpQuestion(null);
    setSqlHelpResult(null);
    setUsedSqlHelpResult(null);
    setQuery(STARTER_QUERY);
    try {
      const nextScenario = await fetchRound();
      setScenario(nextScenario);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRound(false);
    }
  }

  async function handlePreview() {
    if (!scenario || !query.trim()) {
      return;
    }

    setPreviewing(true);
    setError("");
    try {
      const response = await previewQuery(scenario.id, query);
      setPreviewResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit() {
    if (!scenario || !query.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await submitQuery(scenario.id, query);
      setPreviewResult(response.user_result);
      setModalResult(response);
      setPlayer((current) => updatePlayer(current, response.correct));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmAssist() {
    if (!scenario || player.lives <= 0) {
      setAssistModalOpen(false);
      return;
    }

    setAssisting(true);
    setError("");
    try {
      const currentLineIndex = getNextAssistLineIndex(query, assistLineIndex);
      const response = await fetchAssistLine(scenario.id, currentLineIndex);
      if (response.line) {
        setQuery((current) => insertAssistLine(current, response.line, currentLineIndex));
        setAssistLineIndex(response.next_index);
        setPlayer((current) => ({
          ...current,
          lives: Math.max(0, current.lives - 1),
        }));
      } else {
        setError("Todas as linhas da resposta adequada já foram preenchidas.");
      }
      setAssistModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssisting(false);
    }
  }

  function handleRequestSqlHelp() {
    if (scenario && usedSqlHelpResult?.scenarioId === scenario.id) {
      setSqlHelpQuestion(null);
      setSqlHelpResult(usedSqlHelpResult);
      return;
    }

    setSqlHelpIntroOpen(true);
  }

  async function handleContinueSqlHelp() {
    if (!scenario) {
      return;
    }

    setLoadingSqlHelp(true);
    setError("");
    try {
      const question = await fetchSqlHelpQuestion(scenario.id);
      setSqlHelpQuestion(question);
      setSqlHelpResult(null);
      setSqlHelpIntroOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSqlHelp(false);
    }
  }

  async function handleAnswerSqlHelp(optionId) {
    if (!scenario || !sqlHelpQuestion) {
      return;
    }

    setAnsweringSqlHelp(true);
    setError("");
    try {
      const result = await answerSqlHelpQuestion(scenario.id, sqlHelpQuestion.id, optionId);
      const resultWithScenario = { ...result, scenarioId: scenario.id };
      setSqlHelpResult(resultWithScenario);
      setUsedSqlHelpResult(resultWithScenario);
      if (!result.correct) {
        setPlayer((current) => ({
          ...current,
          lives: Math.max(0, current.lives - 1),
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnsweringSqlHelp(false);
    }
  }

  function handleAcceptTask() {
    setTaskAccepted(true);
  }

  async function handleConfirmGiveUpTask() {
    setPlayer((current) => ({
      ...current,
      streak: 0,
      lives: Math.max(0, current.lives - 1),
    }));
    await loadRound();
  }

  useEffect(() => {
    loadRound();
  }, []);

  useEffect(() => {
    if (!taskAccepted) {
      return undefined;
    }

    const scrollTimer = window.setTimeout(() => {
      terminalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);

    return () => window.clearTimeout(scrollTimer);
  }, [taskAccepted, scenario?.id]);

  return (
    <div className="game-root">
      <GameAmbientEffects />
      <main className="app-shell">
      <GameHud
        level={player.level}
        xp={player.xp}
        streak={player.streak}
        lives={player.lives}
      />

      {error ? <div className="error-banner">{error}</div> : null}

      {loadingRound || !scenario ? (
        <section className="loading-panel">Carregando missão...</section>
      ) : (
        <div className="game-grid">
          <div className="main-column">
            <MissionBriefing
              scenario={scenario}
              onAcceptTask={handleAcceptTask}
              onRejectTask={loadRound}
              accepted={taskAccepted}
              loading={loadingRound}
            />
            <AnimatePresence initial={false}>
              {taskAccepted ? (
                <motion.div
                  className="accepted-workspace"
                  key={`${scenario.id}-accepted-workspace`}
                  initial={{ opacity: 0, y: 24, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -12, height: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut" }}
                >
                  <div ref={terminalSectionRef}>
                    <SqlTerminal
                      schema={scenario.schema}
                      value={query}
                      onChange={setQuery}
                      onPreview={handlePreview}
                      loading={previewing}
                      onRequestAssist={() => setAssistModalOpen(true)}
                      assistDisabled={player.lives <= 0 || assisting}
                    />
                  </div>
                  <MissionReport
                    result={previewResult}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    canSubmit={Boolean(query.trim())}
                    onRequestHelp={handleRequestSqlHelp}
                    helpLoading={loadingSqlHelp}
                    taskAccepted={taskAccepted}
                    onGiveUpTask={() => setGiveUpModalOpen(true)}
                    givingUp={loadingRound}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}

      <ResultModal result={modalResult} onClose={() => setModalResult(null)} onNextRound={loadRound} />
      <AssistModal
        open={assistModalOpen}
        loading={assisting}
        lives={player.lives}
        onCancel={() => setAssistModalOpen(false)}
        onConfirm={handleConfirmAssist}
      />
      <GiveUpTaskModal
        open={giveUpModalOpen}
        loading={loadingRound}
        lives={player.lives}
        onCancel={() => setGiveUpModalOpen(false)}
        onConfirm={handleConfirmGiveUpTask}
      />
      <SqlHelpIntroModal
        open={sqlHelpIntroOpen}
        loading={loadingSqlHelp}
        onCancel={() => setSqlHelpIntroOpen(false)}
        onContinue={handleContinueSqlHelp}
      />
      <SqlHelpModal
        question={sqlHelpQuestion}
        result={sqlHelpResult}
        loading={answeringSqlHelp}
        onAnswer={handleAnswerSqlHelp}
        onUseQuery={(nextQuery) => {
          setQuery(formatSqlQuery(nextQuery));
          setSqlHelpQuestion(null);
          setSqlHelpResult(null);
        }}
        onClose={() => {
          setSqlHelpQuestion(null);
          setSqlHelpResult(null);
        }}
      />
      </main>
    </div>
  );
}

function GiveUpTaskModal({ open, loading, lives, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal assist-modal" role="dialog" aria-modal="true" aria-labelledby="give-up-task-title">
        <h3 id="give-up-task-title">Desistir da Task?</h3>
        <p>Você perderá 1 coração e receberá uma nova task.</p>
        <div className="hint">Vidas atuais: {lives}</div>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="danger-help-button" onClick={onConfirm} disabled={loading}>
            {loading ? "Buscando nova task..." : "Aceitar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssistModal({ open, loading, lives, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  const canContinue = lives > 0 && !loading;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal assist-modal" role="dialog" aria-modal="true" aria-labelledby="assist-title">
        <h3 id="assist-title">Usar +1?</h3>
        <p>Uma linha da resposta adequada será preenchida no terminal. Essa ajuda consome 1 vida.</p>
        <div className="hint">Vidas atuais: {lives}</div>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={!canContinue}>
            {loading ? "Preenchendo..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function insertAssistLine(currentQuery, line, lineIndex) {
  if (lineIndex === 0) {
    return line;
  }

  return `${currentQuery.trimEnd()}\n${line}`;
}

function getNextAssistLineIndex(currentQuery, storedLineIndex) {
  const usefulLines = getUsefulQueryLines(currentQuery);
  const starterLines = getUsefulQueryLines(STARTER_QUERY);
  const userLines = usefulLines.filter((line) => !starterLines.includes(line));
  return Math.max(storedLineIndex, userLines.length);
}

function getUsefulQueryLines(query) {
  return query
    .split("\n")
    .map(normalizeQueryLine)
    .filter((line) => line && !["SELECT", "FROM", "LIMIT 10"].includes(line));
}

function normalizeQueryLine(line) {
  return line.trim().replace(/;$/, "").replace(/\s+/g, " ").toUpperCase();
}

function formatSqlQuery(query) {
  const breakKeywords = ["FROM", "JOIN", "WHERE", "GROUP BY", "ORDER BY", "LIMIT"];
  const indentedKeywords = ["JOIN", "WHERE", "GROUP BY", "ORDER BY", "LIMIT"];
  const conditions = ["AND", "OR"];
  let formatted = query.trim().replace(/\s+/g, " ").replace(/;$/, "");

  for (const keyword of breakKeywords) {
    formatted = formatted.replace(new RegExp(`\\s+(${keyword})\\b`, "gi"), "\n$1");
  }

  for (const condition of conditions) {
    formatted = formatted.replace(new RegExp(`\\s+(${condition})\\b`, "gi"), "\n  $1");
  }

  return `${formatted
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      return indentedKeywords.some((keyword) => trimmed.toUpperCase().startsWith(keyword)) ? `  ${trimmed}` : trimmed;
    })
    .join("\n")};`;
}

function SqlHelpIntroModal({ open, loading, onCancel, onContinue }) {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
      <motion.div
        className="modal sql-help-modal sql-help-rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-help-rules-title"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="help-modal-header">
          <span className="help-modal-icon" aria-hidden="true">
            <ShieldQuestion size={18} />
          </span>
          <h3 id="sql-help-rules-title">Regras do Pedir Ajuda</h3>
        </div>
        <p>Você responderá uma pergunta de fundamento SQL com 5 alternativas parecidas.</p>
        <div className="help-rules">
          <span>Se acertar, recebe a query certa sem perder coração.</span>
          <span>Se errar, recebe a query certa e perde 1 coração.</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
            Cancelar Ajuda
          </button>
          <button type="button" className="primary-button" onClick={onContinue} disabled={loading}>
            {loading ? "Carregando..." : "Seguir"}
          </button>
        </div>
      </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SqlHelpModal({ question, result, loading, onAnswer, onUseQuery, onClose }) {
  if (!question && !result) {
    return null;
  }

  return (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal sql-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-help-title"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {result ? (
          <>
            <motion.div
              className={result.correct ? "quiz-result-badge correct" : "quiz-result-badge wrong"}
              initial={{ opacity: 0, scale: 0.86, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 420, damping: 22 }}
            >
              {result.correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {result.correct ? "Resposta certa" : "Resposta incorreta"}
            </motion.div>
            <h3 id="sql-help-title">{result.correct ? "Muito bem" : "Quase lá"}</h3>
            <div className="help-result-explanation">
              <p>{result.explanation}</p>
            </div>
            <motion.div
              className="help-query-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.22 }}
            >
              <div className="help-query-header">
                <TerminalSquare size={15} />
                <span>Query liberada</span>
              </div>
              <pre className="help-query-block">{formatSqlQuery(result.query)}</pre>
            </motion.div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={onClose}>
                Fechar
              </button>
              <button type="button" className="primary-button" onClick={() => onUseQuery(result.query)}>
                Preencher terminal
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="help-modal-header">
              <span className="help-modal-icon" aria-hidden="true">
                <HelpCircle size={18} />
              </span>
              <h3 id="sql-help-title">Pedir Ajuda</h3>
            </div>
            <div className="help-question-panel">
              <p>{question.question}</p>
            </div>
            <div className="option-list quiz-option-list">
              {question.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  type="button"
                  className="option-button"
                  onClick={() => onAnswer(option.id)}
                  disabled={loading}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.18 }}
                  whileHover={loading ? undefined : { y: -1 }}
                  whileTap={loading ? undefined : { scale: 0.985 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function updatePlayer(current, correct) {
  if (!correct) {
    return {
      ...current,
      streak: 0,
      lives: Math.max(0, current.lives - 1),
    };
  }

  const nextXp = current.xp + 25;
  return {
    level: nextXp >= 100 ? current.level + 1 : current.level,
    xp: nextXp >= 100 ? nextXp - 100 : nextXp,
    streak: current.streak + 1,
    lives: Math.min(5, current.lives + 1),
  };
}
