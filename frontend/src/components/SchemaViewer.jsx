import { memo } from "react";
import { Database, Table2 } from "lucide-react";

function SchemaViewer({ schema, compact = false }) {
  return (
    <section className={`schema-panel${compact ? " compact" : ""}`} aria-labelledby="schema-title">
      <div className="schema-header">
        <div className="schema-heading">
          <Database className="schema-title-icon" size={18} />
          <h3 id="schema-title">Esquema disponível</h3>
        </div>
      </div>

      <div className="schema-grid">
        {Object.entries(schema).map(([table, columns]) => (
          <div className="table-card" key={table}>
            <div className="table-card-header">
              <span className="table-name">
                <Table2 size={15} />
                {table}
              </span>
            </div>

            <div className="column-chips">
              {columns.map((column) => (
                <span className={getColumnClassName(column)} key={column}>
                  {column}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(SchemaViewer);

function getColumnClassName(column) {
  if (column === "id") {
    return "column-chip primary-key";
  }

  if (column.endsWith("_id")) {
    return "column-chip foreign-key";
  }

  if (column.includes("data")) {
    return "column-chip date-column";
  }

  return "column-chip";
}
