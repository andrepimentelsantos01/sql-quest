import { CheckCircle2, CheckCircle, Target, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function MissionBriefing({ scenario, onAcceptTask, onRejectTask, accepted, loading }) {
  return (
    <motion.section
      className="panel mission-briefing"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      key={scenario.id}
    >
      <div className="mission-title-row">
        <h2 className="mission-title">{scenario.title}</h2>
        <div className="scenario-meta" aria-label="Categoria e dificuldade">
          <span>{scenario.category}</span>
          <span>{scenario.difficulty}</span>
        </div>
      </div>
      <p>{scenario.story}</p>
      <ObjectivePanel objective={scenario.objective} />
      <AnimatePresence mode="wait">
        {!accepted ? (
          <motion.div
            className="task-decision-actions"
            aria-label="Decisão da task"
            key="pending-task-actions"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            <button type="button" className="accept-task-button" onClick={onAcceptTask}>
              <CheckCircle size={18} />
              Aceitar Task
            </button>
            <button type="button" className="reject-task-button" onClick={onRejectTask} disabled={loading}>
              <XCircle size={18} />
              {loading ? "Buscando task..." : "Recusar Task"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function ObjectivePanel({ objective }) {
  const steps = getObjectiveSteps(objective);

  return (
    <section className="objective" aria-labelledby="objective-title">
      <div className="objective-header">
        <span className="title-icon mission-title-icon" aria-hidden="true">
          <Target size={18} />
        </span>
        <div>
          <strong id="objective-title">Missão principal</strong>
        </div>
      </div>

      <ul className="objective-list">
        {steps.map((step) => (
          <li key={step}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getObjectiveSteps(objective) {
  const steps = objective
    .replace(/\.$/, "")
    .split(",")
    .map((step) => step.trim())
    .filter(Boolean);

  return steps.length ? steps : [objective];
}
