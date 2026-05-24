import { CheckCircle2, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function ResultModal({ result, onClose, onNextRound }) {
  return (
    <AnimatePresence>
      {result ? (
        <motion.div
          className="modal-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={result.correct ? "modal success-modal" : "modal error-modal"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.1 }}
          >
            <ResultContent result={result} onClose={onClose} onNextRound={onNextRound} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ResultContent({ result, onClose, onNextRound }) {
  const Icon = result.correct ? CheckCircle2 : XCircle;

  return (
    <>
      <div className={result.correct ? "result-icon success" : "result-icon error"}>
        <Icon size={30} />
      </div>
      <h3 id="result-title">{result.correct ? "Missão concluída" : "Quase lá"}</h3>
      <p>{result.message}</p>
      {result.hint ? <div className="hint">{result.hint}</div> : null}
      <div className="modal-actions">
        <button type="button" className="ghost-button" onClick={onClose}>
          Ver resultado
        </button>
        {result.correct ? (
          <button type="button" className="primary-button" onClick={onNextRound}>
            Próxima missão
          </button>
        ) : null}
      </div>
    </>
  );
}
