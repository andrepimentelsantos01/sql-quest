import { memo } from "react";
import { CalendarRange, Database, Table2 } from "lucide-react";

function SchemaViewer({ schema, compact = false }) {
  const tables = schema?.tables ?? schema ?? {};
  const analysisPeriod = schema?.analysis_period;
  const periodItems = getPeriodItems(analysisPeriod);

  return (
    <section className={`schema-panel${compact ? " compact" : ""}`} aria-labelledby="schema-title">
      <div className="schema-header">
        <div className="schema-heading">
          <Database className="schema-title-icon" size={18} />
          <h3 id="schema-title">Esquema disponível</h3>
        </div>
      </div>

      {periodItems.length ? (
        <div className="period-context-card" aria-label={analysisPeriod?.title ?? "Janela solicitada"}>
          <div className="period-context-header">
            <CalendarRange size={15} />
            <span>{analysisPeriod?.title ?? "Janela solicitada"}</span>
          </div>
          <div className="period-context-list">
            {periodItems.map((item) => (
              <span className="period-context-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="schema-grid">
        {Object.entries(tables).map(([table, columns]) => (
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

function getPeriodItems(analysisPeriod) {
  if (!analysisPeriod) {
    return [];
  }

  return [
    ...(analysisPeriod.ranges ?? []),
    ...(analysisPeriod.cutoffs ?? []),
    ...(analysisPeriod.references ?? []),
  ]
    .map((item) => item.label)
    .filter(Boolean);
}

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
