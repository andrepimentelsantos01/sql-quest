import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  HelpCircle,
  PartyPopper,
  Play,
  RotateCcw,
  ShieldQuestion,
  Shuffle,
  Store,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  answerSqlHelpQuestion,
  fetchCareerArcIntro,
  fetchAssistLine,
  fetchCareerIntro,
  fetchCareerRound,
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
const INITIAL_PLAYER = { streak: 0, solvedTasks: 0, lives: 5 };
const INTRO_STORAGE_KEY = "sql-quest:intro-seen";
const MODE_FREE = "free";
const MODE_CAREER = "career";

export default function App() {
  const terminalSectionRef = useRef(null);
  const [appMode, setAppMode] = useState(null);
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
  const [usedSqlHelpQuestionIds, setUsedSqlHelpQuestionIds] = useState([]);
  const [loadingSqlHelp, setLoadingSqlHelp] = useState(false);
  const [answeringSqlHelp, setAnsweringSqlHelp] = useState(false);
  const [loadingRound, setLoadingRound] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [terminalError, setTerminalError] = useState("");
  const [terminalDirty, setTerminalDirty] = useState(false);
  const [player, setPlayer] = useState(INITIAL_PLAYER);
  const [gameOverStreak, setGameOverStreak] = useState(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [careerIntro, setCareerIntro] = useState(null);
  const [careerIntroOpen, setCareerIntroOpen] = useState(false);
  const [careerStep, setCareerStep] = useState(0);
  const [careerIntroStartStep, setCareerIntroStartStep] = useState(0);
  const [careerCompleteOpen, setCareerCompleteOpen] = useState(false);

  function resetMissionState() {
    setError("");
    setTerminalError("");
    setTerminalDirty(false);
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
  }

  async function loadFreeRound() {
    setLoadingRound(true);
    resetMissionState();
    try {
      const nextScenario = await fetchRound();
      setScenario(nextScenario);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRound(false);
    }
  }

  async function loadCareerRound(step) {
    setLoadingRound(true);
    resetMissionState();
    try {
      const nextScenario = await fetchCareerRound(step);
      setScenario(nextScenario);
      setCareerStep(step);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRound(false);
    }
  }

  async function handleSelectFreeMode() {
    setAppMode(MODE_FREE);
    setPlayer(INITIAL_PLAYER);
    setUsedSqlHelpQuestionIds([]);
    setScenario(null);
    setCareerCompleteOpen(false);
    setIntroOpen(localStorage.getItem(INTRO_STORAGE_KEY) !== "true");
    await loadFreeRound();
  }

  async function handleSelectCareerMode() {
    setAppMode(MODE_CAREER);
    setPlayer(INITIAL_PLAYER);
    setUsedSqlHelpQuestionIds([]);
    setScenario(null);
    setCareerStep(0);
    setCareerIntroStartStep(0);
    setCareerCompleteOpen(false);
    resetMissionState();
    setLoadingRound(true);
    try {
      const intro = await fetchCareerIntro();
      setCareerIntro(intro);
      setCareerIntroOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRound(false);
    }
  }

  async function handleStartCareer() {
    setCareerIntroOpen(false);
    await loadCareerRound(careerIntroStartStep);
  }

  async function handlePreview() {
    if (!scenario || !query.trim()) {
      return;
    }

    setPreviewing(true);
    setError("");
    setTerminalError("");
    setTerminalDirty(false);
    try {
      const response = await previewQuery(scenario.id, query);
      setPreviewResult(response);
    } catch (err) {
      setPreviewResult(null);
      setTerminalError(err.message);
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
    setTerminalError("");
    setTerminalDirty(false);
    try {
      const response = await submitQuery(scenario.id, query);
      const correct = isCorrectResult(response.correct);
      const normalizedResponse = { ...response, correct };
      const gameOver = !correct && player.lives <= 1;
      setPreviewResult(response.user_result);
      setModalResult(gameOver ? null : normalizedResponse);
      if (gameOver) {
        setGameOverStreak(getGameOverStreak(player, appMode));
      }
      setPlayer((current) => updatePlayer(current, correct));
    } catch (err) {
      setTerminalError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery);
    setTerminalError("");
    setTerminalDirty(true);
  }

  async function handleNextRound() {
    setModalResult(null);
    if (appMode === MODE_CAREER) {
      const nextStep = careerStep + 1;
      const career = scenario?.career;
      const total = career?.total ?? 0;
      if (nextStep >= total) {
        restoreLives();
        setCareerCompleteOpen(true);
        return;
      }
      if (career && career.arc_step + 1 >= career.arc_total) {
        restoreLives();
        setCareerCompleteOpen(true);
        return;
      }
      await loadCareerRound(nextStep);
      return;
    }

    await loadFreeRound();
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
          setGameOverStreak(getGameOverStreak(player, appMode));
        }
        setQuery((current) => insertAssistLine(current, response.line, currentLineIndex));
        setTerminalError("");
        setTerminalDirty(true);
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
      const question = await fetchSqlHelpQuestion(scenario.id, usedSqlHelpQuestionIds);
      setUsedSqlHelpQuestionIds((current) => (
        current.includes(question.id) ? current : [...current, question.id]
      ));
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
          setGameOverStreak(getGameOverStreak(player, appMode));
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
      setGameOverStreak(getGameOverStreak(player, appMode));
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

    if (appMode === MODE_CAREER) {
      await loadCareerRound(careerStep);
      return;
    }

    await loadFreeRound();
  }

  async function handleRetryGame() {
    setGameOverStreak(null);
    setPlayer(INITIAL_PLAYER);
    setUsedSqlHelpQuestionIds([]);
    if (appMode === MODE_CAREER) {
      await loadCareerRound(0);
      return;
    }

    await loadFreeRound();
  }

  function handleStartIntro() {
    localStorage.setItem(INTRO_STORAGE_KEY, "true");
    setIntroOpen(false);
  }

  function handleBackToMenu() {
    setAppMode(null);
    setScenario(null);
    setCareerIntroOpen(false);
    setCareerCompleteOpen(false);
    setIntroOpen(false);
    setPlayer(INITIAL_PLAYER);
    setUsedSqlHelpQuestionIds([]);
    resetMissionState();
  }

  function restoreLives() {
    setPlayer((current) => ({
      ...current,
      lives: INITIAL_PLAYER.lives,
    }));
  }

  useEffect(() => {
    if (!taskAccepted) {
      return undefined;
    }

    const scrollTimer = window.setTimeout(() => {
      terminalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);

    return () => window.clearTimeout(scrollTimer);
  }, [taskAccepted, scenario?.id]);

  return (
    <div className="game-root">
      <GameAmbientEffects />
      <main className="app-shell">
        {!appMode ? (
          <ModeMenu onSelectFree={handleSelectFreeMode} onSelectCareer={handleSelectCareerMode} />
        ) : (
          <>
            <GameHud streak={player.streak} lives={player.lives} />
            <ModeBar mode={appMode} scenario={scenario} onBackToMenu={handleBackToMenu} />

            {error ? <div className="error-banner">{error}</div> : null}

            {loadingRound || !scenario ? (
              <section className="loading-panel">
                {appMode === MODE_CAREER && careerIntroOpen ? "Preparando início da carreira..." : "Carregando missão..."}
              </section>
            ) : (
              <div className="game-grid">
                <div className="main-column">
                  <MissionBriefing
                    scenario={scenario}
                    onAcceptTask={handleAcceptTask}
                    onRejectTask={appMode === MODE_FREE ? loadFreeRound : null}
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
                        transition={{ duration: 0.14, ease: "easeOut" }}
                      >
                        <div ref={terminalSectionRef}>
                          <SqlTerminal
                            schema={scenario.schema}
                            value={query}
                            onChange={handleQueryChange}
                            onPreview={handlePreview}
                            loading={previewing || submitting}
                            status={getTerminalStatus(previewing || submitting, terminalError, previewResult, terminalDirty)}
                            errorMessage={terminalError}
                            hasResult={Boolean(previewResult)}
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
                          taskAccepted={taskAccepted && appMode !== MODE_CAREER}
                          onGiveUpTask={() => setGiveUpModalOpen(true)}
                          givingUp={loadingRound}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}

        <ResultModal result={modalResult} onClose={() => setModalResult(null)} onNextRound={handleNextRound} />
        <CareerIntroModal
          intro={careerIntro}
          open={careerIntroOpen}
          isInitialArc={careerIntroStartStep === 0}
          onStart={handleStartCareer}
          onBack={handleBackToMenu}
        />
        <CareerCompleteModal
          open={careerCompleteOpen}
          completion={scenario?.career?.completion}
          hasNextArc={Boolean(scenario?.career && scenario.career.step + 1 < scenario.career.total)}
          onBackToMenu={handleBackToMenu}
          onRestart={() => {
            const currentCareer = scenario?.career;
            const arcStartStep = currentCareer ? currentCareer.step - currentCareer.arc_step : 0;
            setCareerCompleteOpen(false);
            restoreLives();
            loadCareerRound(arcStartStep);
          }}
          onContinue={async () => {
            const nextStep = (scenario?.career?.step ?? careerStep) + 1;
            const nextArc = (scenario?.career?.arc_index ?? 0) + 1;
            setCareerCompleteOpen(false);
            restoreLives();
            setLoadingRound(true);
            try {
              const intro = await fetchCareerArcIntro(nextArc);
              setCareerIntro(intro);
              setCareerIntroStartStep(nextStep);
              setCareerIntroOpen(true);
            } catch (err) {
              setError(err.message);
            } finally {
              setLoadingRound(false);
            }
          }}
        />
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
          mode={appMode}
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
            handleQueryChange(formatSqlQuery(nextQuery));
            setSqlHelpQuestion(null);
            setSqlHelpResult(null);
          }}
          onClose={() => {
            setSqlHelpQuestion(null);
            setSqlHelpResult(null);
          }}
        />
        <IntroModal open={introOpen} onStart={handleStartIntro} />
        <GameOverModal streak={gameOverStreak} mode={appMode} onRetry={handleRetryGame} />
      </main>
    </div>
  );
}

function ModeMenu({ onSelectFree, onSelectCareer }) {
  return (
    <motion.section
      className="mode-menu-panel"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14 }}
    >
      <div className="mode-menu-brand">
        <h1 className="game-logo mode-logo">
          SQL <span>Quest</span>
        </h1>
        <p>Escolha como quer entrar na próxima investigação de dados.</p>
      </div>
      <div className="mode-menu-actions">
        <button type="button" className="mode-card-button" onClick={onSelectFree}>
          <Shuffle size={24} />
          <span>Modo Livre</span>
          <small>Missões aleatórias no formato atual.</small>
        </button>
        <button type="button" className="mode-card-button career" onClick={onSelectCareer}>
          <BriefcaseBusiness size={24} />
          <span>Modo Carreira</span>
          <small>Uma trilha sequencial começando como Analista Júnior.</small>
        </button>
      </div>
    </motion.section>
  );
}

function ModeBar({ mode, scenario, onBackToMenu }) {
  const career = scenario?.career;

  return (
    <div className="mode-status-bar">
      <div>
        <strong>{mode === MODE_CAREER ? "Modo Carreira" : "Modo Livre"}</strong>
        {career ? (
          <span>{career.arc}</span>
        ) : (
          <span>{mode === MODE_CAREER ? "Trilha sequencial" : "Missões aleatórias"}</span>
        )}
      </div>
      <button type="button" className="ghost-button" onClick={onBackToMenu}>
        Voltar ao menu
      </button>
    </div>
  );
}

function CareerIntroModal({ intro, open, isInitialArc, onStart, onBack }) {
  if (!open || !intro) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="modal intro-modal career-intro-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="career-intro-title"
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          <div className="intro-data-animation" aria-hidden="true">
            <span>SELECT</span>
            <span>SUM()</span>
            <span>COUNT()</span>
          </div>
          <div className="intro-heading">
            <span className="intro-icon" aria-hidden="true">
              <Store size={22} />
            </span>
            <h2 id="career-intro-title">{intro.title}</h2>
          </div>
          <div className="career-arc-badge">{intro.arc}</div>
          <div className="intro-copy">
            {intro.story.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar ao menu
            </button>
            <button type="button" className="start-missions-button" onClick={onStart}>
              <Play size={18} />
              {isInitialArc ? "Iniciar modo carreira" : "Continuar trabalhando na padaria"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CareerCompleteModal({ open, completion, hasNextArc, onBackToMenu, onRestart, onContinue }) {
  if (!open) {
    return null;
  }

  const title = completion?.title ?? "Arco concluído";
  const story = completion?.story ?? "Você concluiu mais uma etapa da carreira com SQL e deixou seu Joaquim com menos achismo para defender na próxima reunião.";

  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="modal game-over-modal career-complete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="career-complete-title"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          <div className="result-icon success">
            <PartyPopper size={30} />
          </div>
          <h3 id="career-complete-title">{title}</h3>
          <div className="career-complete-copy">
            {story.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onRestart}>
              Refazer arco
            </button>
            {hasNextArc ? (
              <button type="button" className="primary-button" onClick={onContinue}>
                Seguir trabalhando na padaria...
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={onBackToMenu}>
                Voltar ao menu
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
          transition={{ duration: 0.12, ease: "easeOut" }}
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
            <p>Você é o(a) analista chamado(a) quando a reunião já falhou, o dashboard não convenceu ninguém e alguém precisa encontrar a verdade escondida no banco de dados.</p>
            <p>Hospitais com custos fora do controle, big techs afundadas em incidentes críticos, fábricas perdendo dinheiro com máquinas paradas, clubes e empresas tentando tomar decisões antes que o caos vire prejuízo.</p>
            <p>Cada missão coloca você em um cenário diferente, contratado para resolver problemas sérios com uma única arma: SQL.</p>
            <p>Leia o contexto, entenda o objetivo, investigue o schema disponível e escreva a consulta certa para revelar a resposta, aqui opinião não fecha diagnóstico, achismo não escala sistema e desculpa nenhuma sobrevive a um SELECT bem feito.</p>
            <p>Você é o(a) especialista chamado(a) quando os dados precisam falar.</p>
            <p>Sua missão começa agora!</p>
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

function GameOverModal({ streak, mode, onRetry }) {
  if (streak === null) {
    return null;
  }

  const isCareer = mode === MODE_CAREER;

  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="modal game-over-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
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
            transition={{ duration: 0.22, delay: 0.02 }}
          >
            <PartyPopper size={30} />
          </motion.div>

          <h3 id="game-over-title">{isCareer ? "Fim de carreira... por enquanto" : "Fim de jogo"}</h3>
          {isCareer ? (
            <div className="game-over-copy">
              <p>O cargo de Analista de Dados Júnior na Padaria Pão Nosso de Cada Dia foi encerrado antes do período de experiência.</p>
              <p>Seu Joaquim agradeceu o esforço, ofereceu um pão de queijo de despedida e explicou que a padaria ainda não está pronta para decisões baseadas em “quase acertei a query”.</p>
              <p>Mas nem tudo está perdido. Volte ao Modo Livre, pratique filtros, agregações e ordenações com calma, e quando sentir que suas consultas já conseguem separar opinião de evidência, retorne ao Modo Carreira.</p>
            </div>
          ) : (
            <>
              <p>Parabéns pela rodada. Tasks resolvidas:</p>
              <div className="game-over-streak">{streak}</div>
            </>
          )}

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

function GiveUpTaskModal({ open, loading, lives, mode, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  const text = mode === MODE_CAREER
    ? "Você perderá 1 coração e reiniciará esta etapa da carreira."
    : "Você perderá 1 coração e receberá uma nova task.";

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal assist-modal" role="dialog" aria-modal="true" aria-labelledby="give-up-task-title">
        <h3 id="give-up-task-title">Desistir da Task?</h3>
        <p>{text}</p>
        <div className="hint">Vidas atuais: {lives}</div>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="danger-help-button" onClick={onConfirm} disabled={loading}>
            {loading ? "Carregando..." : "Aceitar"}
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
      <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="modal sql-help-modal sql-help-rules-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sql-help-rules-title"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
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
    <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="modal sql-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-help-title"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        {result ? (
          <>
            <motion.div
              className={result.correct ? "quiz-result-badge correct" : "quiz-result-badge wrong"}
              initial={{ opacity: 0, scale: 0.86, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.03, type: "spring", stiffness: 520, damping: 26 }}
            >
              {result.correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {result.correct ? "Resposta certa" : "Resposta incorreta"}
            </motion.div>
            <h3 id="sql-help-title">{result.correct ? "Muito bem" : "Quase lá"}</h3>
            <div className="help-result-explanation">
              <p>{result.explanation}</p>
            </div>
            <motion.div className="help-query-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03, duration: 0.1 }}>
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
                  transition={{ delay: index * 0.015, duration: 0.09 }}
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
    solvedTasks: current.solvedTasks + 1,
  };
}

function getTerminalStatus(running, errorMessage, result, dirty) {
  if (running) {
    return "running";
  }

  if (dirty) {
    return "running";
  }

  if (errorMessage) {
    return "error";
  }

  if (result) {
    return "success";
  }

  return "running";
}

function getGameOverStreak(player, mode) {
  return mode === MODE_FREE ? player.solvedTasks : player.streak;
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
