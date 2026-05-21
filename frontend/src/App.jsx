import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Database, HelpCircle, PartyPopper, Play, RotateCcw, ShieldQuestion, TerminalSquare, XCircle } from "lucide-react";
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
const INITIAL_PLAYER = { streak: 0, lives: 5 };
const INTRO_STORAGE_KEY = "sql-quest:intro-seen";

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
  const [player, setPlayer] = useState(INITIAL_PLAYER);
  const [gameOverStreak, setGameOverStreak] = useState(null);
  const [introOpen, setIntroOpen] = useState(() => localStorage.getItem(INTRO_STORAGE_KEY) !== "true");

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
      const correct = isCorrectResult(response.correct);
      const normalizedResponse = { ...response, correct };
      const gameOver = !correct && player.lives <= 1;
      setPreviewResult(response.user_result);
      setModalResult(gameOver ? null : normalizedResponse);
      if (gameOver) {
        setGameOverStreak(player.streak);
      }
      setPlayer((current) => updatePlayer(current, correct));
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
        if (player.lives <= 1) {
          setGameOverStreak(player.streak);
        }
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
      const correct = isCorrectResult(result.correct);
      const resultWithScenario = { ...result, correct, scenarioId: scenario.id };
      setSqlHelpResult(resultWithScenario);
      setUsedSqlHelpResult(resultWithScenario);
      if (!correct) {
        if (player.lives <= 1) {
          setGameOverStreak(player.streak);
          setSqlHelpQuestion(null);
          setSqlHelpResult(null);
        }
        setPlayer(applyLifePenalty);
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
    const gameOver = player.lives <= 1;
    if (gameOver) {
      setGameOverStreak(player.streak);
      setGiveUpModalOpen(false);
      setPlayer((current) => ({
        ...current,
        streak: 0,
        lives: 0,
      }));
      return;
    }

    setPlayer((current) => ({
      ...current,
      streak: 0,
      lives: Math.max(0, current.lives - 1),
    }));
    await loadRound();
  }

  async function handleRetryGame() {
    setGameOverStreak(null);
    setPlayer(INITIAL_PLAYER);
    await loadRound();
  }

  function handleStartIntro() {
    localStorage.setItem(INTRO_STORAGE_KEY, "true");
    setIntroOpen(false);
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
    }, 90);

    return () => window.clearTimeout(scrollTimer);
  }, [taskAccepted, scenario?.id]);

  return (
    <div className="game-root">
      <GameAmbientEffects />
      <main className="app-shell">
      <GameHud
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
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
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
      <IntroModal open={introOpen} onStart={handleStartIntro} />
      <GameOverModal streak={gameOverStreak} onRetry={handleRetryGame} />
      </main>
    </div>
  );
}

function IntroModal({ open, onStart }) {
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
          className="modal intro-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-title"
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="intro-data-animation" aria-hidden="true">
            <span>SELECT</span>
            <span>JOIN</span>
            <span>COUNT()</span>
          </div>

          <div className="intro-heading">
            <span className="intro-icon" aria-hidden="true">
              <Database size={22} />
            </span>
            <h2 id="intro-title">Bem-vindo ao SQL Quest.</h2>
          </div>

          <div className="intro-copy">
            <p>Você não é apenas um estudante praticando consultas. Você é o analista chamado quando a reunião já falhou, o dashboard não convenceu ninguém e alguém precisa encontrar a verdade escondida no banco de dados.</p>
            <p>Hospitais com custos fora do controle. Big techs afundadas em incidentes críticos. Fábricas perdendo dinheiro com máquinas paradas. Clubes, seleções e empresas tentando tomar decisões antes que o caos vire prejuízo.</p>
            <p>Cada missão coloca você em um cenário diferente, contratado para resolver problemas sérios com uma única arma: SQL.</p>
            <p>Leia o contexto, entenda o objetivo, investigue o schema disponível e escreva a consulta certa para revelar a resposta. Aqui, opinião não fecha diagnóstico, achismo não escala sistema e desculpa nenhuma sobrevive a um SELECT bem feito.</p>
            <p>Você é o especialista chamado quando os dados precisam falar.</p>
            <p>Sua missão começa agora.</p>
          </div>

          <div className="intro-actions">
            <button type="button" className="start-missions-button" onClick={onStart}>
              <Play size={18} />
              Iniciar as tarefas
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function GameOverModal({ streak, onRetry }) {
  if (streak === null) {
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
          className="modal game-over-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="party-burst" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <span key={index} style={{ "--burst-index": `${index}` }} />
            ))}
          </div>

          <motion.div
            className="result-icon success"
            initial={{ rotate: -8, scale: 0.82 }}
            animate={{ rotate: [0, -6, 6, 0], scale: 1 }}
            transition={{ duration: 0.34, delay: 0.05 }}
          >
            <PartyPopper size={30} />
          </motion.div>

          <h3 id="game-over-title">Fim de jogo</h3>
          <p>Parabéns pela rodada. Sua sequência final foi:</p>
          <div className="game-over-streak">{streak}</div>

          <div className="modal-actions">
            <button type="button" className="primary-button" onClick={onRetry}>
              <RotateCcw size={17} />
              Tentar novamente
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
        transition={{ duration: 0.16, ease: "easeOut" }}
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
        transition={{ duration: 0.16, ease: "easeOut" }}
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
              transition={{ delay: 0.08, duration: 0.16 }}
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
                  transition={{ delay: index * 0.025, duration: 0.14 }}
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
      ...applyLifePenalty(current),
      streak: 0,
    };
  }

  return {
    ...current,
    streak: current.streak + 1,
  };
}

function isCorrectResult(value) {
  return value === true;
}

function applyLifePenalty(current) {
  return {
    ...current,
    lives: Math.max(0, current.lives - 1),
  };
}
