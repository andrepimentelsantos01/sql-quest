import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { Play, Plus, Terminal } from "lucide-react";
import { motion } from "motion/react";
import SchemaViewer from "./SchemaViewer";

const terminalTheme = EditorView.theme({
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

export default function SqlTerminal({ schema, value, onChange, onPreview, loading, onRequestAssist, assistDisabled }) {
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
      transition={{ duration: 0.2, delay: 0.03 }}
    >
      <div className="panel-title">
        <Terminal size={19} />
        <h3>Terminal SQL</h3>
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
