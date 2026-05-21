import { Activity, HelpCircle, Send, XCircle } from "lucide-react";
import { motion } from "motion/react";

export default function MissionReport({
  result,
  onSubmit,
  submitting,
  canSubmit,
  onRequestHelp,
  helpLoading,
  taskAccepted,
  onGiveUpTask,
  givingUp,
}) {
  return (
    <motion.section
      className={`panel result-panel${result ? "" : " empty"}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.04 }}
    >
      <div className="mission-report-header">
        <div className="panel-title">
          <Activity size={19} />
          <h3>Relatório da missão</h3>
        </div>

        <div className="report-actions">
          <button className="danger-help-button" type="button" onClick={onRequestHelp} disabled={helpLoading}>
            <HelpCircle size={15} />
            {helpLoading ? "..." : "Pedir Ajuda"}
          </button>
        </div>
      </div>

      {result ? <ResultTable result={result} /> : <p>A pré-visualização da consulta aparece aqui depois da execução.</p>}

      <div className="report-footer-actions">
        {taskAccepted ? (
          <button type="button" className="give-up-task-button" onClick={onGiveUpTask} disabled={givingUp}>
            <XCircle size={18} />
            Desistir da Task
          </button>
        ) : null}

        <button
          className="primary-button submit-task-button"
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
        >
          <Send size={17} />
          {submitting ? "Entregando..." : "Entregar a task"}
        </button>
      </div>
    </motion.section>
  );
}

function ResultTable({ result }) {
  const { columns, rows } = result;

  if (!rows.length) {
    return <p>A consulta executou corretamente, mas não retornou linhas.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join("-")}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cellIndex}-${cell}`}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
