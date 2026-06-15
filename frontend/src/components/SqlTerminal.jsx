import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { Play, Plus, Terminal } from "lucide-react";
import { motion } from "motion/react";
import SchemaViewer from "./SchemaViewer";

export const terminalTheme = EditorView.theme({
  "&": {
    minHeight: "230px",
    backgroundColor: "#07111d",
    color: "#e9f7f5",
    fontSize: "15px",
  },
  ".cm-editor": {
    backgroundColor: "#07111d",
    color: "#e9f7f5",
  },
  ".cm-scroller": {
    backgroundColor: "#07111d",
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
  ".cm-content": {
    padding: "16px 0",
    backgroundColor: "#07111d",
    color: "#e9f7f5",
  },
  ".cm-line": {
    color: "#e9f7f5",
  },
  ".cm-gutters": {
    backgroundColor: "#07111d",
    color: "#5f7f88",
    borderRight: "1px solid rgba(94, 234, 212, 0.14)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(94, 234, 212, 0.08)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(94, 234, 212, 0.08)",
  },
  ".cm-cursor": {
    borderLeftColor: "#5eead4",
  },
  ".cm-content ::selection, .cm-line ::selection, .cm-editor ::selection": {
    backgroundColor: "#facc15 !important",
    color: "#ffffff !important",
  },
});

export default function SqlTerminal({
  schema,
  value,
  onChange,
  onPreview,
  loading,
  status,
  errorMessage,
  hasResult,
  onRequestAssist,
  assistDisabled,
}) {
  const extensions = useMemo(() => [sql(), terminalTheme], []);
  const basicSetup = useMemo(
    () => ({
      drawSelection: false,
      foldGutter: false,
      highlightActiveLine: true,
      highlightActiveLineGutter: true,
    }),
    [],
  );

  return (
    <motion.section
      className={`panel terminal-panel sql-terminal${loading ? " is-running" : ""}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, delay: 0.015 }}
    >
      <div className="terminal-header">
        <div className="panel-title">
          <Terminal size={19} />
          <h3>Terminal SQL</h3>
        </div>

        <TerminalStatusIndicator status={status} errorMessage={errorMessage} hasResult={hasResult} />
      </div>

      <SchemaViewer schema={schema} compact />

      <div className="codemirror-frame">
        <CodeMirror
          value={value}
          height="230px"
          extensions={extensions}
          basicSetup={basicSetup}
          onChange={onChange}
          placeholder="SELECT ..."
          theme="dark"
        />
      </div>

      <div className="terminal-actions">
        <button className="primary-button execute-button" type="button" onClick={onPreview} disabled={loading || !value.trim()}>
          <Play size={18} />
          {loading ? "Executando query..." : "Executar query"}
        </button>

        <button className="help-button assist-button" type="button" onClick={onRequestAssist} disabled={assistDisabled}>
          <Plus size={18} />
          +1
        </button>
      </div>
    </motion.section>
  );
}

function TerminalStatusIndicator({ status, errorMessage, hasResult }) {
  const isError = status === "error";
  const label = getStatusLabel(status, hasResult);

  return (
    <div className="terminal-status-wrapper">
      <button
        type="button"
        className={`terminal-status-dot ${status}`}
        aria-label={isError ? `Erro no console SQL: ${errorMessage}` : label}
        aria-describedby={isError ? "terminal-status-tooltip" : undefined}
      >
        <span className="sr-only">{label}</span>
      </button>

      {isError ? (
        <div className="terminal-status-tooltip" id="terminal-status-tooltip" role="tooltip">
          <strong>Console SQL</strong>
          <span>{errorMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

function getStatusLabel(status, hasResult) {
  if (status === "success") {
    return "Query aceita, executada e com resultado disponível na tabela abaixo.";
  }

  if (status === "error") {
    return "Query retornou erro.";
  }

  return hasResult ? "Atualizando execução da query." : "Aguardando execução da query.";
}
